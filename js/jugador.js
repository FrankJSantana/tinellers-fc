// js/jugador.js — pinta la ficha de un jugador (jugador.html?id=...) con los datos de js/jugadores-datos.js
(function () {
    const D = window.TINELLERS;
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const nota = n => (n == null ? '–' : n.toFixed(2).replace('.', ','));
    const tono = n => (n == null ? 'none' : n >= 8 ? 'hi' : n >= 6 ? 'mid' : 'lo');
    const badge = n => `<span class="rating rating--${tono(n)} num">${nota(n)}</span>`;
    const dash = v => (v ? v : '<span class="zero">–</span>');

    const id = new URLSearchParams(location.search).get('id');
    const J = D.JUGADORES.find(p => p.id === id);
    const main = $('main');

    if (!J) {
        main.innerHTML = `<section class="section"><div class="wrap"><h2>Jugador no encontrado</h2>
            <p class="meta" style="margin-top:16px">Vuelve a las estadísticas y elige un jugador de la tabla.</p>
            <a class="more" style="margin-top:24px" href="estadisticas.html">Ver estadísticas <span aria-hidden="true">→</span></a></div></section>`;
        return;
    }

    document.title = `${J.nombre} · Tinellers FC`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = `Ficha de ${J.nombre} (#${J.dorsal}) en Tinellers FC: media, goles, asistencias y nota de cada jornada.`;

    const T = J.temporada;
    const jornadas = Object.keys(D.PARTIDOS).map(Number).sort((a, b) => a - b);
    const ult = jornadas[jornadas.length - 1];

    /* ---------- Cabecera ---------- */
    $('ph-dorsal').textContent = J.dorsal;
    $('ph-nombre').textContent = J.nombre;
    $('ph-puesto').textContent = `${J.puesto} · Temporada ${D.temporada}`;

    /* ---------- Números de la temporada ---------- */
    const tiles = [
        [nota(J.media), 'Media'],
        [T.pj, 'Partidos jugados'],
        [T.goles, 'Goles'],
        [T.asistencias, 'Asistencias'],
        [T.mvp, 'Premios MVP'],
        J.portero ? [T.paradas, 'Paradas'] : [T.amarillas, 'Tarjetas amarillas']
    ];
    $('fx-tiles').innerHTML = `<h2 id="h-temp" data-r>Temporada ${esc(D.temporada)} <span>tras la jornada ${ult}</span></h2>` +
        tiles.map(([v, l]) => `<p class="bal" data-r><b class="num">${esc(v)}</b><span>${esc(l)}</span></p>`).join('');

    /* ---------- Partido a partido ---------- */
    const filas = jornadas.slice().reverse().map(n => {
        const P = D.PARTIDOS[n];
        const R = J.jornadas[n] || { estado: 'No jugó' };
        const res = P.gf > P.gc ? ['win', 'V'] : P.gf < P.gc ? ['loss', 'D'] : ['draw', 'E'];
        const marcador = P.local ? `${P.gf}–${P.gc}` : `${P.gc}–${P.gf}`;
        const jugo = !R.estado;
        return `<tr data-r>
          <td class="num fx-jor">J${n}</td>
          <td class="fx-rival"><span class="team"><img src="${esc(P.escudo)}" alt="" width="34" height="40" loading="lazy">${esc(P.rival)}</span><span class="c-sub">${P.local ? 'En casa' : 'Fuera'} · ${esc(P.fecha)}</span></td>
          <td class="res"><b class="${res[0]}">${res[1]}</b> <span class="num">${marcador}</span></td>
          <td>${jugo ? badge(R.nota) : `<span class="fx-estado">${esc(R.estado)}</span>`}</td>
          <td class="num">${jugo ? dash(R.goles) : dash(0)}</td>
          <td>${jugo && R.mvp ? '<span class="mvp-tag">MVP</span>' : dash(0)}</td>
        </tr>`;
    }).join('');
    $('fx-tabla').innerHTML = filas + `<tr class="fx-total">
          <td colspan="3">Temporada</td><td>${badge(J.media)}</td><td class="num">${T.goles || '–'}</td><td class="num">${T.mvp || '–'}</td>
        </tr>`;

    /* ---------- Análisis por jornada ---------- */
    $('fx-analisis').innerHTML = jornadas.slice().reverse().map(n => {
        const P = D.PARTIDOS[n];
        const R = J.jornadas[n] || { estado: 'No jugó' };
        const marcador = P.local ? `Tinellers FC ${P.gf}–${P.gc} ${P.rival}` : `${P.rival} ${P.gc}–${P.gf} Tinellers FC`;
        const parr = (R.analisis || []).filter(Boolean);
        const cuerpo = R.estado
            ? `<p class="muted">${esc(R.estado)} en esta jornada.</p>`
            : parr.length
                ? parr.map(t => `<p>${esc(t)}</p>`).join('')
                : '<p class="muted">Análisis próximamente.</p>';
        return `<article class="fx-card" data-r aria-labelledby="h-an-${n}">
          <header class="fx-card-head">
            <div><h3 id="h-an-${n}">Jornada ${n}</h3><p>${esc(marcador)} · ${esc(P.fecha)}</p></div>
            ${R.estado ? '' : badge(R.nota)}
          </header>
          <div class="fx-card-body">${cuerpo}</div>
        </article>`;
    }).join('');

    /* ---------- Resto de la plantilla ---------- */
    $('fx-plantilla').innerHTML = D.JUGADORES.filter(p => p.id !== J.id).map(p =>
        `<li data-r><a href="jugador.html?id=${encodeURIComponent(p.id)}"><span class="num fx-dor">${p.dorsal}</span><span class="fx-nom">${esc(p.nombre)}</span>${badge(p.media)}</a></li>`
    ).join('');
})();
