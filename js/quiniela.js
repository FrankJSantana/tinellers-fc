// js/quiniela.js — quiniela por jornadas.
// Cada jornada tiene su propia lista de apuestas y se cierra HORAS_CIERRE antes del partido.
// Con Firebase configurado la lista es común para todos; sin configurar, modo local.
import { firebaseConfig } from './firebase-config.js';
import { JORNADAS, HORAS_CIERRE } from './calendario.js?v=20261029c';

// Correos que pueden activar jornadas en la base de datos (deben coincidir con firestore.rules)
const ADMINS = ['fjimenezsantana1@gmail.com', 'santana282004@gmail.com'];

const JUGADORES = [
    '#1 Arian Burguillo', '#4 Alfa Junior Umaro', '#6 Luis Núñez', '#8 Esteban Morales',
    '#10 Jefferson Marte', '#11 Sebas Rodriguez', '#14 Eloy Marte', '#16 Piero Malasquez',
    '#22 Junior De Jesus', '#23 Nacho Escalante', '#25 Fidel Escalante', '#90 Alejandro Cuevas'
];
const CATEGORIAS = {
    goles:       { label: 'Goles',       titulo: '¿Cuántos goles marca?',    opciones: ['0', '1', '2', '3+'] },
    asistencias: { label: 'Asistencias', titulo: '¿Cuántas asistencias da?', opciones: ['0', '1', '2', '3+'] },
    tarjetas:    { label: 'Tarjetas',    titulo: '¿Qué tarjeta ve?',         opciones: ['Ninguna', 'Amarilla', 'Doble amarilla', 'Roja'] }
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDia = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });
const fmtHora = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
const fmtCierre = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

/* ---------- Jornadas ---------- */
const jornadas = JORNADAS
    .map(j => { const inicio = new Date(j.fecha); return { ...j, inicio, cierre: new Date(inicio.getTime() - HORAS_CIERRE * 36e5) }; })
    .filter(j => !isNaN(j.inicio))
    .sort((a, b) => a.n - b.n);
const abierta = j => Date.now() < j.cierre.getTime();
// La página muestra solo la jornada en curso: la primera cuyo partido no ha terminado.
// Tras el cierre (24 h antes) sigue visible, cerrada, con su tabla de apuestas hasta el final del partido.
const HORAS_PARTIDO = 3;
const terminada = j => Date.now() > j.inicio.getTime() + HORAS_PARTIDO * 36e5;
const porDefecto = () => jornadas.find(j => !terminada(j)) || jornadas[jornadas.length - 1];

let actual = porDefecto();
let categoria = 'goles', prediccion = null, apuestas = [], usuario = null, cargada = false;

/* ================= Conexión: Firebase o modo local ================= */
const conFirebase = !!firebaseConfig?.apiKey && !firebaseConfig.apiKey.startsWith('PEGA');
let api;

if (conFirebase) {
    const V = '10.12.2';
    const [{ initializeApp }, A, F] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
    ]);
    const app = initializeApp(firebaseConfig);
    const auth = A.getAuth(app);
    const db = F.getFirestore(app);
    const col = n => F.collection(db, 'quinielas', 'j' + n, 'apuestas');
    let parar = null;
    api = {
        login: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
        logout: () => A.signOut(auth),
        onUser: cb => A.onAuthStateChanged(auth, u => cb(u && { id: u.uid, nombre: u.displayName || 'Sin nombre', avatar: u.photoURL || '', email: u.email || '' })),
        onApuestas: (n, cb, onErr) => {
            if (parar) parar();
            parar = F.onSnapshot(col(n), snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr);
        },
        guardar: (n, a) => F.setDoc(F.doc(col(n), usuario.id), { ...a, actualizada: F.serverTimestamp() }),
        // El administrador deja registrada en la base de datos la hora de cierre de cada jornada;
        // las reglas de Firestore la usan para rechazar apuestas fuera de plazo.
        activarJornadas: () => Promise.all(jornadas.map(j => F.setDoc(F.doc(db, 'quinielas', 'j' + j.n), {
            n: j.n, partido: `${j.local} - ${j.visitante}`,
            inicio: F.Timestamp.fromDate(j.inicio), cierre: F.Timestamp.fromDate(j.cierre)
        }, { merge: true })))
    };
} else {
    const KEY = n => 'tinellers_apuestas_j' + n, UKEY = 'tinellers_user';
    const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
    const escribir = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
    const subsU = []; let subA = null, nA = null;
    api = {
        loginLocal: nombre => { const u = { id: 'local-' + nombre.toLowerCase().replace(/\s+/g, '-'), nombre, avatar: '' }; escribir(UKEY, u); subsU.forEach(f => f(u)); },
        logout: async () => { escribir(UKEY, null); subsU.forEach(f => f(null)); },
        onUser: cb => { subsU.push(cb); cb(leer(UKEY, null)); },
        onApuestas: (n, cb) => { subA = cb; nA = n; cb(leer(KEY(n), [])); },
        guardar: async (n, a) => { const l = leer(KEY(n), []).filter(x => x.id !== usuario.id); l.push({ id: usuario.id, ...a }); escribir(KEY(n), l); if (nA === n) subA(l); }
    };
}

/* ================= Interfaz ================= */
function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('is-visible');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-visible'), 2400);
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function pintarJornadas() {
    $('jornadas').innerHTML = jornadas.map(j => {
        const ab = abierta(j);
        return `<button type="button" role="tab" data-j="${j.n}" aria-selected="${j === actual}" aria-pressed="${j === actual}"
            aria-label="Jornada ${j.n}, ${j.local} contra ${j.visitante}, ${ab ? 'abierta' : 'cerrada'}"
            class="pick-btn${ab ? '' : ' is-closed'}">J${j.n}<small>${ab ? 'Abierta' : 'Cerrada'}</small></button>`;
    }).join('');
    $('jornadas').classList.add('hidden');
}

function pintarPartido() {
    const j = actual; if (!j) return;
    $('q-meta').textContent = `Jornada ${j.n} · Liga municipal de fútbol 7`;
    $('q-home-name').textContent = j.local;
    $('q-away-name').textContent = j.visitante;
    for (const [lado, nombre, escudo] of [['home', j.local, j.escudoLocal], ['away', j.visitante, j.escudoVisitante]]) {
        const img = $(`q-${lado}-crest`);
        img.classList.toggle('hidden', !escudo);
        if (escudo) { img.src = escudo; img.alt = `Escudo de ${nombre}`; }
    }
    $('q-date').textContent = cap(fmtDia.format(j.inicio));
    $('q-time').textContent = fmtHora.format(j.inicio);
    $('q-venue').textContent = j.campo || '';
    $('lista-jornada').textContent = `· Jornada ${j.n}`;
    const info = $('cierre-info');
    info.classList.toggle('is-closed', !abierta(j));
    info.textContent = abierta(j)
        ? `Jornada ${j.n}: puedes apostar hasta el ${fmtCierre.format(j.cierre)} (24 horas antes del partido).`
        : `Jornada ${j.n}: apuestas cerradas desde el ${fmtCierre.format(j.cierre)}.`;
    tick();
}

function tick() {
    const j = actual; if (!j) return;
    const siguiente = porDefecto();
    if (siguiente !== j) { cambiarJornada(siguiente); return; }
    const box = $('q-count'), diff = j.cierre.getTime() - Date.now();
    $('q-count-label').textContent = diff > 0 ? 'Cierre de apuestas en' : 'Apuestas cerradas';
    box.classList.toggle('hidden', diff <= 0);
    if (diff > 0) {
        const v = { d: Math.floor(diff / 864e5), h: Math.floor(diff % 864e5 / 36e5), m: Math.floor(diff % 36e5 / 6e4), s: Math.floor(diff % 6e4 / 1e3) };
        box.querySelectorAll('[data-u]').forEach(b => { b.textContent = v[b.dataset.u]; });
    } else if (box.dataset.estado !== 'cerrada') {
        box.dataset.estado = 'cerrada'; pintarPartido(); pintarSesion(); pintarTabla();
    }
}

function pintarCategorias() {
    $('categorias').innerHTML = Object.entries(CATEGORIAS).map(([k, c]) =>
        `<button type="button" data-cat="${k}" aria-pressed="${k === categoria}" class="pick-btn">${c.label}</button>`).join('');
}
function pintarOpciones() {
    const c = CATEGORIAS[categoria];
    $('prediccion-titulo').textContent = c.titulo;
    if (!c.opciones.includes(prediccion)) prediccion = null;
    $('opciones').innerHTML = c.opciones.map(o =>
        `<button type="button" data-op="${o}" aria-pressed="${o === prediccion}" class="pick-btn">${o}</button>`).join('');
}
function pintarTabla() {
    const lista = [...apuestas].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    $('apuestas-body').innerHTML = lista.map(a => `
        <tr>
            <td class="player">${esc(a.nombre)}</td>
            <td>${esc(a.jugador)}</td>
            <td>${esc(CATEGORIAS[a.categoria]?.label ?? a.categoria)}</td>
            <td class="hi">${esc(a.prediccion)}</td>
        </tr>`).join('');
    $('apuestas-count').textContent = `${lista.length} ${lista.length === 1 ? 'apuesta' : 'apuestas'}`;
    $('apuestas-vacio').textContent = abierta(actual) ? 'Todavía no hay apuestas. ¡Sé el primero!' : 'Nadie apostó en esta jornada.';
    $('apuestas-vacio').classList.toggle('hidden', lista.length > 0);
}
function pintarSesion() {
    const u = usuario, j = actual;
    $('auth-logged-out').classList.toggle('hidden', !!u);
    $('auth-logged-in').classList.toggle('hidden', !u);
    $('apuesta-section').classList.toggle('hidden', !u);
    if (!u || !j) return;
    $('user-name').textContent = u.nombre;
    $('user-initial').textContent = (u.nombre || '?')[0].toUpperCase();
    $('user-avatar').classList.toggle('hidden', !u.avatar);
    $('user-initial').classList.toggle('hidden', !!u.avatar);
    if (u.avatar) $('user-avatar').src = u.avatar;

    const mia = apuestas.find(a => a.id === u.id);
    const ab = abierta(j);
    const boton = $('apuesta-form').querySelector('button[type=submit]');
    boton.disabled = !ab;
    $('apuesta-form').querySelectorAll('select, .pick-btn').forEach(el => { el.disabled = !ab; });
    $('h-bet').textContent = `Tu apuesta · Jornada ${j.n}`;
    $('submit-label').textContent = !ab ? 'Apuestas cerradas' : (mia ? 'Actualizar apuesta' : 'Guardar apuesta');
    $('apuesta-estado').textContent = !ab
        ? (mia ? `Apuestas cerradas. Tu apuesta: ${mia.jugador} · ${CATEGORIAS[mia.categoria]?.label} · ${mia.prediccion}` : 'Apuestas cerradas: esta jornada ya no admite apuestas.')
        : (mia ? `Tu apuesta actual: ${mia.jugador} · ${CATEGORIAS[mia.categoria]?.label} · ${mia.prediccion}` : 'Elige jugador, qué va a pasar y cuánto.');
    if (mia && !cargada) {
        cargada = true;
        $('jugador').value = mia.jugador; categoria = mia.categoria; prediccion = mia.prediccion;
        pintarCategorias(); pintarOpciones(); pintarSesion();
    }
}

function cambiarJornada(j) {
    actual = j; cargada = false; apuestas = []; prediccion = null; categoria = 'goles';
    $('jugador').value = ''; $('form-error').textContent = ''; delete $('q-count').dataset.estado;
    pintarCategorias(); pintarOpciones(); pintarJornadas(); pintarPartido(); pintarTabla(); pintarSesion();
    api.onApuestas(j.n, l => { apuestas = l; pintarTabla(); pintarSesion(); },
        () => { $('apuestas-vacio').textContent = 'No se pudieron cargar las apuestas.'; $('apuestas-vacio').classList.remove('hidden'); });
}

/* ================= Arranque ================= */
$('jugador').innerHTML = '<option value="">Elige un jugador…</option>' + JUGADORES.map(j => `<option>${j}</option>`).join('');

if (!actual) {
    $('cierre-info').textContent = 'No hay ninguna jornada programada todavía.';
} else {
    if (conFirebase) {
        $('buttonDiv').innerHTML = '<button type="button" id="google-btn" class="btn btn--white" style="width:100%">Entrar con Google</button>';
        $('google-btn').addEventListener('click', async () => {
            try { await api.login(); }
            catch (e) { if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') toast('No se pudo iniciar sesión. Inténtalo de nuevo.'); }
        });
    } else {
        $('local-login').classList.remove('hidden');
        $('local-login').addEventListener('submit', e => {
            e.preventDefault();
            const nombre = $('local-name').value.trim();
            if (!nombre) { $('local-name').focus(); return; }
            api.loginLocal(nombre);
        });
    }
    $('logout-btn').addEventListener('click', () => { cargada = false; api.logout(); });

    $('jornadas').addEventListener('click', e => {
        const b = e.target.closest('[data-j]'); if (!b) return;
        const j = jornadas.find(x => x.n === +b.dataset.j); if (j && j !== actual) cambiarJornada(j);
    });
    $('categorias').addEventListener('click', e => {
        const b = e.target.closest('[data-cat]'); if (!b || b.disabled) return;
        categoria = b.dataset.cat; prediccion = null; pintarCategorias(); pintarOpciones(); pintarSesion();
    });
    $('opciones').addEventListener('click', e => {
        const b = e.target.closest('[data-op]'); if (!b || b.disabled) return;
        prediccion = b.dataset.op; $('form-error').textContent = ''; pintarOpciones(); pintarSesion();
    });
    $('apuesta-form').addEventListener('submit', async e => {
        e.preventDefault();
        const j = actual;
        if (!usuario || !abierta(j)) return;
        const jugador = $('jugador').value;
        if (!jugador) { $('form-error').textContent = 'Elige un jugador.'; $('jugador').focus(); return; }
        if (!prediccion) { $('form-error').textContent = 'Elige tu predicción.'; return; }
        $('form-error').textContent = '';
        const boton = e.submitter; if (boton) boton.disabled = true;
        try {
            await api.guardar(j.n, { nombre: usuario.nombre, avatar: usuario.avatar, jugador, categoria, prediccion, jornada: j.n });
            toast(`Apuesta de la jornada ${j.n} guardada`);
        } catch (err) {
            $('form-error').textContent = err?.code === 'permission-denied'
                ? (abierta(j) ? 'Esta jornada aún no está activada. El administrador tiene que entrar en la quiniela para abrirla.' : 'Las apuestas de esta jornada ya están cerradas.')
                : 'No se pudo guardar la apuesta. Revisa tu conexión e inténtalo otra vez.';
        } finally { if (boton) boton.disabled = !abierta(j); }
    });

    api.onUser(u => {
        usuario = u; cargada = false; pintarSesion();
        if (u?.email && ADMINS.includes(u.email.toLowerCase()) && api.activarJornadas) {
            api.activarJornadas().catch(err => console.warn('No se pudieron activar las jornadas:', err?.code || err));
        }
    });
    cambiarJornada(actual);
    setInterval(tick, 1000);
}
