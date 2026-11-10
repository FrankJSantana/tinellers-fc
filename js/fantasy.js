// js/fantasy.js — Fantasy Tinellers: tu equipo de 5 en el campo, mercado, guardado y clasificación.
// Con Firebase configurado cada cuenta de Google guarda su equipo en la base de datos
// (fantasy/j4/equipos/{uid}, uno por jornada); sin configurar, modo local para probar.
// Las reglas del juego (precios, presupuesto y puntos) están en js/fantasy-logica.js.
import { firebaseConfig } from './firebase-config.js';
import { JORNADAS, HORAS_CIERRE } from './calendario.js?v=20261103c';
import * as F from './fantasy-logica.js?v=20261110k';

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
const ficha = $('fz-ficha');
function abrirFicha(id) {
    const j = porId[id]; if (!j) return;
    const datos = (D.JUGADORES || []).find(x => x.id === id);
    const ns = Object.keys(D.PARTIDOS || {}).map(Number).sort((a, b) => b - a);
    const totalF = totalJugador(id);
    $('fz-ficha-title').textContent = j.nombre;
    $('fz-ficha-sub').textContent = `#${j.dorsal} · ${posTxt(j)} · ${j.precio} M · ${cap(media(j.media))}`;
    const filas = ns.map(n => {
        const P = D.PARTIDOS[n], d = F.desglose(D, id, n), antes = n < F.PRIMERA_JORNADA;
        const marcador = P.local ? `Tinellers FC ${P.gf}–${P.gc} ${P.rival}` : `${P.rival} ${P.gc}–${P.gf} Tinellers FC`;
        const r = d?.datos || {};
        const chips = d?.jugo ? [
            typeof r.nota === 'number' ? `Nota ${String(r.nota).replace('.', ',')}` : 'Nota pendiente',
            r.goles ? `${r.goles} ${r.goles === 1 ? 'gol' : 'goles'}` : '',
            r.asistencias ? `${r.asistencias} ${r.asistencias === 1 ? 'asistencia' : 'asistencias'}` : '',
            r.paradas ? `${r.paradas} paradas` : '',
            r.tiros ? `${r.tiros} tiros a puerta` : '',
            r.mvp ? 'MVP' : ''
        ].filter(Boolean) : [d?.estado || 'No jugó'];
        const cuenta = d?.jugo ? d.partes.map(([t, v]) => `${t} <b>${v > 0 ? '+' + v : v}</b>`).join(' · ') : 'No suma puntos';
        return `<li class="fz-fj${antes ? ' is-antes' : ''}">
            <div class="fz-fj-head"><b>Jornada ${n}</b><span>${esc(marcador)} · ${esc(P.fecha)}</span>${antes ? '<i>Antes del fantasy</i>' : ''}</div>
            <p class="fz-chips">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</p>
            <p class="fz-cuenta">${cuenta}<strong class="num">${d ? d.total : 0} pts</strong></p>
        </li>`;
    }).join('') || '<li class="fz-none">Todavía no hay partidos con datos.</li>';
    $('fz-ficha-body').innerHTML = `<p class="fz-ficha-total">En el fantasy: <b class="num">${totalF} pts</b>${puntuadas.length ? '' : ' (empieza a contar en la jornada ' + F.PRIMERA_JORNADA + ')'}</p>
        <p class="fz-ficha-reglas">Nota del partido redondeada, +${F.PUNTOS.gol} por gol, +${F.PUNTOS.asistencia} por asistencia y +${F.PUNTOS.mvp} si es MVP. Si es tu capitán, todo por dos.</p>
        <ol class="fz-fichas">${filas}</ol>
        ${datos ? `<a class="more" href="jugador.html?id=${encodeURIComponent(id)}">Ficha completa del jugador <span aria-hidden="true">→</span></a>` : ''}`;
    if (sheet.open) sheet.close();
    if (!ficha.open) ficha.showModal();
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
const chipsEquipo = (e, p) => (e?.jugadores || []).map((id, i) => {
    const j = porId[id], x = p?.detalle.find(d => d.id === id), pos = F.FORMACIONES[e.formacion] ? F.posHueco(e.formacion, i) : '';
    return `<li${id === e.capitan ? ' class="is-cap"' : ''}><button type="button" data-ficha="${esc(id)}">${pos ? `<small>${pos}</small>` : ''}<span>${esc(j ? j.corto : id)}${id === e.capitan ? ' <i>C</i>' : ''}</span>${p ? `<b class="num">${x ? x.pts : 0}</b>` : ''}</button></li>`;
}).join('');

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
              <ul>${chipsEquipo(f.equipo, ab ? null : F.puntosEquipo(D, f.equipo, f.jornadaEquipo))}</ul>
              ${hist.length ? `<div class="fz-hist">${hist.map(h => `<div><p>Jornada ${h.n}${h.puntos ? ` · <b>${h.puntos.total} pts</b>` : ' · puntos pendientes'}${h.heredado ? ' · mismo equipo' : ''}</p><ul>${chipsEquipo(h.equipo, h.puntos)}</ul></div>`).join('')}</div>` : ''}
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
    const f = e.target.closest('[data-ficha]'); if (f) { e.preventDefault(); abrirFicha(f.dataset.ficha); }
});
$('fz-ficha-x').addEventListener('click', () => ficha.close());
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
    if (!u) { guardado = null; guardadoEn = null; aviso = undefined; estado = F.vacio(); tocado = false; pintarEquipo(); pintarClasificacion(); return; }
    api.aviso(u.id).then(a => { if (usuario === u) { aviso = a ? !!a.activo : null; pintarAviso(); } })
        .catch(() => { if (usuario === u) { aviso = null; pintarAviso(); } });
    if (u.email && ADMINS.includes(u.email.toLowerCase()) && api.activarJornadas) {
        api.activarJornadas().catch(err => console.warn('No se pudieron activar las jornadas:', err?.code || err));
    }
    await cargarMio();
    pintarEquipo();
    pintarClasificacion();
});
