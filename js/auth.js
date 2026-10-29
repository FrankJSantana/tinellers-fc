// js/auth.js — sesión (Google Identity Services o modo local)
const GOOGLE_CLIENT_ID = "887592901699-eluigf4rr2eso21tbn960e9kgtqngd4l.apps.googleusercontent.com";
const USER_KEY = 'tinellers_user';

function getUsuario() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}
function setUsuario(u) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch { }
    document.dispatchEvent(new CustomEvent('tinellers:auth', { detail: u }));
}
function cerrarSesion() {
    try { localStorage.removeItem(USER_KEY); } catch { }
    document.dispatchEvent(new CustomEvent('tinellers:auth', { detail: null }));
}

function parseJwt(token) {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
}

function handleCredentialResponse(response) {
    const p = parseJwt(response.credential);
    // En producción: POST /api/auth/google con response.credential para validar el token en el servidor.
    setUsuario({ nombre: p.name, email: p.email, avatar: p.picture });
}

function iniciarLogin() {
    const googleListo = !GOOGLE_CLIENT_ID.startsWith('TU_CLIENT_ID') && window.google && google.accounts;
    if (googleListo) {
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredentialResponse });
        google.accounts.id.renderButton(document.getElementById('buttonDiv'), { theme: 'outline', size: 'large' });
    } else {
        document.getElementById('local-login').classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('local-login');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const nombre = document.getElementById('local-name').value.trim();
        if (!nombre) { document.getElementById('local-name').focus(); return; }
        setUsuario({ nombre, email: nombre.toLowerCase().replace(/\s+/g, '.') + '@local', avatar: '' });
    });
    document.getElementById('logout-btn').addEventListener('click', cerrarSesion);
    // El SDK de Google carga con async: esperamos a window.load
    if (document.readyState === 'complete') iniciarLogin();
    else window.addEventListener('load', iniciarLogin);
});
