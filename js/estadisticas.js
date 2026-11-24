// js/estadisticas.js — pinta líderes, tabla y goles de la temporada a partir de js/jugadores-datos.js.
// Se rellenan los elementos con data-stats="lideres" | "tabla" | "goles" (estadisticas.html) y "goles" (portada).
(function () {
    const D = window.TINELLERS;
    if (!D) return;
    const $$ = s => document.querySelectorAll(s);
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const coma = n => n.toFixed(2).replace('.', ',');
    const NUM = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
        'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
    const palabra = (n, cap) => { const t = NUM[n] ?? String(n); return cap ? t[0].toUpperCase() + t.slice(1) : t; };
    const FLECHA = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10 L9.5 2.5 M3.5 2 H10 V8.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

    const J = D.JUGADORES;
    const jornadas = Object.keys(D.PARTIDOS).map(Number).sort((a, b) => a - b);
    const ultima = D.ULTIMA || jornadas[jornadas.length - 1];
    const T = j => j.temporada;

    /* ---------- Líderes ---------- */
    // Los que empatan en lo más alto salen todos
    const lideres = campo => {
        const max = Math.max(0, ...J.map(j => T(j)[campo]));
        return { max, quienes: max > 0 ? J.filter(j => T(j)[campo] === max) : [] };
    };
    const nombres = lista => lista.map(j => `${esc(j.nombre)} <span class="ld-dorsal">#${j.dorsal}</span>`)
        .reduce((a, x, i, arr) => a + (i === 0 ? '' : i === arr.length - 1 ? ' y ' : ', ') + x, '');

    function pintarLideres(el) {
        const g = lideres('goles'), p = lideres('paradas'), a = lideres('asistencias'), m = lideres('mvp');
        const varios = l => l.quienes.length > 1;
        let h = '';
        if (g.max) h += `<div class="ld-top" data-r>
        <p class="ld-big num">${g.max}<span>${g.max === 1 ? 'gol' : 'goles'}</span></p>
        <div>
          <h3 class="ld-name">${nombres(g.quienes)}</h3>
          <p class="ld-cat">${varios(g) ? 'Máximos goleadores' : 'Máximo goleador'} de la temporada tras la jornada ${ultima}</p>
        </div>
      </div>`;
        const filas = [];
        if (p.max) filas.push([p, `Paradas, ${varios(p) ? 'las mejores cifras' : 'la mejor cifra'} del equipo`]);
        if (a.max) filas.push([a, varios(a) ? 'Asistencias, los que más goles han dado' : 'Asistencias, el que más goles ha dado']);
        if (m.max) filas.push([m, varios(m) ? `Premio MVP${m.max > 1 ? ` (${m.max})` : ''} cada uno` : 'Premio MVP']);
        h += `<ul class="ld-list">${filas.map(([l, cat]) =>
            `<li data-r><p class="ld-num num">${l.max}</p><div><h3 class="ld-name">${nombres(l.quienes)}</h3><p class="ld-cat">${cat}</p></div></li>`).join('\n        ')}</ul>`;
        el.innerHTML = h;
    }

    /* ---------- Tabla de la plantilla ---------- */
    const celda = v => v > 0 ? `<td class="hi num" data-v="${v}">${v}</td>` : '<td class="zero num" data-v="0">–</td>';
    const tarjetas = (n, r = 0) => n + r > 0
        ? `<td data-v="${n + r * 2}">${Array(n).fill(`<span class="yellow" role="img" aria-label="Tarjeta amarilla"></span>`).join('')}${Array(r).fill(`<span class="red-card" role="img" aria-label="Tarjeta roja"></span>`).join('')}</td>`
        : '<td data-v="0"><span class="zero">–</span></td>';

    // Etiqueta roja si el jugador fue sancionado en la última jornada en que lo estuvo
    const sancion = j => {
        const n = Object.keys(j.jornadas).map(Number).filter(k => j.jornadas[k].estado === 'Sancionado').pop();
        return n ? `<span class="tag tag--red">Sancionado J${n}</span>` : '';
    };

    function pintarTabla(tbody) {
        const orden = J.slice().sort((x, y) => T(y).goles - T(x).goles || T(y).asistencias - T(x).asistencias ||
            T(y).mvp - T(x).mvp || T(y).paradas - T(x).paradas || x.dorsal - y.dorsal);
        tbody.innerHTML = orden.map(j => {
            const t = T(j), ficha = `jugador.html?id=${encodeURIComponent(j.id)}`;
            const media = typeof j.media === 'number'
                ? `<td class="hi num" data-v="${j.media.toFixed(2)}"><a class="avg-link" href="${ficha}" aria-label="Media ${coma(j.media)}. Ver ficha de ${esc(j.nombre)}">${coma(j.media)}${FLECHA}</a></td>`
                : '<td class="zero num" data-v="0">–</td>';
            return `<tr data-r>
        <td class="dorsal num" data-v="${j.dorsal}">${j.dorsal}</td>
        <td class="player"><a class="player-link" href="${ficha}">${esc(j.nombre)}</a>${sancion(j)}</td>
        <td class="num" data-v="${t.pj}">${t.pj}</td>
        ${media}
        ${celda(t.goles)}${celda(t.asistencias)}${celda(t.paradas)}${celda(t.mvp)}
        ${tarjetas(t.amarillas, t.rojas || 0)}
      </tr>`;
        }).join('\n');
    }

    /* ---------- Goles de la temporada ---------- */
    function pintarGoles(sec) {
        const filas = [];
        let total = 0, deJugadores = 0, encajados = 0;
        const goleadores = new Set();
        jornadas.forEach(n => {
            const P = D.PARTIDOS[n];
            const marcador = P.local ? `${P.gf}–${P.gc}` : `${P.gc}–${P.gf}`;
            filas.push(`<tr><th scope="rowgroup" colspan="2">Jornada ${n} · ${esc(P.rival)} ${marcador}</th></tr>`);
            const lista = J.map(j => ({ j, g: j.jornadas[n]?.goles || 0 })).filter(x => x.g > 0)
                .sort((a, b) => b.g - a.g || a.j.dorsal - b.j.dorsal);
            lista.forEach(({ j, g }) => { filas.push(`<tr><td class="lead">${esc(j.nombre)}</td><td>${g}</td></tr>`); deJugadores += g; goleadores.add(j.id); });
            if (P.propia) { filas.push(`<tr><td class="lead">En propia puerta</td><td>${P.propia}</td></tr>`); }
            total += P.gf; encajados += P.gc;
        });
        const propias = total - deJugadores;
        const nota = `${palabra(total, true)} goles en ${palabra(jornadas.length)} jornadas: ${palabra(deJugadores)} de ${palabra(goleadores.size)} jugadores` +
            `${propias ? ` y ${palabra(propias)} en propia puerta` : ''}. ${palabra(encajados, true)} encajados.`;
        sec.innerHTML = `<div class="wrap goals-grid">
    <div class="goals-left">
      <div data-r>
        <h2 id="h-goals">Goles de la temporada</h2>
        <p class="note">${nota}</p>
      </div>
      <div data-r>
        <p class="total-num">${total}</p>
        <p class="total-cap">goles a favor tras la jornada ${ultima}</p>
      </div>
    </div>
    <div class="slip" data-r>
      <table>
        <caption class="sr-only">Goleadores por jornada</caption>
        <tbody>
          ${filas.join('\n          ')}
          <tr class="sum-gap"><td colspan="2"></td></tr>
          <tr class="sum"><td class="lead">Total</td><td>${total}</td></tr>
        </tbody>
      </table>
      <a class="more slip-link" href="estadisticas.html">Estadísticas completas <span aria-hidden="true">→</span></a>
    </div>
  </div>`;
    }

    $$('[data-stats="lideres"]').forEach(pintarLideres);
    $$('[data-stats="tabla"]').forEach(pintarTabla);
    $$('[data-stats="goles"]').forEach(pintarGoles);
})();
