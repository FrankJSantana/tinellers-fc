// js/quiniela.js — quiniela de la jornada 3.
// Con Firebase configurado: inicio de sesión con Google y lista común para todos (Firestore).
// Sin configurar: modo local, cada navegador guarda sus propias apuestas.
import { firebaseConfig } from './firebase-config.js';

const JORNADA = 3;
const KICKOFF = new Date('2026-11-08T19:00:00+01:00');
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
const cerrada = () => Date.now() >= KICKOFF.getTime();
let categoria = 'goles', prediccion = null, apuestas = [], usuario = null;

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
    const col = F.collection(db, 'quinielas', 'j' + JORNADA, 'apuestas');
    api = {
        login: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
        logout: () => A.signOut(auth),
        onUser: cb => A.onAuthStateChanged(auth, u => cb(u && { id: u.uid, nombre: u.displayName || 'Sin nombre', avatar: u.photoURL || '' })),
        onApuestas: (cb, onErr) => F.onSnapshot(col, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr),
        guardar: a => F.setDoc(F.doc(col, usuario.id), { ...a, actualizada: F.serverTimestamp() })
    };
} else {
    const KEY = 'tinellers_apuestas_j' + JORNADA, UKEY = 'tinellers_user';
    const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
    const escribir = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
    const subsU = [], subsA = [];
    api = {
        loginLocal: nombre => { const u = { id: 'local-' + nombre.toLowerCase().replace(/\s+/g, '-'), nombre, avatar: '' }; escribir(UKEY, u); subsU.forEach(f => f(u)); },
        logout: async () => { escribir(UKEY, null); subsU.forEach(f => f(null)); },
        onUser: cb => { subsU.push(cb); cb(leer(UKEY, null)); },
        onApuestas: cb => { subsA.push(cb); cb(leer(KEY, [])); },
        guardar: async a => { const l = leer(KEY, []).filter(x => x.id !== usuario.id); l.push({ id: usuario.id, ...a }); escribir(KEY, l); subsA.forEach(f => f(l)); }
    };
}

/* ================= Interfaz ================= */
function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('is-visible');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('is-visible'), 2400);
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
    $('apuestas-vacio').classList.toggle('hidden', lista.length > 0);
}
function pintarSesion() {
    const u = usuario;
    $('auth-logged-out').classList.toggle('hidden', !!u);
    $('auth-logged-in').classList.toggle('hidden', !u);
    $('apuesta-section').classList.toggle('hidden', !u);
    if (!u) return;
    $('user-name').textContent = u.nombre;
    $('user-initial').textContent = (u.nombre || '?')[0].toUpperCase();
    $('user-avatar').classList.toggle('hidden', !u.avatar);
    $('user-initial').classList.toggle('hidden', !!u.avatar);
    if (u.avatar) $('user-avatar').src = u.avatar;

    const mia = apuestas.find(a => a.id === u.id);
    const boton = $('apuesta-form').querySelector('button[type=submit]');
    boton.disabled = cerrada();
    $('submit-label').textContent = cerrada() ? 'Apuestas cerradas' : (mia ? 'Actualizar apuesta' : 'Guardar apuesta');
    $('apuesta-estado').textContent = cerrada()
        ? 'El partido ya ha empezado: las apuestas están cerradas.'
        : mia ? `Tu apuesta actual: ${mia.jugador} · ${CATEGORIAS[mia.categoria]?.label} · ${mia.prediccion}`
              : 'Elige jugador, qué va a pasar y cuánto.';
    if (mia && !pintarSesion.cargada) {
        pintarSesion.cargada = true;
        $('jugador').value = mia.jugador; categoria = mia.categoria; prediccion = mia.prediccion;
        pintarCategorias(); pintarOpciones();
    }
}

/* ================= Arranque ================= */
$('jugador').innerHTML = '<option value="">Elige un jugador…</option>' + JUGADORES.map(j => `<option>${j}</option>`).join('');
pintarCategorias(); pintarOpciones();

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
$('logout-btn').addEventListener('click', () => { pintarSesion.cargada = false; api.logout(); });

$('categorias').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    categoria = b.dataset.cat; prediccion = null; pintarCategorias(); pintarOpciones();
});
$('opciones').addEventListener('click', e => {
    const b = e.target.closest('[data-op]'); if (!b) return;
    prediccion = b.dataset.op; $('form-error').textContent = ''; pintarOpciones();
});
$('apuesta-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!usuario || cerrada()) return;
    const jugador = $('jugador').value;
    if (!jugador) { $('form-error').textContent = 'Elige un jugador.'; $('jugador').focus(); return; }
    if (!prediccion) { $('form-error').textContent = 'Elige tu predicción.'; return; }
    $('form-error').textContent = '';
    const boton = e.submitter; if (boton) boton.disabled = true;
    try {
        await api.guardar({ nombre: usuario.nombre, avatar: usuario.avatar, jugador, categoria, prediccion, jornada: JORNADA });
        toast('Apuesta guardada');
    } catch {
        $('form-error').textContent = 'No se pudo guardar la apuesta. Revisa tu conexión e inténtalo otra vez.';
    } finally { if (boton) boton.disabled = cerrada(); }
});

api.onUser(u => { usuario = u; pintarSesion(); });
api.onApuestas(l => { apuestas = l; pintarTabla(); pintarSesion(); },
    () => { $('apuestas-vacio').textContent = 'No se pudieron cargar las apuestas.'; $('apuestas-vacio').classList.remove('hidden'); });
