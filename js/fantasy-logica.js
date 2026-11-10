// js/fantasy-logica.js — reglas del Fantasy Tinellers, sin pantalla ni base de datos.
// Los datos de cada jugador (media, titular, goles, asistencias, tiros y MVP de cada jornada)
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

// Puntos por jornada (si no juega, 0). Lo que vale cada acción depende de la posición en la que
// está alineado: el portero y el central puntúan como defensas.
//   Titular +1 · MVP +5
//   Gol: defensa +5, banda y medio +4, delantero +3
//   Asistencia: defensa +4, banda y medio +3, delantero +2
//   Cada 2 tiros a puerta: defensa +3, banda y medio +2, delantero +1
//   Goles encajados: 0 → defensa +4, banda +3, medio +2, delantero +1; 1 → nada; 2 o más → −1 por gol
// El capitán puntúa doble.
export const GRUPO = { POR: 'DEF', CEN: 'DEF', BAN: 'BAN', MED: 'MED', DEL: 'DEL' };
export const NOMBRE_GRUPO = { DEF: 'Defensa', BAN: 'Banda', MED: 'Medio', DEL: 'Delantero' };
export const TABLA = {
    gol:        { DEF: 5, BAN: 4, MED: 4, DEL: 3 },
    asistencia: { DEF: 4, BAN: 3, MED: 3, DEL: 2 },
    tiros2:     { DEF: 3, BAN: 2, MED: 2, DEL: 1 },
    porteria0:  { DEF: 4, BAN: 3, MED: 2, DEL: 1 }
};
export const PUNTOS = { titular: 1, mvp: 5, porGolEncajado: -1, desdeGoles: 2, capitan: 2 };

// Nombre corto para el campo (si no está aquí, el primer nombre)
export const CORTOS = { 'alejandro-cuevas': 'Jandro' };

// Posiciones: cada jugador solo se puede alinear donde juega.
export const NOMBRE_POS = { POR: 'Portero', CEN: 'Central', BAN: 'Banda', MED: 'Medio', DEL: 'Delantero' };
export const POSICIONES = {
    'arian-burguillo': ['POR'],
    'gilbert-natanael-de-jesus': ['CEN', 'BAN'],
    'junior-de-jesus': ['DEL'],
    'luis-nunez': ['MED'],
    'alejandro-cuevas': ['DEL', 'MED'],
    'fidel-escalante-mateo': ['CEN', 'BAN'],
    'piero-malasquez': ['CEN', 'BAN', 'MED'],
    'alfa-junior-umaro': ['BAN'],
    'eloy-marte': ['BAN', 'DEL'],
    'sebas-rodriguez-yanez': ['BAN'],
    'esteban-morales': ['MED', 'BAN'],
    'jefferson-marte': ['MED'],
    'nacho-escalante': ['BAN']
};
// Un jugador nuevo sin posiciones apuntadas: portero si lo es; si no, cualquier puesto de campo.
const posicionesDe = j => POSICIONES[j.id] || (j.portero ? ['POR'] : ['CEN', 'BAN', 'MED', 'DEL']);

// Formaciones: cada hueco con su posición y su sitio en el campo, en % (x, y). El hueco 0 es el portero.
export const FORMACIONES = {
    '1-2-1': { nombre: 'Rombo', huecos: [['POR', 50, 87], ['CEN', 50, 67], ['BAN', 17, 46], ['BAN', 83, 46], ['DEL', 50, 25]] },
    '1-3':   { nombre: 'Línea de tres', huecos: [['POR', 50, 87], ['CEN', 50, 67], ['BAN', 16, 41], ['MED', 50, 45], ['BAN', 84, 41]] },
    '1-1-2': { nombre: 'Dos puntas', huecos: [['POR', 50, 87], ['CEN', 50, 68], ['MED', 50, 47], ['DEL', 29, 25], ['DEL', 71, 25]] },
    '2-1-1': { nombre: 'Defensiva', huecos: [['POR', 50, 87], ['CEN', 29, 66], ['CEN', 71, 66], ['MED', 50, 45], ['DEL', 50, 24]] }
};
export const FORMACION_INICIAL = '1-2-1';
export const posHueco = (formacion, i) => (FORMACIONES[formacion] || FORMACIONES[FORMACION_INICIAL]).huecos[i][0];
export const puede = (j, pos) => !!j && j.posiciones.includes(pos);

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
        posiciones: posicionesDe(j),
        media: typeof j.media === 'number' ? j.media : null,
        precio: precioDe(j),
        estrella: !!ESTRELLAS[j.id]
    })).sort((a, b) => b.precio - a.precio || (b.media ?? 0) - (a.media ?? 0) || a.nombre.localeCompare(b.nombre, 'es'));
}

export const jornadaPuntuada = (D, n) => !!D?.PARTIDOS?.[n];

// Posición con la que puntúa un jugador fuera de un equipo (la primera de su lista)
export function posPrincipal(D, id) {
    const j = (D?.JUGADORES || []).find(x => x.id === id);
    return (j ? posicionesDe(j) : POSICIONES[id] || ['MED'])[0];
}

// Puntos de un jugador en la jornada n jugando en la posición pos; null si esa jornada aún no tiene datos.
export function puntosJugador(D, id, n, pos = posPrincipal(D, id)) {
    const d = desglose(D, id, n, pos);
    return d ? d.total : null;
}

// Posición de cada jugador de un equipo guardado: la de su hueco en la formación
// (si la formación es antigua y ya no existe, su posición principal).
export const posEnEquipo = (D, equipo, i) =>
    FORMACIONES[equipo?.formacion] ? posHueco(equipo.formacion, i) : posPrincipal(D, equipo?.jugadores?.[i]);

// Puntos de un equipo guardado ({ jugadores, capitan, formacion }) en la jornada n; null si aún no hay datos
export function puntosEquipo(D, equipo, n) {
    if (!equipo || !jornadaPuntuada(D, n)) return null;
    const detalle = (equipo.jugadores || []).map((id, i) => {
        const pos = posEnEquipo(D, equipo, i);
        const base = puntosJugador(D, id, n, pos) ?? 0;
        const capitan = id === equipo.capitan;
        return { id, pos, base, capitan, pts: capitan ? base * PUNTOS.capitan : base };
    });
    return { total: detalle.reduce((s, x) => s + x.pts, 0), detalle };
}

/* ---------- Construcción del equipo ---------- */
export const vacio = () => ({ formacion: FORMACION_INICIAL, slots: Array(TAMANO).fill(null), capitan: null });

export const coste = (slots, porId) => slots.reduce((s, id) => s + (id ? porId[id]?.precio || 0 : 0), 0);

// Lo mínimo que cuesta rellenar los huecos libres con jugadores de esa posición que no estén ya en el equipo
function minimoParaCompletar(formacion, slots, porId) {
    const libres = slots.map((x, i) => (x ? null : posHueco(formacion, i))).filter(Boolean);
    const disponibles = Object.values(porId).filter(j => !slots.includes(j.id)).sort((a, b) => a.precio - b.precio);
    let mejor = Infinity;
    const usados = new Set();
    (function probar(k, suma) {
        if (suma >= mejor) return;
        if (k === libres.length) { mejor = suma; return; }
        for (const j of disponibles) {
            if (usados.has(j.id) || !puede(j, libres[k])) continue;
            usados.add(j.id); probar(k + 1, suma + j.precio); usados.delete(j.id);
        }
    })(0, 0);
    return mejor;
}

// ¿Se puede poner al jugador `id` en el hueco `slot`? Si ya está en otro hueco, se intercambian
// (si cada uno puede jugar en el puesto del otro). Devuelve { ok, slots, motivo }.
export function colocar(estado, slot, id, porId) {
    const j = porId[id];
    if (!j) return { ok: false, motivo: 'Jugador desconocido' };
    const pos = posHueco(estado.formacion, slot);
    if (!puede(j, pos)) return { ok: false, motivo: `No juega de ${NOMBRE_POS[pos].toLowerCase()}` };
    const slots = estado.slots.slice();
    const donde = slots.indexOf(id);
    if (donde === slot) return { ok: false, motivo: 'Ya está en este puesto' };
    if (donde >= 0) {                      // mover dentro del equipo: no cambia el coste
        const otro = slots[slot] ? porId[slots[slot]] : null;
        if (otro && !puede(otro, posHueco(estado.formacion, donde)))
            return { ok: false, motivo: `${otro.corto} no juega de ${NOMBRE_POS[posHueco(estado.formacion, donde)].toLowerCase()}` };
        slots[donde] = slots[slot];
        slots[slot] = id;
        return { ok: true, slots };
    }
    slots[slot] = id;
    const otraEstrella = j.estrella && slots.some(x => x && x !== id && porId[x]?.estrella);
    const gasto = coste(slots, porId);
    if (gasto + minimoParaCompletar(estado.formacion, slots, porId) > PRESUPUESTO) {
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

// Primer hueco libre de una posición en la que juega (o -1)
export const huecoLibre = (estado, j) => estado.slots.findIndex((x, i) => !x && puede(j, posHueco(estado.formacion, i)));

// Cambiar de formación recolocando a los que ya están; quien no tenga sitio sale del equipo.
export function cambiarFormacion(estado, nueva, porId) {
    const ids = estado.slots.filter(Boolean);
    const huecos = FORMACIONES[nueva].huecos.map(h => h[0]);
    let mejor = { n: -1, slots: Array(TAMANO).fill(null) };
    (function probar(k, slots, n) {
        if (n + (ids.length - k) <= mejor.n) return;
        if (k === ids.length) { mejor = { n, slots: slots.slice() }; return; }
        const j = porId[ids[k]];
        for (let i = 0; i < TAMANO; i++) {
            if (slots[i] || !puede(j, huecos[i])) continue;
            // si estaba en un hueco de la misma posición, se prueba primero ese
            slots[i] = j.id; probar(k + 1, slots, n + 1); slots[i] = null;
        }
        probar(k + 1, slots, n);         // no cabe: sale
    })(0, Array(TAMANO).fill(null), 0);
    const fuera = ids.filter(id => !mejor.slots.includes(id));
    return { slots: mejor.slots, fuera };
}

// Problemas que impiden guardar (lista vacía = equipo válido)
export function problemas(estado, porId) {
    const p = [];
    if (!FORMACIONES[estado.formacion]) { p.push('Elige una formación'); return p; }
    const faltan = estado.slots.filter(x => !x).length;
    if (faltan) p.push(faltan === 1 ? 'Falta 1 jugador' : `Faltan ${faltan} jugadores`);
    estado.slots.forEach((x, i) => {
        const j = x && porId[x], pos = posHueco(estado.formacion, i);
        if (x && !j) p.push('Hay un jugador que ya no está en la plantilla');
        else if (j && !puede(j, pos)) p.push(`${j.corto} no juega de ${NOMBRE_POS[pos].toLowerCase()}`);
    });
    if (new Set(estado.slots.filter(Boolean)).size !== estado.slots.filter(Boolean).length) p.push('Hay un jugador repetido');
    if (Object.keys(ESTRELLAS).every(id => estado.slots.includes(id))) p.push('Jandro y Alfa no pueden ir juntos');
    if (!faltan && coste(estado.slots, porId) > PRESUPUESTO) p.push(`Te pasas del presupuesto (${coste(estado.slots, porId)} de ${PRESUPUESTO} M)`);
    if (!faltan && !estado.slots.includes(estado.capitan)) p.push('Elige capitán');
    return p;
}

// Capitán por defecto al completar el equipo: el más caro
export const capitanPorDefecto = (slots, porId) =>
    slots.filter(Boolean).slice().sort((a, b) => (porId[b]?.precio || 0) - (porId[a]?.precio || 0))[0] || null;

// Puntos por goles encajados según la posición
export function puntosEncajados(gc, grupo) {
    if (gc === 0) return TABLA.porteria0[grupo];
    if (gc >= PUNTOS.desdeGoles) return PUNTOS.porGolEncajado * gc;
    return 0;
}

// Desglose de los puntos de un jugador en una jornada, fila a fila, para su ficha:
// { jugo, estado, pos, grupo, datos, filas: [{ clave, texto, cantidad, pts }], total }; null si no hay datos.
export function desglose(D, id, n, pos = posPrincipal(D, id)) {
    if (!jornadaPuntuada(D, n)) return null;
    const P = D.PARTIDOS[n];
    const r = (D.JUGADORES || []).find(j => j.id === id)?.jornadas?.[n];
    const grupo = GRUPO[pos] || 'MED';
    if (!r || r.estado) return { jugo: false, estado: r?.estado || 'No jugó', pos, grupo, filas: [], total: 0 };
    const goles = r.goles || 0, asis = r.asistencias || 0, tiros = r.tiros || 0;
    const gc = typeof P.gc === 'number' ? P.gc : null;
    const filas = [
        { clave: 'titular', texto: 'Titular', cantidad: r.titular === true ? 'Sí' : r.titular === false ? 'No' : '–', pts: r.titular === true ? PUNTOS.titular : 0 },
        { clave: 'goles', texto: 'Goles', cantidad: goles, pts: goles * TABLA.gol[grupo] },
        { clave: 'asistencias', texto: 'Asistencias', cantidad: asis, pts: asis * TABLA.asistencia[grupo] },
        { clave: 'tiros', texto: 'Tiros a puerta', cantidad: tiros, pts: Math.floor(tiros / 2) * TABLA.tiros2[grupo] },
        { clave: 'encajados', texto: gc === 0 ? 'Portería a cero' : 'Goles encajados', cantidad: gc ?? '–', pts: gc == null ? 0 : puntosEncajados(gc, grupo) },
        { clave: 'mvp', texto: 'MVP', cantidad: r.mvp ? 'Sí' : 'No', pts: r.mvp ? PUNTOS.mvp : 0 }
    ];
    return { jugo: true, pos, grupo, datos: r, filas, total: filas.reduce((s, x) => s + x.pts, 0) };
}

/* ---------- Clasificación ---------- */
// equipos: { [jornada]: { [uid]: { nombre, avatar, jugadores, capitan, formacion, jornada } } } de las jornadas cerradas.
// Si alguien no cambia su equipo, juega con el último que guardó.
export function equipoEnJornada(equipos, uid, n) {
    for (let k = n; k >= PRIMERA_JORNADA; k--) if (equipos[k]?.[uid]) return equipos[k][uid];
    return null;
}

// jornadas: las que se quieren mirar (en orden). Los puntos solo cuentan en las que tienen datos.
export function clasificacion(D, equipos, jornadas) {
    const js = jornadas.slice().sort((a, b) => a - b);
    const uids = new Set(js.flatMap(n => Object.keys(equipos[n] || {})));
    const puntuadas = js.filter(n => jornadaPuntuada(D, n));
    const ultima = puntuadas[puntuadas.length - 1] ?? null;
    const actual = js[js.length - 1];
    const filas = [...uids].map(uid => {
        let total = 0, nombre = '', avatar = '';
        const porJornada = {}, historial = [];
        for (const n of js) {
            const e = equipoEnJornada(equipos, uid, n);
            if (!e) continue;
            nombre = e.nombre || nombre; avatar = e.avatar || avatar;
            const p = puntosEquipo(D, e, n);
            porJornada[n] = p ? p.total : null;
            if (p) total += p.total;
            historial.push({ n, equipo: e, puntos: p, heredado: !equipos[n]?.[uid] });
        }
        return {
            uid, nombre: nombre || 'Sin nombre', avatar, total, porJornada, historial,
            ultima: ultima != null ? (porJornada[ultima] ?? 0) : null,
            equipo: equipoEnJornada(equipos, uid, actual), jornadaEquipo: actual
        };
    });
    filas.sort((a, b) => b.total - a.total || (b.ultima ?? 0) - (a.ultima ?? 0) || a.nombre.localeCompare(b.nombre, 'es'));
    filas.forEach((f, i) => {
        const prev = filas[i - 1];
        f.pos = prev && prev.total === f.total && (prev.ultima ?? 0) === (f.ultima ?? 0) ? prev.pos : i + 1;
    });
    return { filas, ultima };
}
