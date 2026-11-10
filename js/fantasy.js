// js/fantasy.js — Fantasy Tinellers: tu equipo de 5 en el campo, mercado, guardado y clasificación.
// Con Firebase configurado cada cuenta de Google guarda su equipo en la base de datos
// (fantasy/j4/equipos/{uid}, uno por jornada); sin configurar, modo local para probar.
// Las reglas del juego (precios, presupuesto y puntos) están en js/fantasy-logica.js.
import { firebaseConfig } from './firebase-config.js';
import { JORNADAS, HORAS_CIERRE } from './calendario.js?v=20261103c';
import * as F from './fantasy-logica.js?v=20261110p';

// Correos que pueden activar jornadas en la base de datos (deben coincidir con firestore.rules)
const ADMINS = ['fjimenezsantana1@gmail.com', 'santana282004@gmail.com'];
const HORAS_PARTIDO = 3;

const D = window.TINELLERS || { JUGADORES: [], PARTIDOS: {} };
const PL = F.plantilla(D);
const porId = Object.fromEntries(PL.map(j => [j.id, j]));

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tz = { timeZone: 'Europe/Madrid' };
const fDia = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', ...tz });
const fCorto = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', ...tz });
const fHora = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', ...tz });
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const cuando = d => `${fDia.format(d).replace(',', '')} a las ${fHora.format(d)}`;      // "sábado 21 de noviembre a las 19:00"
const corto = d => cap(fCorto.format(d).replace(/[.,]/g, ''));                        // "Dom 22 nov"
const media = m => (m == null ? 'sin media' : 'media ' + m.toFixed(2).replace('.', ','));

/* ================= Jornadas ================= */
const jornadas = JORNADAS.map(j => {
    const inicio = new Date(j.fecha);
    return { ...j, inicio, cierre: new Date(inicio.getTime() - HORAS_CIERRE * 36e5), fin: new Date(inicio.getTime() + HORAS_PARTIDO * 36e5) };
}).filter(j => !isNaN(j.inicio)).sort((a, b) => a.n - b.n);
const delFantasy = jornadas.filter(j => j.n >= F.PRIMERA_JORNADA);
const abierta = () => delFantasy.find(j => Date.now() < j.cierre.getTime()) || null;
const cerradas = () => delFantasy.filter(j => Date.now() >= j.cierre.getTime());

/* ================= Conexión: Firebase o modo local ================= */
const conFirebase = !!firebaseConfig?.apiKey && !firebaseConfig.apiKey.startsWith('PEGA');
let api;
if (conFirebase) {
    const V = '10.12.2';
    const [{ initializeApp }, A, S] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
    ]);
    const app = initializeApp(firebaseConfig);
    const auth = A.getAuth(app);
    const db = S.getFirestore(app);
    const ref = (n, uid) => S.doc(db, 'fantasy', 'j' + n, 'equipos', uid);
    api = {
        login: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
        logout: () => A.signOut(auth),
        onUser: cb => A.onAuthStateChanged(auth, u => cb(u && { id: u.uid, nombre: u.displayName || 'Sin nombre', avatar: u.photoURL || '', email: u.email || '' })),
        mio: async (n, uid) => { const d = await S.getDoc(ref(n, uid)); return d.exists() ? d.data() : null; },
        guardar: (n, uid, e) => S.setDoc(ref(n, uid), { ...e, actualizada: S.serverTimestamp() }),
        equipos: async n => {
            const q = await S.getDocs(S.collection(db, 'fantasy', 'j' + n, 'equipos'));
            return Object.fromEntries(q.docs.map(d => [d.id, d.data()]));
        },
        // Avisos por correo: el usuario decide si quiere recibirlos (avisos/{uid})
        aviso: async uid => { const d = await S.getDoc(S.doc(db, 'avisos', uid)); return d.exists() ? d.data() : null; },
        guardarAviso: (uid, a) => S.setDoc(S.doc(db, 'avisos', uid), { ...a, actualizado: S.serverTimestamp() }),
        // El administrador deja registrada la hora de cierre de cada jornada (fichas quinielas/jN, de cuando había quiniela);
        // las reglas de Firestore la usan para rechazar cambios fuera de plazo.
        activarJornadas: () => Promise.all(jornadas.map(j => S.setDoc(S.doc(db, 'quinielas', 'j' + j.n), {
            n: j.n, partido: `${j.local} - ${j.visitante}`,
            inicio: S.Timestamp.fromDate(j.inicio), cierre: S.Timestamp.fromDate(j.cierre)
        }, { merge: true })))
    };
} else {
    const UKEY = 'tinellers_fantasy_usuario', KEY = n => 'tinellers_fantasy_j' + n;
    const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
    const escribir = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
    const cierreDe = n => jornadas.find(j => j.n === n)?.cierre.getTime() ?? 0;
    const negar = () => Object.assign(new Error('Fuera de plazo'), { code: 'permission-denied' });
    const subs = [];
    api = {
        local: true,
        loginLocal: nombre => {
            const u = { id: 'local-' + nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-'), nombre, avatar: '' };
            escribir(UKEY, u); subs.forEach(f => f(u));
        },
        logout: async () => { escribir(UKEY, null); subs.forEach(f => f(null)); },
        onUser: cb => { subs.push(cb); cb(leer(UKEY, null)); },
        mio: async (n, uid) => leer(KEY(n), {})[uid] || null,
        guardar: async (n, uid, e) => {
            if (Date.now() >= cierreDe(n)) throw negar();
            const t = leer(KEY(n), {}); t[uid] = { ...e }; escribir(KEY(n), t);
        },
        equipos: async n => leer(KEY(n), {}),
        aviso: async uid => leer('tinellers_fantasy_aviso_' + uid, null),
        guardarAviso: async (uid, a) => escribir('tinellers_fantasy_aviso_' + uid, a)
    };
}

/* ================= Estado ================= */
let usuario = null;
let estado = F.vacio();        // lo que se ve en el campo
let guardado = null;           // equipo guardado (o heredado de una jornada anterior) para la jornada abierta
let guardadoEn = null;         // jornada en la que se guardó
let tocado = false;            // ha cambiado algo en esta visita
let guardando = false;
let activo = null;             // hueco abierto en el selector
let alEntrar = null;           // continúa el guardado cuando termina el inicio de sesión
let version = 0;               // sube con cada guardado: una carga más antigua no pisa lo recién guardado
let jAbierta = null;           // jornada abierta la última vez que se pintó (para notar el cierre)
let aviso = undefined;         // avisos por correo: undefined (cargando), null (sin decidir), true o false

const igual = (e, g) => !!g && e.formacion === g.formacion && e.capitan === g.capitan && e.slots.join() === g.jugadores.join();
const deGuardado = g => {
    const slots = Array.from({ length: F.TAMANO }, (_, i) => g.jugadores?.[i] || null);
    if (F.FORMACIONES[g.formacion]) return { formacion: g.formacion, slots, capitan: g.capitan || null };
    // equipo guardado con una formación antigua: se recoloca en la formación por defecto
    const r = F.cambiarFormacion({ formacion: F.FORMACION_INICIAL, slots }, F.FORMACION_INICIAL, porId);
    return { formacion: F.FORMACION_INICIAL, slots: r.slots, capitan: r.slots.includes(g.capitan) ? g.capitan : null };
};
const posTxt = j => j.posiciones.map(p => F.NOMBRE_POS[p]).join(' / ');

/* ================= Puntos de cada jugador en el fantasy ================= */
const puntuadas = delFantasy.map(j => j.n).filter(n => F.jornadaPuntuada(D, n));
const ultimaPuntuada = puntuadas[puntuadas.length - 1] ?? null;
const totalJugador = id => puntuadas.reduce((s, n) => s + (F.puntosJugador(D, id, n) || 0), 0);

/* ================= Piezas ================= */
const camiseta = dorsal => `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M22 6 L12 10 L2 22 L10 30 L16 25 L16 58 L48 58 L48 25 L54 30 L62 22 L52 10 L42 6 C40 11 36 13 32 13 C28 13 24 11 22 6 Z"/><text x="32" y="47" text-anchor="middle">${esc(dorsal)}</text></svg>`;
const avatar = (url, nombre, cls = 'fz-av') => url
    ? `<img class="${cls}" src="${esc(url)}" alt="" width="40" height="40" referrerpolicy="no-referrer" loading="lazy">`
    : `<span class="${cls}" aria-hidden="true">${esc((nombre || '?').trim().charAt(0).toUpperCase())}</span>`;

function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('is-visible');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-visible'), 2600);
}

/* ================= Campo ================= */
const pitch = $('fz-pitch');
const huecos = Array.from({ length: F.TAMANO }, (_, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fz-slot'; b.dataset.slot = i;
    b.addEventListener('click', () => abrirSelector(i));
    pitch.appendChild(b);
    return b;
});

function pintarCampo() {
    const def = F.FORMACIONES[estado.formacion];
    huecos.forEach((b, i) => {
        const [pos, x, y] = def.huecos[i];
        b.style.left = x + '%';
        b.style.top = y + '%';
        const id = estado.slots[i], j = id ? porId[id] : null;
        const esCap = !!j && id === estado.capitan;
        const clave = j ? `${id}|${esCap}|${pos}` : 'vacio|' + pos;
        if (b.dataset.clave === clave) return;
        const nuevo = !!j && b.dataset.id !== id;
        b.dataset.clave = clave; b.dataset.id = id || '';
        b.classList.toggle('is-empty', !j);
        b.setAttribute('aria-label', j
            ? `${F.NOMBRE_POS[pos]}: ${j.nombre}, ${j.precio} millones${esCap ? ', capitán' : ''}. Cambiar o hacer capitán`
            : `Fichar ${F.NOMBRE_POS[pos].toLowerCase()}`);
        b.innerHTML = j
            ? `<span class="fz-kit${j.portero ? ' is-gk' : ''}${nuevo ? ' is-new' : ''}">${camiseta(j.dorsal)}${esCap ? '<span class="fz-c" aria-hidden="true">C</span>' : ''}</span>
               <span class="fz-plate"><b>${esc(j.corto)}</b><small>${pos} · ${j.precio} M</small></span>`
            : `<span class="fz-add" aria-hidden="true"></span><span class="fz-plate"><b>${F.NOMBRE_POS[pos]}</b></span>`;
    });
    $('fz-forms').innerHTML = Object.entries(F.FORMACIONES).map(([k, f]) =>
        `<button type="button" class="pick-btn" data-f="${k}" aria-pressed="${k === estado.formacion}" title="${esc(f.nombre)}">${k}</button>`).join('');
    $('fz-form-nombre').textContent = def.nombre + ': ' + def.huecos.slice(1).map(h => F.NOMBRE_POS[h[0]].toLowerCase()).join(', ');
}

function pintarPresupuesto() {
    const gasto = F.coste(estado.slots, porId), queda = F.PRESUPUESTO - gasto;
    $('fz-gastado').textContent = gasto;
    $('fz-bar-fill').style.transform = `scaleX(${Math.min(1, gasto / F.PRESUPUESTO)})`;
    $('fz-bar').classList.toggle('is-over', queda < 0);
    $('fz-queda').textContent = queda >= 0 ? `Te quedan ${queda} M` : `Te pasas ${-queda} M`;
    const faltan = estado.slots.filter(x => !x).length;
    $('fz-faltan').textContent = faltan ? (faltan === 1 ? 'Falta 1 jugador' : `Faltan ${faltan} jugadores`) : 'Equipo completo';
}

/* ================= Mercado ================= */
function enMercado(j) {
    if (estado.slots.includes(j.id)) return { accion: 'quitar', texto: 'Quitar' };
    const h = F.huecoLibre(estado, j);
    if (h < 0) return estado.slots.every(Boolean) ? { accion: '', texto: 'Fichar' }      // equipo lleno: lo explica la cabecera
        : { accion: '', texto: 'Fichar', motivo: `Sin hueco de ${j.posiciones.map(p => F.NOMBRE_POS[p].toLowerCase()).join(' ni de ')} en esta formación` };
    const r = F.colocar(estado, h, j.id, porId);
    return r.ok ? { accion: 'fichar', texto: 'Fichar', hueco: h } : { accion: '', texto: 'Fichar', motivo: r.motivo };
}

function pintarMercado() {
    const completo = estado.slots.every(Boolean);
    $('fz-mercado-meta').textContent = completo ? 'Equipo completo: toca a un jugador del campo para cambiarlo' : `Precios en millones · Presupuesto ${F.PRESUPUESTO} M`;
    $('fz-mercado').innerHTML = PL.map(j => {
        const s = enMercado(j);
        const pts = puntuadas.length ? ` · ${totalJugador(j.id)} pts` : '';
        return `<li class="fz-row${s.accion === 'quitar' ? ' is-in' : ''}">
            <span class="fz-dor num">${esc(j.dorsal)}</span>
            <button type="button" class="fz-who fz-ver" data-ficha="${esc(j.id)}" aria-label="${esc(`Ver los puntos de ${j.nombre}`)}"><b>${esc(j.nombre)}${j.estrella ? ' <span class="fz-star">Estrella</span>' : ''}</b>
              <small>${posTxt(j)} · ${media(j.media)}${pts}</small>
              ${s.motivo ? `<small class="fz-why">${esc(s.motivo)}</small>` : ''}</button>
            <span class="fz-price num">${j.precio} M</span>
            <button type="button" class="fz-act${s.accion === 'quitar' ? ' is-out' : ''}" data-id="${esc(j.id)}" data-accion="${s.accion}"${s.accion ? '' : ' disabled'} aria-label="${esc(`${s.texto}: ${j.nombre}`)}">${s.texto}</button>
        </li>`;
    }).join('');
}

/* ================= Selector de jugador (hoja) ================= */
const sheet = $('fz-sheet');

function abrirSelector(i) {
    if (!abierta() || !usuario) return;
    activo = i;
    pintarSelector();
    if (!sheet.open) sheet.showModal();
}
function cerrarSelector() { if (sheet.open) sheet.close(); }
sheet.addEventListener('close', () => { activo = null; });

function pintarSelector() {
    const i = activo; if (i == null) return;
    const actual = estado.slots[i] ? porId[estado.slots[i]] : null;
    const pos = F.posHueco(estado.formacion, i), nPos = F.NOMBRE_POS[pos].toLowerCase();
    $('fz-sheet-title').textContent = actual ? actual.nombre : `Elige ${nPos}`;
    const queda = F.PRESUPUESTO - F.coste(estado.slots, porId);
    $('fz-sheet-sub').textContent = actual
        ? `${actual.precio} M · ${cap(media(actual.media))} · Te quedan ${queda} M`
        : `Te quedan ${queda} M de ${F.PRESUPUESTO}`;
    $('fz-current').innerHTML = actual ? `<div class="fz-cur">
          <button type="button" class="pick-btn" data-cap="${esc(actual.id)}" aria-pressed="${estado.capitan === actual.id}">${estado.capitan === actual.id ? 'Es tu capitán' : 'Hacer capitán'}</button>
          <button type="button" class="pick-btn fz-quitar" data-quitar="${esc(actual.id)}">Quitar</button>
          <button type="button" class="pick-btn fz-quitar" data-ficha="${esc(actual.id)}">Ver puntos</button>
        </div>
        <p class="fz-pick-title">Cambiar por otro ${nPos}</p>` : `<p class="fz-pick-title">Jugadores que juegan de ${nPos}</p>`;
    const candidatos = PL.filter(j => F.puede(j, pos) && j.id !== estado.slots[i]);
    $('fz-pick').innerHTML = candidatos.map(j => {
        const r = F.colocar(estado, i, j.id, porId);
        const dentro = estado.slots.includes(j.id);
        const nota = dentro ? 'Ya está en tu equipo: cambian de puesto' : r.ok ? cap(media(j.media)) : r.motivo;
        return `<li><button type="button" class="fz-opt${dentro ? ' is-in' : ''}" data-id="${esc(j.id)}"${r.ok ? '' : ' disabled'}>
            <span class="fz-dor num">${esc(j.dorsal)}</span>
            <span class="fz-who"><b>${esc(j.nombre)}${j.estrella ? ' <span class="fz-star">Estrella</span>' : ''}</b><small${r.ok ? '' : ' class="fz-why"'}>${esc(nota)}</small></span>
            <span class="fz-price num">${j.precio} M</span>
        </button></li>`;
    }).join('') || `<li class="fz-none">No hay más jugadores que jueguen de ${nPos}.</li>`;
}

/* ================= Ficha: registro de puntos de un jugador ================= */
// Como en las apps de fantasy: cabecera con el jugador, una tira con los puntos de cada jornada
// y, debajo, la tabla de la jornada elegida (cantidad · estadística · puntos).
const ficha = $('fz-ficha');
let fichaVer = null;                     // { id, pos, n }
const tono = v => (v == null ? 'is-none' : v > 0 ? 'is-up' : v < 0 ? 'is-down' : 'is-zero');
const signo = v => (v > 0 ? '+' + v : String(v).replace('-', '−'));
const marcadorDe = P => (P.local ? `Tinellers ${P.gf}–${P.gc} ${P.rival}` : `${P.rival} ${P.gc}–${P.gf} Tinellers`);
const resumenPos = pos => {
    const g = F.GRUPO[pos];
    return `Gol +${F.TABLA.gol[g]} · asistencia +${F.TABLA.asistencia[g]} · cada 2 tiros a puerta +${F.TABLA.tiros2[g]} · portería a cero +${F.TABLA.porteria0[g]}`;
};

function abrirFicha(id, pos, n) {
    const j = porId[id]; if (!j) return;
    pos = j.posiciones.includes(pos) ? pos : (pos && F.GRUPO[pos] ? pos : j.posiciones[0]);
    const ns = Object.keys(D.PARTIDOS || {}).map(Number).sort((a, b) => a - b);
    fichaVer = { id, pos, n: ns.includes(n) ? n : (ns[ns.length - 1] ?? null) };
    pintarFicha(true);
    if (sheet.open) sheet.close();
    if (!ficha.open) ficha.showModal();
}

function pintarFicha(alAbrir) {
    const { id, pos, n } = fichaVer, j = porId[id];
    const ns = Object.keys(D.PARTIDOS || {}).map(Number).sort((a, b) => a - b);
    const total = puntuadas.reduce((s, k) => s + (F.puntosJugador(D, id, k, pos) || 0), 0);
    const ultima = ns.length ? F.desglose(D, id, ns[ns.length - 1], pos) : null;
    const estadoTxt = !ultima ? 'Sin partidos todavía' : ultima.jugo ? `Jugó la jornada ${ns[ns.length - 1]}` : `${ultima.estado} la jornada ${ns[ns.length - 1]}`;

    $('fz-ficha-head').innerHTML = `
        <span class="fz-fk${j.portero ? ' is-gk' : ''}">${camiseta(j.dorsal)}</span>
        <div class="fz-fh-main">
          <p class="fz-fh-name"><span class="fz-badge pos-${pos}">${pos}</span><b id="fz-ficha-title">${esc(j.nombre)}</b></p>
          <p class="fz-fh-line"><span class="fz-dot ${ultima?.jugo ? 'is-ok' : 'is-off'}" aria-hidden="true"></span>${esc(estadoTxt)}</p>
          <p class="fz-fh-line"><span class="fz-coin" aria-hidden="true">M</span>${j.precio} millones${j.estrella ? ' · Estrella' : ''}</p>
        </div>
        <div class="fz-fh-pts">
          <p><small>Pts</small><b class="num">${puntuadas.length ? total : '–'}</b></p>
          <p class="fz-fh-media">Media <b class="num">${j.media == null ? '–' : j.media.toFixed(1).replace('.', ',')}</b></p>
        </div>`;

    $('fz-ficha-pos').innerHTML = j.posiciones.length > 1
        ? `<span>Puntúa como</span>${j.posiciones.map(p => `<button type="button" class="fz-chip" data-fpos="${p}" aria-pressed="${p === pos}">${F.NOMBRE_POS[p]}</button>`).join('')}`
        : `<span>Juega de ${F.NOMBRE_POS[pos].toLowerCase()}</span>`;

    const maxAbs = Math.max(1, ...ns.map(k => Math.abs(F.puntosJugador(D, id, k, pos) || 0)));
    $('fz-ficha-strip').innerHTML = ns.map(k => {
        const d = F.desglose(D, id, k, pos), v = d && d.jugo ? d.total : null;
        const h = v == null ? 6 : Math.max(6, Math.round(Math.abs(v) / maxAbs * 34));
        return `<button type="button" class="fz-sj ${tono(v)}${k < F.PRIMERA_JORNADA ? ' is-antes' : ''}" data-fj="${k}" aria-pressed="${k === n}" aria-label="Jornada ${k}: ${v == null ? (d?.estado || 'sin datos') : v + ' puntos'}">
            <small>J${k}</small><b class="num">${v == null ? '–' : signo(v)}</b><i style="height:${h}px"></i></button>`;
    }).join('') || '<p class="fz-none">Todavía no hay partidos con datos.</p>';

    const P = n != null ? D.PARTIDOS[n] : null, d = n != null ? F.desglose(D, id, n, pos) : null;
    $('fz-ficha-body').innerHTML = !P ? '' : `
        <div class="fz-jt">
          <h3>Jornada ${n}</h3>
          <p>${esc(marcadorDe(P))} · ${esc(P.fecha)}${n < F.PRIMERA_JORNADA ? ' · <span class="fz-tag">No cuenta: el fantasy empieza en la J' + F.PRIMERA_JORNADA + '</span>' : ''}</p>
        </div>
        ${d.jugo ? `<table class="fz-tabla">
          <thead><tr><th scope="col">Cantidad</th><th scope="col">Estadística</th><th scope="col">Puntos</th></tr></thead>
          <tbody>${d.filas.map(f => `<tr><td class="num">${esc(f.cantidad)}</td><th scope="row">${esc(f.texto)}</th><td class="num ${tono(f.pts)}">${signo(f.pts)}</td></tr>`).join('')}</tbody>
        </table>` : `<p class="fz-nojugo"><b>${esc(d.estado)}</b>No suma puntos esta jornada.</p>`}
        <p class="fz-reglas-pos"><b>Como ${F.NOMBRE_POS[pos].toLowerCase()}:</b> ${resumenPos(pos)}. Titular +${F.PUNTOS.titular}, MVP +${F.PUNTOS.mvp}; encajar 2 o más goles resta 1 por gol. Si es tu capitán, todo por dos.</p>
        ${(D.JUGADORES || []).some(x => x.id === id) ? `<a class="more" href="jugador.html?id=${encodeURIComponent(id)}">Ficha completa del jugador <span aria-hidden="true">→</span></a>` : ''}`;
    $('fz-ficha-foot').innerHTML = P ? `<span>Total jornada ${n}</span><b class="num">${d.total}</b>` : '';
    $('fz-ficha-foot').classList.toggle('hidden', !P);

    if (alAbrir) {
        const sel = $('fz-ficha-strip').querySelector('[aria-pressed="true"]');
        requestAnimationFrame(() => sel?.scrollIntoView({ block: 'nearest', inline: 'center' }));
        $('fz-ficha-body').scrollTop = 0;
    }
}

/* ================= Cambios en el equipo ================= */
function cambiar(nuevo) {
    estado = { ...estado, ...nuevo };
    if (estado.capitan && !estado.slots.includes(estado.capitan)) estado.capitan = null;
    if (!estado.capitan && estado.slots.every(Boolean)) estado.capitan = F.capitanPorDefecto(estado.slots, porId);
    tocado = true;
    $('fz-error').textContent = '';
    pintarEquipo();
}

function fichar(i, id) {
    const r = F.colocar(estado, i, id, porId);
    if (!r.ok) { toast(r.motivo); return false; }
    cambiar({ slots: r.slots });
    return true;
}

function quitar(id) {
    cambiar({ slots: estado.slots.map(x => (x === id ? null : x)) });
}

/* ================= Guardar ================= */
function pintarGuardar() {
    const j = abierta();
    const btn = $('fz-guardar');
    const prob = F.problemas(estado, porId);
    const cambios = !igual(estado, guardado);
    let texto, off = false;
    if (!j) { texto = 'Temporada terminada'; off = true; }
    else if (guardando) { texto = 'Guardando…'; off = true; }
    else if (usuario && guardado && !cambios) { texto = 'Equipo guardado'; off = true; }
    else if (prob.length) { texto = prob[0]; off = true; }
    else if (!usuario) { texto = api.local ? 'Entrar y guardar' : 'Entrar con Google y guardar'; }
    else { texto = guardado ? 'Guardar cambios' : 'Guardar equipo'; }
    btn.textContent = texto;
    btn.disabled = off;
    btn.classList.toggle('is-saved', !!(j && usuario && guardado && !cambios && !guardando));

    let msg;
    if (!j) msg = 'La temporada del fantasy ha terminado.';
    else if (!usuario) msg = `Entra con tu cuenta de Google para hacer tu equipo. Cierre: ${cuando(j.cierre)}.`;
    else if (!guardado) msg = `Aún no tienes equipo para la jornada ${j.n}. Puedes guardarlo hasta el ${cuando(j.cierre)}.`;
    else if (cambios) msg = `Tienes cambios sin guardar. Puedes guardarlos hasta el ${cuando(j.cierre)}.`;
    else if (guardadoEn === j.n) msg = `Tu equipo para la jornada ${j.n} está guardado. Puedes cambiarlo hasta el ${cuando(j.cierre)}.`;
    else msg = `Juegas la jornada ${j.n} con tu equipo de la jornada ${guardadoEn}. Si quieres cambiarlo, guarda antes del ${cuando(j.cierre)}.`;
    $('fz-estado').textContent = msg;

    $('fz-user').classList.toggle('hidden', !usuario);
    if (usuario) {
        $('fz-nombre').textContent = usuario.nombre;
        const img = $('fz-avatar');
        if (usuario.avatar) { img.src = usuario.avatar; img.classList.remove('hidden'); $('fz-initial').classList.add('hidden'); }
        else { img.classList.add('hidden'); $('fz-initial').classList.remove('hidden'); $('fz-initial').textContent = usuario.nombre.charAt(0).toUpperCase(); }
        $('fz-local').classList.add('hidden');
    }
    pintarAcceso();
    pintarAviso();
}

/* ================= Acceso: primero se entra, luego se hace el equipo ================= */
function pintarAcceso() {
    const fuera = !usuario && !!abierta();
    $('fz-gate').classList.toggle('hidden', !fuera);
    $('fz-layout').classList.toggle('is-locked', fuera);
    document.querySelectorAll('#fz-layout .fz-main, #fz-layout .fz-side').forEach(el => el.toggleAttribute('inert', fuera));
    $('fz-gate-local').classList.toggle('hidden', !api.local);
    $('fz-entrar').classList.toggle('hidden', !!api.local);
}

async function entrar() {
    $('fz-gate-error').textContent = '';
    if (api.local) {
        const nombre = $('fz-gate-name').value.trim();
        if (!nombre) { $('fz-gate-name').focus(); return; }
        api.loginLocal(nombre); return;
    }
    try { await api.login(); }
    catch (e) { if (!cancelado(e)) $('fz-gate-error').textContent = 'No se pudo iniciar sesión. Inténtalo de nuevo.'; }
}

/* ================= Avisos por correo ================= */
function pintarAviso() {
    const box = $('fz-aviso-box');
    if (!usuario || aviso === undefined) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const correo = usuario.email ? ` a <b>${esc(usuario.email)}</b>` : '';
    box.classList.toggle('is-pending', aviso === null);
    box.innerHTML = aviso === null
        ? `<p><b>¿Te avisamos por correo?</b> Un recordatorio antes de que cierre cada jornada y tus puntos cuando salgan${correo}.</p>
           <div class="fz-aviso-btns"><button type="button" class="btn btn--sm" data-aviso="si">Sí, avísame</button><button type="button" class="btn btn--sm btn--white" data-aviso="no">No, gracias</button></div>`
        : `<label class="fz-check"><input type="checkbox" id="fz-avisos"${aviso ? ' checked' : ''}><span>Avisarme por correo${correo}: cierre de cada jornada y mis puntos</span></label>`;
}

async function decidirAviso(activo) {
    if (!usuario) return;
    const antes = aviso; aviso = activo; pintarAviso();
    try {
        await api.guardarAviso(usuario.id, { email: usuario.email || '', nombre: usuario.nombre.slice(0, 80), activo });
        toast(activo ? 'Te avisaremos por correo' : 'No te enviaremos correos');
    } catch (e) {
        aviso = antes; pintarAviso();
        toast('No se pudo guardar tu preferencia. Inténtalo otra vez.');
    }
}

const cancelado = e => ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e?.code);

async function guardar() {
    const j = abierta();
    if (!j || guardando || F.problemas(estado, porId).length) return;
    $('fz-error').textContent = '';
    if (!usuario) {
        if (api.local) {
            const nombre = $('fz-local-name').value.trim();
            if (!nombre) { $('fz-local').classList.remove('hidden'); $('fz-local-name').focus(); return; }
            const listo = new Promise(r => { alEntrar = r; });
            api.loginLocal(nombre);
            await listo;
        } else {
            const listo = new Promise(r => { alEntrar = r; });
            try { await api.login(); } catch (e) {
                alEntrar = null;
                if (!cancelado(e)) $('fz-error').textContent = 'No se pudo iniciar sesión. Inténtalo de nuevo.';
                return;
            }
            await listo;
        }
    }
    if (!usuario) return;
    guardando = true; pintarGuardar();
    const datos = {
        nombre: usuario.nombre.slice(0, 80),
        avatar: (usuario.avatar || '').length <= 500 ? (usuario.avatar || '') : '',
        jugadores: estado.slots.slice(),
        capitan: estado.capitan,
        formacion: estado.formacion,
        jornada: j.n
    };
    try {
        await api.guardar(j.n, usuario.id, datos);
        misPuntosN = j.n;
        guardado = { ...datos }; guardadoEn = j.n; tocado = false; version++;
        toast(`Equipo guardado para la jornada ${j.n}`);
        pintarClasificacion();
    } catch (e) {
        $('fz-error').textContent = e?.code === 'permission-denied'
            ? (Date.now() < j.cierre.getTime() ? 'Esta jornada aún no está activada. El administrador tiene que entrar en el fantasy para abrirla.' : 'Esta jornada ya está cerrada.')
            : 'No se pudo guardar el equipo. Revisa tu conexión e inténtalo otra vez.';
    } finally {
        guardando = false; pintarEquipo();
    }
}

async function cargarMio() {
    const j = abierta(), u = usuario, v = version;
    if (!j || !u) { guardado = null; guardadoEn = null; return; }
    let hallado = null, en = null;
    try {
        for (let n = j.n; n >= F.PRIMERA_JORNADA; n--) {
            const e = await api.mio(n, u.id);
            if (e?.jugadores?.length) { hallado = { ...e }; en = n; break; }
        }
    } catch (e) { console.warn('No se pudo cargar tu equipo:', e?.code || e); return; }
    if (v !== version || u !== usuario) return;      // mientras tanto se guardó o cambió la sesión
    guardado = hallado; guardadoEn = en;
    if (guardado && !tocado) estado = deGuardado(guardado);
}

/* ================= Cabecera ================= */
function pintarCabecera() {
    const j = abierta();
    if (!j) {
        $('fz-j').textContent = 'Fin';
        $('fz-cierre').textContent = 'Temporada terminada';
        $('fz-quedan').textContent = '';
        $('fz-para').textContent = 'La temporada ha terminado';
        return;
    }
    $('fz-j').textContent = 'J' + j.n;
    $('fz-cierre').textContent = `Cierre: ${cuando(j.cierre)}`;
    const ms = j.cierre.getTime() - Date.now();
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.max(1, Math.floor(ms % 36e5 / 6e4));
    $('fz-quedan').textContent = d > 0 ? `Quedan ${d} ${d === 1 ? 'día' : 'días'} y ${h} h` : h > 0 ? `Quedan ${h} h y ${m} min` : `Quedan ${m} min`;
    $('fz-para').textContent = `Jornada ${j.n} · ${j.local} – ${j.visitante} · ${corto(j.inicio)}`;
}

/* ================= Clasificación y equipos de todos ================= */
let todos = null;                         // { equipos: { [n]: { [uid]: equipo } }, js: [n…], filas } cuando se cargan
const chipsEquipo = (e, p, n) => (e?.jugadores || []).map((id, i) => {
    const j = porId[id], x = p?.detalle[i], pos = F.posEnEquipo(D, e, i);
    return `<li${id === e.capitan ? ' class="is-cap"' : ''}><button type="button" data-ficha="${esc(id)}" data-pos="${pos}"${n ? ` data-n="${n}"` : ''}><small>${pos}</small><span>${esc(j ? j.corto : id)}${id === e.capitan ? ' <i>C</i>' : ''}</span>${p ? `<b class="num">${x ? x.pts : 0}</b>` : ''}</button></li>`;
}).join('');

/* ---------- Puntos de un equipo en el campo, jornada a jornada ---------- */
const lineas = document.querySelector('#fz-pitch .fz-lines').outerHTML;
function vistaPuntos(uid, n) {
    if (!todos) return '<p class="fz-empty">Cargando los puntos…</p>';
    const { equipos, js } = todos;
    const pills = js.map(k => {
        const e = F.equipoEnJornada(equipos, uid, k), p = e ? F.puntosEquipo(D, e, k) : null;
        return `<button type="button" class="fz-pj${p ? ' is-done' : ''}" data-pj="${k}" data-uid="${esc(uid)}" aria-pressed="${k === n}" aria-label="Jornada ${k}${p ? ': ' + p.total + ' puntos' : ''}"><b>J${k}</b>${p ? `<small class="num">${p.total}</small>` : ''}</button>`;
    }).join('');
    const e = F.equipoEnJornada(equipos, uid, n), p = e ? F.puntosEquipo(D, e, n) : null;
    const ab = abierta();
    const titulo = !e ? `Sin equipo en la jornada ${n}`
        : p ? `Jornada ${n} · <b class="num">${p.total} pts</b>`
        : ab && ab.n === n ? `Jornada ${n} · se puede cambiar hasta el ${cuando(ab.cierre)}` : `Jornada ${n} · puntos pendientes`;
    const def = F.FORMACIONES[e?.formacion] || F.FORMACIONES[F.FORMACION_INICIAL];
    const cartas = (e?.jugadores || []).map((id, i) => {
        const j = porId[id], x = p?.detalle[i], pos = F.posEnEquipo(D, e, i), [, left, y] = def.huecos[i];
        const top = Math.round((12 + (y - 24) * 76 / 63) * 10) / 10;          // las cartas son altas: se separan más las líneas
        const esCap = id === e.capitan, base = x ? F.desglose(D, id, n, pos) : null;
        const v = x ? (base?.jugo ? x.pts : null) : undefined;
        return `<button type="button" class="fz-pc" style="left:${left}%;top:${top}%" data-ficha="${esc(id)}" data-pos="${pos}" data-n="${n}" aria-label="${esc(`${j ? j.nombre : id}, ${F.NOMBRE_POS[pos].toLowerCase()}${esCap ? ', capitán' : ''}: ${v == null ? (x ? 'no jugó' : 'sin puntos todavía') : v + ' puntos'}. Ver detalle`)}">
            <span class="fz-pc-card">
              <span class="fz-pc-pts ${v === undefined ? 'is-none' : tono(v)}">${v === undefined ? pos : v == null ? '–' : v}</span>
              ${esCap ? `<span class="fz-pc-cap" aria-hidden="true">C${x ? ' <i>x2</i>' : ''}</span>` : ''}
              <span class="fz-kit${j?.portero ? ' is-gk' : ''}">${camiseta(j ? j.dorsal : '')}</span>
              <span class="fz-pc-name">${esc(j ? j.corto : id)}</span>
            </span></button>`;
    }).join('');
    return `<div class="fz-pjs" role="group" aria-label="Jornada">${pills}</div>
        <p class="fz-pt-title">${titulo}</p>
        <div class="fz-pitch is-static">${lineas}${cartas || '<p class="fz-pitch-msg">No hay equipo guardado para esta jornada.</p>'}</div>
        ${e && !F.FORMACIONES[e.formacion] ? '<p class="meta fz-pt-nota">Equipo guardado con una formación antigua: cada jugador puntúa en su posición principal.</p>' : ''}`;
}
const jornadaPorDefecto = () => {
    if (!todos) return null;
    const hechas = todos.js.filter(k => F.jornadaPuntuada(D, k));
    return hechas.length ? hechas[hechas.length - 1] : todos.js[todos.js.length - 1];
};

// Pestaña «Puntos» de tu equipo
let pestaña = 'alin', misPuntosN = null;
function pintarMisPuntos() {
    const box = $('fz-tab-puntos');
    if (pestaña !== 'puntos') return;
    if (!usuario) { box.innerHTML = '<p class="fz-empty">Entra para ver tus puntos.</p>'; return; }
    if (todos && !todos.js.includes(misPuntosN)) misPuntosN = jornadaPorDefecto();
    box.innerHTML = vistaPuntos(usuario.id, misPuntosN);
}
function verPestaña(t) {
    pestaña = t;
    document.querySelectorAll('#fz-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    $('fz-tab-alin').classList.toggle('hidden', t !== 'alin');
    $('fz-tab-puntos').classList.toggle('hidden', t !== 'puntos');
    pintarMisPuntos();
}

// Ventana con el equipo de cualquier participante
const eqDlg = $('fz-eq');
let eqVer = null;
function abrirEquipo(uid) {
    const f = todos?.filas.find(x => x.uid === uid); if (!f) return;
    eqVer = { uid, n: jornadaPorDefecto() };
    $('fz-eq-title').textContent = f.nombre;
    $('fz-eq-sub').textContent = `${f.pos ? f.pos + 'º · ' : ''}${f.total} pts en total`;
    $('fz-eq-body').innerHTML = vistaPuntos(uid, eqVer.n);
    if (!eqDlg.open) eqDlg.showModal();
}

async function pintarClasificacion() {
    const ab = abierta();
    const hasta = ab ? ab.n : delFantasy[delFantasy.length - 1]?.n;
    const js = delFantasy.filter(j => j.n <= hasta).map(j => j.n);
    const box = $('fz-clasif'), meta = $('fz-clasif-meta');
    if (!js.length) { box.innerHTML = '<p class="fz-empty">No hay jornadas.</p>'; return; }
    if (!box.querySelector('.fz-rank')) box.innerHTML = '<p class="fz-empty">Cargando los equipos…</p>';
    const equipos = {};
    try { await Promise.all(js.map(async n => { equipos[n] = await api.equipos(n); })); }
    catch (e) {
        console.warn('No se pudo cargar la clasificación:', e?.code || e);
        box.innerHTML = '<p class="fz-empty">No se pudieron cargar los equipos. Recarga la página para intentarlo otra vez.</p>';
        return;
    }
    const { filas, ultima } = F.clasificacion(D, equipos, js);
    todos = { equipos, js, filas };
    pintarMisPuntos();
    meta.textContent = filas.length
        ? (ultima ? `Tras la jornada ${ultima}` : `Los puntos empiezan con la jornada ${F.PRIMERA_JORNADA}`) + ` · ${filas.length} ${filas.length === 1 ? 'participante' : 'participantes'}`
        : 'Todavía nadie ha hecho su equipo';
    if (!filas.length) { box.innerHTML = '<p class="fz-empty">Todavía nadie ha hecho su equipo. ¡Sé el primero!</p>'; return; }

    const col = ultima ? `J${ultima}` : 'Jornada';
    const abiertos = new Set([...box.querySelectorAll('details[open]')].map(d => d.dataset.uid));
    box.innerHTML = `<div class="fz-rank-head" aria-hidden="true"><span>Pos</span><span>Participante</span><span>${col}</span><span>Total</span></div>
      <ol class="fz-rank">${filas.map(f => {
        const yo = usuario && f.uid === usuario.id;
        const hist = f.historial.filter(h => h.n < f.jornadaEquipo).reverse();
        return `<li class="fz-r${yo ? ' is-me' : ''}"><details data-uid="${esc(f.uid)}"${abiertos.has(f.uid) ? ' open' : ''}>
            <summary>
              <span class="fz-pos num">${ultima ? f.pos + 'º' : '–'}</span>
              <span class="fz-mgr">${avatar(f.avatar, f.nombre)}<b>${esc(f.nombre)}</b>${yo ? '<small>Tú</small>' : ''}</span>
              <span class="fz-last num">${f.ultima ?? '–'}</span>
              <span class="fz-total num">${ultima ? f.total : '–'}</span>
            </summary>
            <div class="fz-team">
              <p>${ab ? `Equipo para la jornada ${f.jornadaEquipo}` : `Último equipo (jornada ${f.jornadaEquipo})`}${f.equipo?.formacion && F.FORMACIONES[f.equipo.formacion] ? ` · ${esc(f.equipo.formacion)}` : ''}</p>
              <ul>${chipsEquipo(f.equipo, ab ? null : F.puntosEquipo(D, f.equipo, f.jornadaEquipo), f.jornadaEquipo)}</ul>
              ${hist.length ? `<div class="fz-hist">${hist.map(h => `<div><p>Jornada ${h.n}${h.puntos ? ` · <b>${h.puntos.total} pts</b>` : ' · puntos pendientes'}${h.heredado ? ' · mismo equipo' : ''}</p><ul>${chipsEquipo(h.equipo, h.puntos, h.n)}</ul></div>`).join('')}</div>` : ''}
              <button type="button" class="btn btn--sm fz-ver-campo" data-eq="${esc(f.uid)}">Ver sus puntos en el campo</button>
            </div>
          </details></li>`;
    }).join('')}</ol>`;
}

/* ================= Todo junto ================= */
function pintarEquipo() {
    pintarCampo(); pintarPresupuesto(); pintarMercado(); pintarGuardar();
    if (activo != null) pintarSelector();
}

// Eventos
$('fz-forms').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b || b.dataset.f === estado.formacion) return;
    const r = F.cambiarFormacion(estado, b.dataset.f, porId);
    cambiar({ formacion: b.dataset.f, slots: r.slots });
    if (r.fuera.length) toast(`${r.fuera.map(id => porId[id].corto).join(' y ')} no ${r.fuera.length === 1 ? 'tiene' : 'tienen'} sitio en esta formación`);
});
document.addEventListener('click', e => {
    const f = e.target.closest('[data-ficha]');
    if (f) { e.preventDefault(); abrirFicha(f.dataset.ficha, f.dataset.pos, f.dataset.n ? Number(f.dataset.n) : undefined); }
});
$('fz-ficha-strip').addEventListener('click', e => {
    const b = e.target.closest('[data-fj]'); if (!b || !fichaVer) return;
    fichaVer.n = Number(b.dataset.fj); pintarFicha();
});
$('fz-ficha-pos').addEventListener('click', e => {
    const b = e.target.closest('[data-fpos]'); if (!b || !fichaVer) return;
    fichaVer.pos = b.dataset.fpos; pintarFicha();
});
$('fz-ficha-x').addEventListener('click', () => ficha.close());
document.addEventListener('click', e => {
    const b = e.target.closest('[data-pj]');
    if (b) {
        const n = Number(b.dataset.pj), uid = b.dataset.uid;
        if (b.closest('#fz-eq')) { eqVer.n = n; $('fz-eq-body').innerHTML = vistaPuntos(uid, n); }
        else { misPuntosN = n; pintarMisPuntos(); }
        return;
    }
    const q = e.target.closest('[data-eq]'); if (q) abrirEquipo(q.dataset.eq);
});
$('fz-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) verPestaña(b.dataset.tab); });
$('fz-eq-x').addEventListener('click', () => eqDlg.close());
eqDlg.addEventListener('click', e => { if (e.target === eqDlg) eqDlg.close(); });
ficha.addEventListener('click', e => { if (e.target === ficha) ficha.close(); });
$('fz-entrar').addEventListener('click', entrar);
$('fz-gate-local').addEventListener('submit', e => { e.preventDefault(); entrar(); });
$('fz-aviso-box').addEventListener('click', e => {
    const b = e.target.closest('[data-aviso]'); if (b) decidirAviso(b.dataset.aviso === 'si');
});
$('fz-aviso-box').addEventListener('change', e => { if (e.target.id === 'fz-avisos') decidirAviso(e.target.checked); });
$('fz-mercado').addEventListener('click', e => {
    const b = e.target.closest('[data-accion]'); if (!b || b.disabled || !abierta()) return;
    const j = porId[b.dataset.id]; if (!j) return;
    if (b.dataset.accion === 'quitar') quitar(j.id);
    else if (b.dataset.accion === 'fichar') { const h = F.huecoLibre(estado, j); if (h >= 0) fichar(h, j.id); }
});
$('fz-pick').addEventListener('click', e => {
    const b = e.target.closest('.fz-opt'); if (!b || b.disabled || activo == null) return;
    if (fichar(activo, b.dataset.id)) cerrarSelector();
});
$('fz-current').addEventListener('click', e => {
    const c = e.target.closest('[data-cap]'), q = e.target.closest('[data-quitar]');
    if (e.target.closest('[data-ficha]')) return;
    if (c) { cambiar({ capitan: c.dataset.cap }); cerrarSelector(); toast(`${porId[c.dataset.cap]?.corto} es tu capitán: puntúa doble`); }
    else if (q) { quitar(q.dataset.quitar); cerrarSelector(); }
});
$('fz-sheet-x').addEventListener('click', cerrarSelector);
sheet.addEventListener('click', e => { if (e.target === sheet) cerrarSelector(); });   // clic fuera de la hoja
$('fz-guardar').addEventListener('click', guardar);
$('fz-local').addEventListener('submit', e => { e.preventDefault(); guardar(); });
$('fz-salir').addEventListener('click', () => { tocado = false; api.logout(); });

// Arranque
pintarCabecera();
pintarEquipo();
jAbierta = abierta()?.n ?? null;
setInterval(async () => {
    pintarCabecera();
    const n = abierta()?.n ?? null;
    if (n !== jAbierta) {                          // acaba de cerrar una jornada: el equipo pasa a la siguiente
        jAbierta = n;
        if (activo != null) cerrarSelector();
        await cargarMio(); pintarEquipo(); pintarClasificacion();
    }
}, 30e3);

api.onUser(async u => {
    usuario = u;
    if (alEntrar && u) { const r = alEntrar; alEntrar = null; r(); }
    if (!u) { guardado = null; guardadoEn = null; aviso = undefined; estado = F.vacio(); tocado = false; verPestaña('alin'); pintarEquipo(); pintarClasificacion(); return; }
    api.aviso(u.id).then(a => { if (usuario === u) { aviso = a ? !!a.activo : null; pintarAviso(); } })
        .catch(() => { if (usuario === u) { aviso = null; pintarAviso(); } });
    if (u.email && ADMINS.includes(u.email.toLowerCase()) && api.activarJornadas) {
        api.activarJornadas().catch(err => console.warn('No se pudieron activar las jornadas:', err?.code || err));
    }
    await cargarMio();
    pintarEquipo();
    pintarClasificacion();
});
