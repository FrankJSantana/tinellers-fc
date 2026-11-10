// js/fantasy-logica.js — reglas del Fantasy Tinellers, sin pantalla ni base de datos.
// Los datos de cada jugador (media, nota, goles, asistencias y MVP de cada jornada)
// salen de js/jugadores-datos.js; aquí solo se decide cuánto vale cada uno y cuánto puntúa.

export const PRESUPUESTO = 47;             // millones ficticios para los 5 jugadores
export const PRIMERA_JORNADA = 4;          // el fantasy empieza a contar en esta jornada
export const TAMANO = 5;                   // 1 portero + 4 jugadores de campo

// Los dos que más marcan valen 15 M: con uno de ellos te caben los demás que quieras,
// con los dos no llegas a completar el equipo.
export const ESTRELLAS = { 'alejandro-cuevas': 15, 'alfa-junior-umaro': 15 };
// El resto cuesta su media redondeada, entre 6 y 9 M. Quien aún no tiene media empieza en 6.
export const PRECIO_MIN = 6;
export const PRECIO_MAX = 9;
export const PRECIO_NUEVO = 6;

// Puntos de un jugador en una jornada: su nota (redondeada) + 3 por gol + 2 por asistencia
// + 5 si es MVP. Si no juega, 0. El capitán puntúa doble.
export const PUNTOS = { gol: 3, asistencia: 2, mvp: 5, capitan: 2 };

// Nombre corto para el campo (si no está aquí, el primer nombre)
export const CORTOS = { 'alejandro-cuevas': 'Jandro' };

// Posición de cada hueco en el campo, en % (x, y). El hueco 0 es siempre el portero.
export const FORMACIONES = {
    '2-2':   [[50, 87], [27, 63], [73, 63], [30, 31], [70, 31]],
    '3-1':   [[50, 87], [17, 60], [50, 64], [83, 60], [50, 29]],
    '1-2-1': [[50, 87], [50, 67], [19, 47], [81, 47], [50, 25]]
};
export const FORMACION_INICIAL = '2-2';

const redondear = n => Math.round(n);

export function precioDe(j) {
    if (ESTRELLAS[j.id]) return ESTRELLAS[j.id];
    const base = typeof j.media === 'number' ? redondear(j.media) : PRECIO_NUEVO;
    return Math.min(PRECIO_MAX, Math.max(PRECIO_MIN, base));
}

// Plantilla del fantasy a partir de window.TINELLERS
export function plantilla(D) {
    return (D?.JUGADORES || []).map(j => ({
        id: j.id,
        nombre: j.nombre,
        corto: CORTOS[j.id] || j.nombre.split(' ')[0],
        dorsal: j.dorsal,
        portero: !!j.portero,
        media: typeof j.media === 'number' ? j.media : null,
        precio: precioDe(j),
        estrella: !!ESTRELLAS[j.id]
    })).sort((a, b) => b.precio - a.precio || (b.media ?? 0) - (a.media ?? 0) || a.nombre.localeCompare(b.nombre, 'es'));
}

export const jornadaPuntuada = (D, n) => !!D?.PARTIDOS?.[n];

// Puntos de un jugador en la jornada n; null si esa jornada aún no tiene datos.
// Si jugó pero su nota aún no está, suma goles, asistencias y MVP; la nota se añade cuando llegue.
export function puntosJugador(D, id, n) {
    if (!jornadaPuntuada(D, n)) return null;
    const r = (D.JUGADORES || []).find(j => j.id === id)?.jornadas?.[n];
    if (!r || r.estado) return 0;
    const nota = typeof r.nota === 'number' ? redondear(r.nota) : 0;
    return nota + PUNTOS.gol * (r.goles || 0) + PUNTOS.asistencia * (r.asistencias || 0) + (r.mvp ? PUNTOS.mvp : 0);
}

// Puntos de un equipo guardado ({ jugadores, capitan }) en la jornada n; null si aún no hay datos
export function puntosEquipo(D, equipo, n) {
    if (!equipo || !jornadaPuntuada(D, n)) return null;
    const detalle = (equipo.jugadores || []).map(id => {
        const base = puntosJugador(D, id, n) ?? 0;
        const capitan = id === equipo.capitan;
        return { id, base, capitan, pts: capitan ? base * PUNTOS.capitan : base };
    });
    return { total: detalle.reduce((s, x) => s + x.pts, 0), detalle };
}

/* ---------- Construcción del equipo ---------- */
export const vacio = () => ({ formacion: FORMACION_INICIAL, slots: Array(TAMANO).fill(null), capitan: null });

export const coste = (slots, porId) => slots.reduce((s, id) => s + (id ? porId[id]?.precio || 0 : 0), 0);
const encaja = (j, slot) => (slot === 0 ? j.portero : !j.portero);

// Lo mínimo que cuesta rellenar los huecos libres con jugadores que no estén ya en el equipo
function minimoParaCompletar(slots, porId) {
    const libres = new Set(Object.keys(porId).filter(id => !slots.includes(id)));
    const baratos = cond => [...libres].map(id => porId[id]).filter(cond).sort((a, b) => a.precio - b.precio);
    let total = 0;
    if (!slots[0]) {
        const p = baratos(j => j.portero)[0];
        if (!p) return Infinity;
        total += p.precio;
    }
    const huecos = slots.slice(1).filter(x => !x).length;
    const campo = baratos(j => !j.portero);
    if (campo.length < huecos) return Infinity;
    return total + campo.slice(0, huecos).reduce((s, j) => s + j.precio, 0);
}

// ¿Se puede poner al jugador `id` en el hueco `slot`? Si ya está en otro hueco del mismo tipo, se intercambian.
// Devuelve { ok, slots, motivo }.
export function colocar(estado, slot, id, porId) {
    const j = porId[id];
    if (!j) return { ok: false, motivo: 'Jugador desconocido' };
    if (!encaja(j, slot)) return { ok: false, motivo: slot === 0 ? 'Este hueco es para el portero' : 'El portero va en la portería' };
    const slots = estado.slots.slice();
    const donde = slots.indexOf(id);
    if (donde === slot) return { ok: false, motivo: 'Ya está en este puesto' };
    if (donde >= 0) {                      // mover dentro del equipo: no cambia el coste
        slots[donde] = slots[slot];
        slots[slot] = id;
        return { ok: true, slots };
    }
    slots[slot] = id;
    const otraEstrella = j.estrella && slots.some(x => x && x !== id && porId[x]?.estrella);
    const gasto = coste(slots, porId);
    if (gasto + minimoParaCompletar(slots, porId) > PRESUPUESTO) {
        const queda = PRESUPUESTO - coste(estado.slots.map((x, i) => (i === slot ? null : x)), porId);
        return {
            ok: false,
            motivo: otraEstrella ? 'Jandro y Alfa no caben juntos en el presupuesto'
                : gasto > PRESUPUESTO ? `No te llega: te quedan ${queda} M`
                : 'Con él no te llegaría para completar el equipo'
        };
    }
    return { ok: true, slots };
}

// Primer hueco libre donde encaja el jugador (o -1)
export const huecoLibre = (estado, j) =>
    j.portero ? (estado.slots[0] ? -1 : 0) : estado.slots.findIndex((x, i) => i > 0 && !x);

// Problemas que impiden guardar (lista vacía = equipo válido)
export function problemas(estado, porId) {
    const p = [];
    const faltan = estado.slots.filter(x => !x).length;
    if (faltan) p.push(faltan === 1 ? 'Falta 1 jugador' : `Faltan ${faltan} jugadores`);
    if (estado.slots[0] && !porId[estado.slots[0]]?.portero) p.push('El primer puesto es para el portero');
    if (estado.slots.some((x, i) => i > 0 && x && porId[x]?.portero)) p.push('El portero tiene que ir en la portería');
    if (new Set(estado.slots.filter(Boolean)).size !== estado.slots.filter(Boolean).length) p.push('Hay un jugador repetido');
    if (estado.slots.some(x => x && !porId[x])) p.push('Hay un jugador que ya no está en la plantilla');
    if (Object.keys(ESTRELLAS).every(id => estado.slots.includes(id))) p.push('Jandro y Alfa no pueden ir juntos');
    if (!faltan && coste(estado.slots, porId) > PRESUPUESTO) p.push(`Te pasas del presupuesto (${coste(estado.slots, porId)} de ${PRESUPUESTO} M)`);
    if (!faltan && !estado.slots.includes(estado.capitan)) p.push('Elige capitán');
    if (!FORMACIONES[estado.formacion]) p.push('Elige una formación');
    return p;
}

// Capitán por defecto al completar el equipo: el más caro
export const capitanPorDefecto = (slots, porId) =>
    slots.filter(Boolean).slice().sort((a, b) => (porId[b]?.precio || 0) - (porId[a]?.precio || 0))[0] || null;

/* ---------- Clasificación ---------- */
// equipos: { [jornada]: { [uid]: { nombre, avatar, jugadores, capitan, formacion, jornada } } } de las jornadas cerradas.
// Si alguien no cambia su equipo, juega con el último que guardó.
export function equipoEnJornada(equipos, uid, n) {
    for (let k = n; k >= PRIMERA_JORNADA; k--) if (equipos[k]?.[uid]) return equipos[k][uid];
    return null;
}

export function clasificacion(D, equipos, cerradas) {
    const js = cerradas.slice().sort((a, b) => a - b);
    const uids = new Set(js.flatMap(n => Object.keys(equipos[n] || {})));
    const puntuadas = js.filter(n => jornadaPuntuada(D, n));
    const ultima = puntuadas[puntuadas.length - 1] ?? null;
    const filas = [...uids].map(uid => {
        let total = 0, nombre = '', avatar = '';
        const porJornada = {};
        for (const n of js) {
            const e = equipoEnJornada(equipos, uid, n);
            if (!e) continue;
            nombre = e.nombre || nombre; avatar = e.avatar || avatar;
            const p = puntosEquipo(D, e, n);
            porJornada[n] = p ? p.total : null;
            if (p) total += p.total;
        }
        const ultimaCerrada = js[js.length - 1];
        return {
            uid, nombre: nombre || 'Sin nombre', avatar, total, porJornada,
            ultima: ultima != null ? (porJornada[ultima] ?? 0) : null,
            equipo: equipoEnJornada(equipos, uid, ultimaCerrada),
            jornadaEquipo: ultimaCerrada
        };
    });
    filas.sort((a, b) => b.total - a.total || (b.ultima ?? 0) - (a.ultima ?? 0) || a.nombre.localeCompare(b.nombre, 'es'));
    filas.forEach((f, i) => {
        const prev = filas[i - 1];
        f.pos = prev && prev.total === f.total && (prev.ultima ?? 0) === (f.ultima ?? 0) ? prev.pos : i + 1;
    });
    return { filas, ultima };
}
