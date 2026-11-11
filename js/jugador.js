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

    const retrato = (p, cls) => p.foto
        ? `<img class="${cls}" src="${esc(p.foto)}" alt="" width="400" height="400" loading="lazy">`
        : cls === 'fx-mini'
            ? `<span class="${cls} is-ini" aria-hidden="true">${esc(p.nombre.split(' ').slice(0, 2).map(w => w[0]).join(''))}</span>`
            : `<span class="${cls} is-dorsal num" aria-hidden="true">${esc(p.dorsal)}</span>`;

    /* ---------- Sin jugador elegido: la plantilla entera ---------- */
    if (!id) {
        const ult = Math.max(...Object.keys(D.PARTIDOS).map(Number));
        document.title = 'Jugadores · Tinellers FC';
        const desc = document.querySelector('meta[name="description"]');
        if (desc) desc.content = 'La plantilla de Tinellers FC: ficha de cada jugador con su media, goles, asistencias y nota de cada jornada.';
        main.innerHTML = `<section class="page-head" aria-labelledby="h1">
            <div class="wrap ph-grid">
              <div><h1 id="h1" data-r>Jugadores</h1><p class="ph-sub" data-r>La plantilla de Tinellers FC. Elige un jugador para ver su ficha: media, nota de cada jornada y análisis.</p></div>
              <div class="ph-crest" data-r><img src="img/escudo-tinellers.webp" alt="Escudo de Tinellers FC" width="900" height="997"></div>
            </div></section>
          <section class="section" aria-labelledby="h-plantilla">
            <div class="wrap">
              <div class="sec-head" data-r><h2 id="h-plantilla">Plantilla ${esc(D.temporada)}</h2><p class="meta">Por dorsal · Medias tras la jornada ${ult}</p></div>
              <ul class="jg-grid">${D.JUGADORES.slice().sort((a, b) => a.dorsal - b.dorsal).map(p => `<li data-r><a class="jg-card" href="jugador.html?id=${encodeURIComponent(p.id)}">
                  ${retrato(p, 'jg-foto')}
                  <span class="jg-info"><span class="jg-dor num">${esc(p.dorsal)}</span><b>${esc(p.nombre)}</b><small>${esc(p.puesto)}</small></span>
                  <span class="jg-nums"><span>${badge(p.media)}<small>Media</small></span><span><b class="num">${p.temporada.pj}</b><small>PJ</small></span><span><b class="num">${p.temporada.goles}</b><small>Goles</small></span></span>
                </a></li>`).join('')}</ul>
            </div></section>`;
        document.querySelectorAll('.nav a[href="jugador.html"], .mobile-menu a[href="jugador.html"]').forEach(a => a.setAttribute('aria-current', 'page'));
        return;
    }
    if (!J) {
        main.innerHTML = `<section class="section"><div class="wrap"><h2>Jugador no encontrado</h2>
            <p class="meta" style="margin-top:16px">Ese jugador no está en la plantilla. Elige uno de la lista.</p>
            <a class="more" style="margin-top:24px" href="jugador.html">Ver jugadores <span aria-hidden="true">→</span></a></div></section>`;
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
    if (J.foto) { const f = $('ph-foto'); f.src = J.foto; f.alt = `Foto de ${J.nombre}`; f.classList.remove('hidden'); }
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

    /* ---------- Gráfica: nota de cada jornada (línea con área) y media de la temporada ---------- */
    function grafica() {
        const box = $('fx-chart');
        const pts = jornadas.map(k => {
            const R = J.jornadas[k] || { estado: 'No jugó' };
            return { k, P: D.PARTIDOS[k], R, v: !R.estado && typeof R.nota === 'number' ? R.nota : null };
        });
        if (!pts.some(p => p.v != null)) { box.innerHTML = '<p class="fx-chart-vacio">Todavía no tiene notas.</p>'; return; }
        const cs = getComputedStyle(box);
        const W = Math.max(300, Math.min(960, Math.round(box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))));
        const H = W < 500 ? 230 : 280, L = 28, R = W < 500 ? 16 : 24, T = 34, B = 54;
        const iw = W - L - R, ih = H - T - B;
        const PAD = W < 500 ? 40 : 56;                      // los puntos de los extremos no tocan los bordes
        const paso = pts.length > 1 ? (iw - 2 * PAD) / (pts.length - 1) : 0;
        const x = i => (pts.length > 1 ? L + PAD + paso * i : L + iw / 2), y = v => T + ih - (v / 10) * ih;
        const rivalCorto = r => { const w = r.replace(/ FC$/, '').split(' '); return ['La', 'El', 'Les', 'Los', 'Club'].includes(w[0]) ? w.slice(0, 2).join(' ') : w[0]; };
        const grid = [0, 5, 10].map(g => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" class="g${g === 0 ? ' g0' : ''}"/><text x="${L - 8}" y="${y(g) + 4}" class="ax" text-anchor="end">${g}</text>`).join('');
        // tramos seguidos de partidos con nota (si no jugó, la línea se corta)
        const tramos = []; let t = [];
        pts.forEach((p, i) => { if (p.v == null) { if (t.length) tramos.push(t); t = []; } else t.push(i); });
        if (t.length) tramos.push(t);
        const area = tramos.filter(t => t.length > 1).map(t => `<path class="area" d="M${x(t[0])},${y(0)} ${t.map(i => `L${x(i)},${y(pts[i].v)}`).join(' ')} L${x(t[t.length - 1])},${y(0)} Z"/>`).join('');
        const linea = tramos.filter(t => t.length > 1).map(t => `<polyline class="line" points="${t.map(i => `${x(i)},${y(pts[i].v)}`).join(' ')}"/>`).join('');
        const media = typeof J.media === 'number' ? `<line class="media" x1="${L}" x2="${W - R}" y1="${y(J.media)}" y2="${y(J.media)}"/>` : '';
        const marcas = pts.map((p, i) => {
            const eje = `<text x="${x(i)}" y="${H - B + 24}" class="xl" text-anchor="middle">J${p.k}</text><text x="${x(i)}" y="${H - B + 42}" class="xs" text-anchor="middle">${esc(rivalCorto(p.P.rival))}</text>`;
            if (p.v == null) return eje + `<circle class="nodot" cx="${x(i)}" cy="${y(0)}" r="5"/><text x="${x(i)}" y="${y(0) - 12}" class="nj" text-anchor="middle">${esc(p.R.estado || 'Sin nota')}</text>`;
            return eje + `<circle class="dot dot--${tono(p.v)}" cx="${x(i)}" cy="${y(p.v)}" r="6"/><text x="${x(i)}" y="${y(p.v) - 14}" class="val" text-anchor="middle">${nota(p.v)}</text>`;
        }).join('');
        const zonas = pts.map((p, i) => { const w = pts.length > 1 ? paso : iw; return `<rect class="hit" x="${x(i) - w / 2}" y="${T - 20}" width="${w}" height="${ih + 20}" data-i="${i}"/>`; }).join('');
        box.innerHTML = `<div class="fx-legend" aria-hidden="true"><span><i class="lg-line"></i>Nota de la jornada</span>${typeof J.media === 'number' ? `<span><i class="lg-media"></i>Media de la temporada · <b>${nota(J.media)}</b></span>` : ''}</div>
          <div class="fx-chart-plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Nota de ${J.nombre} en cada jornada`)}"><defs><linearGradient id="fx-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a48b7" stop-opacity="0.22"/><stop offset="1" stop-color="#1a48b7" stop-opacity="0"/></linearGradient></defs>${grid}${area}${media}${linea}${marcas}${zonas}</svg><div class="fx-tip" hidden></div></div>
          <table class="sr-only"><caption>Nota por jornada</caption><thead><tr><th>Jornada</th><th>Rival</th><th>Nota</th></tr></thead><tbody>${pts.map(p => `<tr><td>J${p.k}</td><td>${esc(p.P.rival)}</td><td>${p.v == null ? esc(p.R.estado || 'Sin nota') : nota(p.v)}</td></tr>`).join('')}</tbody></table>`;
        const tip = box.querySelector('.fx-tip'), svg = box.querySelector('svg');
        const mostrar = i => {
            const p = pts[i], m = p.P.local ? `${p.P.gf}–${p.P.gc}` : `${p.P.gc}–${p.P.gf}`;
            tip.innerHTML = `<b>Jornada ${p.k} · ${esc(p.P.fecha)}</b><span>${esc(p.P.rival)} · ${m}</span><span>${p.v == null ? esc(p.R.estado || 'Sin nota') : `Nota <strong>${nota(p.v)}</strong>${p.R.mvp ? ' · MVP' : ''}`}</span>`;
            tip.hidden = false;
            const r = svg.getBoundingClientRect(), k = r.width / W;
            tip.style.left = Math.min(Math.max(x(i) * k, 80), r.width - 80) + 'px';
            tip.style.top = Math.max(0, (p.v == null ? y(0) : y(p.v)) * k - 92) + 'px';
            svg.querySelectorAll('.hit').forEach(h => h.classList.toggle('is-on', +h.dataset.i === i));
        };
        svg.addEventListener('pointermove', e => { const h = e.target.closest('.hit'); if (h) mostrar(+h.dataset.i); });
        svg.addEventListener('pointerleave', () => { tip.hidden = true; svg.querySelectorAll('.hit').forEach(h => h.classList.remove('is-on')); });
    }
    grafica();
    let anchoGrafica = $('fx-chart').clientWidth;
    window.addEventListener('resize', () => {
        const w = $('fx-chart').clientWidth;
        if (w !== anchoGrafica) { anchoGrafica = w; grafica(); }
    });

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
        `<li data-r><a href="jugador.html?id=${encodeURIComponent(p.id)}">${retrato(p, 'fx-mini')}<span class="num fx-dor">${p.dorsal}</span><span class="fx-nom">${esc(p.nombre)}</span>${badge(p.media)}</a></li>`
    ).join('');
})();
