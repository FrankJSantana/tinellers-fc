// js/apuestas.js — quiniela de la Jornada 3
const JORNADA = 3;
const API = 'http://localhost:3000/api';
const STORE_KEY = 'tinellers_apuestas_j' + JORNADA;

const JUGADORES = [
    '#1 Arian Burguillo', '#4 Alfa Junior Umaro', '#6 Luis Núñez', '#8 Esteban Morales',
    '#10 Jefferson Marte', '#11 Sebas Rodriguez', '#14 Eloy Marte', '#16 Piero Malasquez',
    '#22 Junior De Jesus', '#23 Nacho Escalante', '#25 Fidel Escalante', '#90 Alejandro Cuevas'
];
const CATEGORIAS = {
    goles:       { label: 'Goles',       titulo: '¿Cuántos goles marca?',     opciones: ['0', '1', '2', '3+'] },
    asistencias: { label: 'Asistencias', titulo: '¿Cuántas asistencias da?',  opciones: ['0', '1', '2', '3+'] },
    tarjetas:    { label: 'Tarjetas',    titulo: '¿Qué tarjeta ve?',          opciones: ['Ninguna', 'Amarilla', 'Doble amarilla', 'Roja'] }
};

const $ = id => document.getElementById(id);
let categoria = 'goles';
let prediccion = null;
let apuestas = [];

/* ---------- Persistencia: API si responde, localStorage si no ---------- */
function leerLocal() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
function guardarLocal(a) { try { localStorage.setItem(STORE_KEY, JSON.stringify(a)); } catch {} }

async function cargarApuestas() {
    try {
        const r = await fetch(`${API}/apuestas/jornada/${JORNADA}`, { signal: AbortSignal.timeout(1500) });
        if (r.ok) return await r.json();
    } catch {}
    return leerLocal();
}
async function enviarApuesta(a) {
    apuestas = [...apuestas.filter(x => x.email !== a.email), a];   // una apuesta por persona
    guardarLocal(apuestas);
    try {
        await fetch(`${API}/apuestas`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(a), signal: AbortSignal.timeout(1500)
        });
    } catch {}
}

/* ---------- UI ---------- */
function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('is-visible'), 2200);
}

function pintarCategorias() {
    $('categorias').innerHTML = Object.entries(CATEGORIAS).map(([k, c]) => `
        <button type="button" data-cat="${k}" aria-pressed="${k === categoria}" class="pick-btn">${c.label}</button>`).join('');
}

function actualizarOpcionesPrediccion() {
    const c = CATEGORIAS[categoria];
    $('prediccion-titulo').textContent = c.titulo;
    if (!c.opciones.includes(prediccion)) prediccion = null;
    $('opciones').innerHTML = c.opciones.map(o => `
        <button type="button" data-op="${o}" aria-pressed="${o === prediccion}" class="pick-btn">${o}</button>`).join('');
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function pintarTabla() {
    $('apuestas-body').innerHTML = apuestas.map(a => `
        <tr>
            <td class="player">${esc(a.nombre)}</td>
            <td>${esc(a.jugador)}</td>
            <td>${esc(CATEGORIAS[a.categoria]?.label ?? a.categoria)}</td>
            <td class="hi">${esc(a.prediccion)}</td>
        </tr>`).join('');
    $('apuestas-count').textContent = `${apuestas.length} ${apuestas.length === 1 ? 'apuesta' : 'apuestas'}`;
    $('apuestas-vacio').classList.toggle('hidden', apuestas.length > 0);
}

function pintarSesion(u) {
    $('auth-logged-out').classList.toggle('hidden', !!u);
    $('auth-logged-in').classList.toggle('hidden', !u);
    $('apuesta-section').classList.toggle('hidden', !u);
    if (!u) return;
    $('user-name').textContent = u.nombre;
    $('user-initial').textContent = (u.nombre || '?')[0].toUpperCase();
    const img = $('user-avatar');
    img.classList.toggle('hidden', !u.avatar);
    $('user-initial').classList.toggle('hidden', !!u.avatar);
    if (u.avatar) img.src = u.avatar;

    const mia = apuestas.find(a => a.email === u.email);
    $('submit-label').textContent = mia ? 'Actualizar apuesta' : 'Guardar apuesta';
    $('apuesta-estado').textContent = mia
        ? `Tu apuesta actual: ${mia.jugador} · ${CATEGORIAS[mia.categoria].label} · ${mia.prediccion}`
        : 'Elige jugador, qué va a pasar y cuánto.';
    if (mia) { $('jugador').value = mia.jugador; categoria = mia.categoria; prediccion = mia.prediccion; pintarCategorias(); actualizarOpcionesPrediccion(); }
}

document.addEventListener('DOMContentLoaded', async () => {
    $('jugador').innerHTML = '<option value="">Elige un jugador…</option>' + JUGADORES.map(j => `<option>${j}</option>`).join('');
    pintarCategorias();
    actualizarOpcionesPrediccion();

    $('categorias').addEventListener('click', e => {
        const b = e.target.closest('[data-cat]'); if (!b) return;
        categoria = b.dataset.cat; prediccion = null;
        pintarCategorias(); actualizarOpcionesPrediccion();
    });
    $('opciones').addEventListener('click', e => {
        const b = e.target.closest('[data-op]'); if (!b) return;
        prediccion = b.dataset.op; $('form-error').textContent = '';
        actualizarOpcionesPrediccion();
    });

    $('apuesta-form').addEventListener('submit', async e => {
        e.preventDefault();
        const u = getUsuario(); if (!u) return;
        const jugador = $('jugador').value;
        if (!jugador) { $('form-error').textContent = 'Elige un jugador.'; $('jugador').focus(); return; }
        if (!prediccion) { $('form-error').textContent = 'Elige tu predicción.'; return; }
        $('form-error').textContent = '';
        await enviarApuesta({ email: u.email, nombre: u.nombre, jugador, categoria, prediccion, jornada: JORNADA });
        pintarTabla(); pintarSesion(u);
        toast('Apuesta guardada');
    });

    document.addEventListener('tinellers:auth', e => pintarSesion(e.detail));
    apuestas = await cargarApuestas();
    pintarTabla();
    pintarSesion(getUsuario());
});
