// js/asistencia.js — convocatoria: cada jugador confirma si viene al partido.
// Las respuestas se guardan en Firebase (asistencias/j{n}/respuestas/{jugador})
// y solo los administradores pueden leerlas, desde esta misma página.
import { firebaseConfig } from './firebase-config.js';
import { JORNADAS } from './calendario.js?v=20261029c';

const ADMINS = ['fjimenezsantana1@gmail.com', 'santana282004@gmail.com'];

// Plantilla: id (no cambiar, lo usan las reglas de Firebase), nombre y dorsal habitual
export const PLANTILLA = [
    { id: 'arian-burguillo',        nombre: 'Arian Burguillo',            dorsal: 1 },
    { id: 'alfa-junior-umaro',      nombre: 'Alfa Junior Umaro',          dorsal: 4 },
    { id: 'luis-nunez',             nombre: 'Luis Núñez',                 dorsal: 6 },
    { id: 'esteban-morales',        nombre: 'Esteban Morales',            dorsal: 8 },
    { id: 'jefferson-marte',        nombre: 'Jefferson Marte',            dorsal: 10 },
    { id: 'sebas-rodriguez-yanez',  nombre: 'Sebas Rodriguez Yañez',      dorsal: 11 },
    { id: 'eloy-marte',             nombre: 'Eloy Marte',                 dorsal: 14 },
    { id: 'piero-malasquez',        nombre: 'Piero Malasquez',            dorsal: 16 },
    { id: 'junior-de-jesus',        nombre: 'Junior De Jesus',            dorsal: 22 },
    { id: 'nacho-escalante',        nombre: 'Nacho Escalante',            dorsal: 23 },
    { id: 'fidel-escalante-mateo',  nombre: 'Fidel Escalante Mateo',      dorsal: 25 },
    { id: 'alejandro-cuevas',       nombre: 'Alejandro Cuevas',           dorsal: 90 },
    { id: 'gilbert-natanael-de-jesus', nombre: 'Gilbert Natanael De Jesus', dorsal: 99 }
];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tz = { timeZone: 'Europe/Madrid' };
const fmtDia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', ...tz });
const fmtHora = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', ...tz });
const fmtLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', ...tz });
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Jornada: ?j=3 en el enlace, o la próxima por jugar ---------- */
const jornadas = JORNADAS.map(j => ({ ...j, inicio: new Date(j.fecha) })).sort((a, b) => a.n - b.n);
const pedida = +new URLSearchParams(location.search).get('j');
const J = jornadas.find(j => j.n === pedida)
    || jornadas.find(j => Date.now() < j.inicio.getTime() + 3 * 36e5)
    || jornadas[jornadas.length - 1];
const visitante = J.visitante === 'Tinellers FC';
const cerrada = Date.now() > J.inicio.getTime() + 3 * 36e5;
const rival = visitante ? J.local : J.visitante;

$('cv-j').textContent = `jornada ${J.n}`;
document.title = `Convocatoria jornada ${J.n} · Tinellers FC`;
$('cv-home').textContent = J.local; $('cv-away').textContent = J.visitante;
for (const [lado, escudo] of [['home', J.escudoLocal], ['away', J.escudoVisitante]]) {
    const img = $(`cv-${lado}-crest`);
    if (escudo) img.src = escudo.replace('escudo-tinellers.webp', 'escudo-tinellers-320.webp'); else img.classList.add('hidden');
}
$('cv-when').firstChild.textContent = cap(fmtDia.format(J.inicio)).replace('.', '');
$('cv-hour').textContent = fmtHora.format(J.inicio);
$('cv-venue').textContent = J.campo || '';
if (!visitante) {
    $('kit-title').textContent = 'Equipación habitual';
    $('kit-text').textContent = 'Jugamos en casa: trae la equipación del club.';
    $('kit-check').textContent = 'Llevaré la equipación del club.';
}
const equipacion = visitante ? 'blanca' : 'del club';

/* ---------- Conexión ---------- */
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
    const auth = A.getAuth(app), db = F.getFirestore(app);
    const col = F.collection(db, 'asistencias', 'j' + J.n, 'respuestas');
    let parar = null;
    api = {
        enviar: r => F.setDoc(F.doc(col, r.id), {
            nombre: r.nombre, asiste: r.asiste, dorsal: r.dorsal, motivo: r.motivo,
            jornada: J.n, actualizada: F.serverTimestamp()
        }),
        login: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
        logout: () => A.signOut(auth),
        onUser: cb => A.onAuthStateChanged(auth, cb),
        escuchar: (cb, err) => { parar?.(); parar = F.onSnapshot(col, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), err); },
        dejar: () => { parar?.(); parar = null; }
    };
} else {
    // Sin Firebase (pruebas locales): se guarda en este navegador
    const K = 'tinellers_asistencia_j' + J.n;
    const leer = () => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch { return {}; } };
    let cb = null;
    api = {
        enviar: async r => { const t = leer(); t[r.id] = { ...r, jornada: J.n }; try { localStorage.setItem(K, JSON.stringify(t)); } catch {} cb?.(Object.values(t)); },
        login: async () => { localStorage.setItem(K + '_admin', '1'); location.reload(); },
        logout: async () => { localStorage.removeItem(K + '_admin'); location.reload(); },
        onUser: f => f(localStorage.getItem(K + '_admin') ? { email: ADMINS[0] } : null),
        escuchar: f => { cb = f; f(Object.values(leer())); },
        dejar: () => { cb = null; }
    };
}

function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('is-visible');
    clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('is-visible'), 2600);
}

/* ---------- Formulario ---------- */
let asiste = null;
$('jugador').insertAdjacentHTML('beforeend', PLANTILLA.map(p => `<option value="${p.id}">${esc(p.nombre)} · #${p.dorsal}</option>`).join(''));
try { const g = localStorage.getItem('tinellers_jugador'); if (g && PLANTILLA.some(p => p.id === g)) $('jugador').value = g; } catch {}
const jugador = () => PLANTILLA.find(p => p.id === $('jugador').value);
const ponerDorsal = () => { const p = jugador(); if (p) $('dorsal').value = p.dorsal; };
ponerDorsal();
$('jugador').addEventListener('change', () => { ponerDorsal(); $('cv-error').textContent = ''; });

document.querySelectorAll('.choice .pick-btn').forEach(b => b.addEventListener('click', () => {
    asiste = b.dataset.v === 'si';
    document.querySelectorAll('.choice .pick-btn').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('paso-si').classList.toggle('hidden', !asiste);
    $('paso-no').classList.toggle('hidden', asiste);
    $('cv-error').textContent = '';
    (asiste ? $('dorsal') : $('motivo')).focus({ preventScroll: true });
}));

$('cv-form').addEventListener('submit', async e => {
    e.preventDefault();
    const p = jugador(), err = $('cv-error');
    if (!p) { err.textContent = 'Elige tu nombre.'; $('jugador').focus(); return; }
    if (asiste === null) { err.textContent = 'Dinos si vienes o no.'; return; }
    let dorsal = null, motivo = '';
    if (asiste) {
        dorsal = parseInt($('dorsal').value, 10);
        if (!(dorsal >= 0 && dorsal <= 99)) { err.textContent = 'Pon un dorsal entre 0 y 99.'; $('dorsal').focus(); return; }
        if (!$('kit-ok').checked) { err.textContent = `Confirma que llevarás la equipación ${equipacion}.`; $('kit-ok').focus(); return; }
    } else {
        motivo = $('motivo').value.trim();
        if (motivo.length < 3) { err.textContent = 'Cuéntanos el motivo.'; $('motivo').focus(); return; }
    }
    err.textContent = '';
    const btn = $('cv-send'); btn.disabled = true; btn.textContent = 'Enviando…';
    try {
        await api.enviar({ id: p.id, nombre: p.nombre, asiste, dorsal, motivo });
        try { localStorage.setItem('tinellers_jugador', p.id); } catch {}
        $('cv-done-text').textContent = asiste
            ? `Gracias, ${p.nombre.split(' ')[0]}. Te esperamos el ${fmtLargo.format(J.inicio)} a las ${fmtHora.format(J.inicio)} con el dorsal ${dorsal} y la equipación ${equipacion}.`
            : `Gracias por avisar, ${p.nombre.split(' ')[0]}. Ya sabemos que no puedes venir contra ${rival}.`;
        $('cv-form').classList.add('hidden'); $('cv-done').classList.remove('hidden');
        $('cv-done').scrollIntoView({ block: 'start' });
    } catch (e2) {
        err.textContent = e2?.code === 'permission-denied'
            ? 'No se ha podido guardar: la convocatoria no está abierta. Avisa al delegado.'
            : 'No se ha podido enviar. Revisa tu conexión y vuelve a intentarlo.';
    } finally { btn.disabled = false; btn.textContent = 'Enviar respuesta'; }
});
$('cv-again').addEventListener('click', () => { $('cv-done').classList.add('hidden'); $('cv-form').classList.remove('hidden'); });

if (cerrada) { $('cv-form').classList.add('hidden'); $('cv-closed').classList.remove('hidden'); }

/* ---------- Panel del delegado ---------- */
let respuestas = [];
function pintarAdmin() {
    const por = Object.fromEntries(respuestas.map(r => [r.id, r]));
    const filas = PLANTILLA.map(p => ({ p, r: por[p.id] }));
    const si = filas.filter(f => f.r?.asiste === true), no = filas.filter(f => f.r?.asiste === false), pend = filas.filter(f => !f.r);
    $('n-si').textContent = si.length; $('n-no').textContent = no.length; $('n-pend').textContent = pend.length;
    const orden = [...si, ...no, ...pend];
    $('adm-body').innerHTML = orden.map(({ p, r }) => `<tr>
        <td><strong>${esc(p.nombre)}</strong></td>
        <td class="${r ? (r.asiste ? 'st-si' : 'st-no') : 'st-pend'}">${r ? (r.asiste ? 'Viene' : 'No puede') : 'Sin responder'}</td>
        <td${r?.asiste ? '' : ' class="dash"'}>${r?.asiste ? 'Dorsal ' + esc(r.dorsal) : '–'}</td>
        <td${r && !r.asiste ? '' : ' class="dash"'}>${r && !r.asiste ? esc(r.motivo) : '–'}</td></tr>`).join('');
    pintarAdmin.texto = [
        `*Convocatoria jornada ${J.n}* · ${J.local} – ${J.visitante}`,
        `${cap(fmtLargo.format(J.inicio))}, ${fmtHora.format(J.inicio)} · Equipación ${equipacion}`, '',
        `✅ Vienen (${si.length}):`, ...si.map(f => `#${f.r.dorsal} ${f.p.nombre}`), '',
        `❌ No pueden (${no.length}):`, ...no.map(f => `${f.p.nombre}: ${f.r.motivo}`), '',
        `⏳ Sin responder (${pend.length}):`, ...pend.map(f => f.p.nombre)
    ].join('\n');
}
$('adm-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pintarAdmin.texto || ''); toast('Resumen copiado'); }
    catch { toast('No se pudo copiar'); }
});
$('adm-in').addEventListener('click', () => api.login().catch(() => toast('No se pudo iniciar sesión')));
$('adm-out').addEventListener('click', () => api.logout());
api.onUser(u => {
    const admin = !!u?.email && ADMINS.includes(u.email.toLowerCase());
    $('adm').classList.toggle('hidden', !admin);
    $('cv-admin-link').classList.toggle('hidden', admin);
    if (admin) {
        api.escuchar(l => { respuestas = l; pintarAdmin(); }, () => toast('No se pudieron cargar las respuestas'));
    } else {
        api.dejar();
        if (u) { toast('Esta cuenta no es de delegado'); api.logout(); }
    }
});
