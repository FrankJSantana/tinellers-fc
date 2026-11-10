// js/liga.js — pinta el calendario, la clasificación y el próximo partido a partir de js/liga-datos.js.
// Se carga antes que js/main.js para que las animaciones y la cuenta atrás vean el contenido nuevo.
(function () {
    const L = window.LIGA;
    if (!L || !Array.isArray(L.partidos)) return;
    const US = L.nosotros;
    const tz = { timeZone: 'Europe/Madrid' };
    const fDia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', ...tz });
    const fDiaLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short', ...tz });
    const fHora = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', ...tz });
    const fMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', ...tz });
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const dia = d => cap(fDia.format(d).replace(/[.,]/g, ''));            // "Dom 8 nov"
    const diaLargo = d => cap(fDiaLargo.format(d).replace(/[.,]/g, ''));  // "Domingo 8 nov"
    const $$ = s => Array.from(document.querySelectorAll(s));

    /* ---------- Datos ---------- */
    const P = L.partidos.map(([j, local, visitante, gl, gv, fecha, campo]) => ({
        j, local, visitante, gl, gv, inicio: new Date(fecha), campo: campo || '',
        jugado: Number.isInteger(gl) && Number.isInteger(gv)
    })).sort((a, b) => a.j - b.j || a.inicio - b.inicio);
    const equipos = [...new Set(P.flatMap(m => [m.local, m.visitante]))];
    const nuestros = P.filter(m => m.local === US || m.visitante === US).sort((a, b) => a.inicio - b.inicio);
    const ultimaJ = Math.max(0, ...P.filter(m => m.jugado).map(m => m.j));

    // Resultado desde el punto de vista de un equipo: 'G' ganado, 'E' empatado, 'P' perdido
    const res = (m, e) => {
        const [a, b] = m.local === e ? [m.gl, m.gv] : [m.gv, m.gl];
        return a > b ? 'G' : a === b ? 'E' : 'P';
    };

    /* ---------- Clasificación (mismo orden que la oficial) ----------
       1. Puntos.
       2. Empatados a puntos: mini-liga solo con los partidos entre ellos. Si sus puntos
          separan al grupo, cada subgrupo que siga empatado se vuelve a desempatar igual,
          con su propia mini-liga.
       3. Si la mini-liga no los separa: diferencia de goles entre ellos, diferencia de
          goles general y goles a favor. */
    function clasificacion(hasta) {
        const jugados = P.filter(m => m.jugado && m.j <= hasta);
        const T = Object.fromEntries(equipos.map(e => [e, { equipo: e, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, forma: [] }]));
        for (const m of jugados) {
            for (const [e, a, b] of [[m.local, m.gl, m.gv], [m.visitante, m.gv, m.gl]]) {
                const t = T[e]; t.pj++; t.gf += a; t.gc += b;
                const r = a > b ? 'G' : a === b ? 'E' : 'P';
                t[r === 'G' ? 'g' : r === 'E' ? 'e' : 'p']++; t.forma.push(r);
            }
        }
        const filas = Object.values(T).map(t => ({ ...t, pts: t.g * 3 + t.e - (L.sanciones?.[t.equipo] || 0), dg: t.gf - t.gc }));
        // Agrupa filas por una clave numérica, de mayor a menor
        const agrupar = (lista, clave) => {
            const g = new Map();
            for (const f of lista) { const k = clave(f); if (!g.has(k)) g.set(k, []); g.get(k).push(f); }
            return [...g.entries()].sort((a, b) => b[0] - a[0]).map(([, v]) => v);
        };
        // Ordena un grupo de equipos empatados a puntos
        const desempatar = grupo => {
            if (grupo.length < 2) return grupo;
            const dentro = new Set(grupo.map(f => f.equipo));
            const mini = Object.fromEntries(grupo.map(f => [f.equipo, { pts: 0, dg: 0 }]));
            for (const m of jugados) {
                if (!dentro.has(m.local) || !dentro.has(m.visitante)) continue;
                const a = mini[m.local], b = mini[m.visitante];
                a.dg += m.gl - m.gv; b.dg += m.gv - m.gl;
                if (m.gl > m.gv) a.pts += 3; else if (m.gl < m.gv) b.pts += 3; else { a.pts++; b.pts++; }
            }
            const porMini = agrupar(grupo, f => mini[f.equipo].pts);
            if (porMini.length > 1) return porMini.flatMap(desempatar);
            return [...grupo].sort((a, b) => mini[b.equipo].dg - mini[a.equipo].dg || b.dg - a.dg || b.gf - a.gf
                || a.equipo.localeCompare(b.equipo, 'es'));
        };
        const orden = agrupar(filas, f => f.pts).flatMap(desempatar);
        orden.forEach((f, i) => { f.pos = i + 1; });
        return orden;
    }
    const tabla = clasificacion(ultimaJ);
    const antes = ultimaJ > 1 ? Object.fromEntries(clasificacion(ultimaJ - 1).map(f => [f.equipo, f.pos])) : {};
    tabla.forEach(f => { f.evo = antes[f.equipo] ? antes[f.equipo] - f.pos : 0; });
    const posDe = e => tabla.find(f => f.equipo === e);
    const yo = posDe(US);
    window.LIGA.tabla = tabla;

    /* ---------- Piezas ---------- */
    const escudo = (e, w = 34, h = 38) => {
        const x = L.escudos?.[e];
        return x ? `<img src="${x.mini}" alt="" width="${w}" height="${x.w ? Math.round(w * x.h / x.w) : h}" loading="lazy">`
                 : `<span class="crest-ph" aria-hidden="true">${esc(L.iniciales?.[e] || e.slice(0, 2).toUpperCase())}</span>`;
    };
    const equipo = (e, w, h) => `<span class="team${e === US ? ' us' : ''}">${escudo(e, w, h)}${esc(e)}</span>`;
    const etiqueta = { G: 'Victoria', E: 'Empate', P: 'Derrota' };
    const clase = { G: 'win', E: 'draw', P: 'loss' };
    const proximo = nuestros.find(m => !m.jugado && Date.now() < m.inicio.getTime() + 3 * 36e5);
    const pendiente = m => !m.jugado && m.inicio.getTime() + 3 * 36e5 <= Date.now();

    function filaNuestra(m, conCampo = true) {
        const r = m.jugado ? res(m, US) : null;
        const resultado = m.jugado
            ? `<b class="${clase[r]}">${m.gl}–${m.gv}</b> ${etiqueta[r]}`
            : m === proximo ? `<span class="next-tag">Próximo · ${fHora.format(m.inicio)}</span>`
            : pendiente(m) ? '<span class="muted">Pendiente</span>'
            : `<span class="muted">${fHora.format(m.inicio)}</span>`;
        return `<tr data-r${m === proximo ? ' class="is-next"' : ''}>
            <td class="c-match"><span class="teams">${equipo(m.local)}<span class="vs">–</span>${equipo(m.visitante)}</span></td>
            <td class="c-res res">${resultado}</td>
            ${conCampo ? `<td class="c-jor">Jornada ${m.j}</td>` : ''}
            <td class="c-date">${dia(m.inicio)}<span class="c-sub">${conCampo ? esc(m.campo.replace('IDB Almudena, ', '')) : `Jornada ${m.j}`}</span></td>
        </tr>`;
    }

    /* ---------- Próximo partido (portada y Partidos) ---------- */
    const hero = document.getElementById('proximo');
    if (hero && proximo) {
        const lados = [['home', proximo.local, 'Local'], ['away', proximo.visitante, 'Visitante']];
        const meta = hero.querySelector('.mp-meta');
        if (meta) meta.textContent = `Jornada ${proximo.j} · Liga municipal de fútbol 7`;
        for (const [lado, e, rol] of lados) {
            const box = hero.querySelector(`.mp--${lado}`); if (!box) continue;
            const crest = box.querySelector('.mp-crest');
            const x = L.escudos?.[e];
            if (crest) {
                let nuevo;
                if (x) { nuevo = document.createElement('img'); nuevo.src = x.grande; nuevo.width = x.w; nuevo.height = x.h; nuevo.alt = `Escudo de ${e}`; }
                else { nuevo = document.createElement('span'); nuevo.setAttribute('aria-hidden', 'true'); nuevo.textContent = L.iniciales?.[e] || e.slice(0, 2); nuevo.classList.add('crest-big'); }
                nuevo.classList.add('mp-crest');
                crest.replaceWith(nuevo);
            }
            const nombre = box.querySelector('.mp-name');
            const f = posDe(e);
            if (nombre) nombre.innerHTML = `<b>${esc(e)}</b><span>${rol}${f && ultimaJ ? ` · ${f.pos}º, ${f.pts} ${f.pts === 1 ? 'punto' : 'puntos'}` : ''}</span>`;
        }
        // Los botones de quiniela y plantilla van siempre en nuestro lado (sirve aunque el HTML ya venga cambiado)
        const accHome = hero.querySelector('.mp--home .mp-actions'), accAway = hero.querySelector('.mp--away .mp-actions');
        const nuestro = proximo.local === US ? accHome : accAway, suyo = nuestro === accHome ? accAway : accHome;
        if (nuestro && suyo && !nuestro.querySelector('a[href^="apuestas.html"]')) { const t = nuestro.innerHTML; nuestro.innerHTML = suyo.innerHTML; suyo.innerHTML = t; }
        const set = (sel, txt) => { const el = hero.querySelector(sel); if (el) el.textContent = txt; };
        set('.seam-date', diaLargo(proximo.inicio));
        set('.seam-time', fHora.format(proximo.inicio));
        const venue = hero.querySelector('.seam-venue');
        if (venue) venue.innerHTML = `${esc(proximo.campo)}<br>Ciudad Lineal`;
        const count = hero.querySelector('[data-kickoff]');
        if (count) count.dataset.kickoff = proximo.inicio.toISOString();
    }

    /* ---------- Aviso de la quiniela del pie: siempre la jornada que viene ---------- */
    if (proximo) $$('.wb-note').forEach(el => { el.textContent = el.textContent.replace(/jornada \d+/i, `jornada ${proximo.j}`); });

    /* ---------- Calendario completo de Tinellers (Partidos) ---------- */
    $$('[data-liga="calendario"]').forEach(tb => {
        let mes = '', html = '';
        for (const m of nuestros) {
            const mm = cap(fMes.format(m.inicio));
            if (mm !== mes) { mes = mm; html += `<tr class="grp"><th colspan="4" scope="rowgroup">${esc(mm)}</th></tr>`; }
            html += filaNuestra(m);
        }
        tb.innerHTML = html;
    });

    /* ---------- Portada: próximo partido y los dos últimos resultados ---------- */
    $$('[data-liga="recientes"]').forEach(tb => {
        const hechos = nuestros.filter(m => m.jugado).slice(-2).reverse();
        tb.innerHTML = [proximo, ...hechos].filter(Boolean).map(m => filaNuestra(m, false)).join('');
    });

    /* ---------- Balance de la temporada ---------- */
    if (yo) $$('[data-liga-bal]').forEach(el => { el.textContent = yo[el.dataset.ligaBal]; });
    $$('[data-liga="balance-meta"]').forEach(el => {
        const ganados = yo?.g || 0, jugados = yo?.pj || 0;
        el.textContent = jugados ? `Temporada ${L.temporada} · ${ganados} ${ganados === 1 ? 'victoria' : 'victorias'} en ${jugados} ${jugados === 1 ? 'partido' : 'partidos'} · ${yo.pos}º en la liga` : `Temporada ${L.temporada}`;
    });

    /* ---------- Tabla de clasificación ---------- */
    const evo = f => f.evo > 0 ? `<span class="evo evo-up" aria-label="Sube ${f.evo}">▲${f.evo}</span>`
                   : f.evo < 0 ? `<span class="evo evo-down" aria-label="Baja ${-f.evo}">▼${-f.evo}</span>`
                   : '<span class="evo evo-eq" aria-label="Igual">=</span>';
    const forma = f => `<span class="forma">${f.forma.slice(-5).map(r => `<span class="fm fm-${r}" title="${etiqueta[r]}">${r}</span>`).join('')}</span>`;
    $$('[data-liga="tabla"]').forEach(tb => {
        tb.innerHTML = tabla.map(f => `<tr class="${f.equipo === US ? 'is-us' : ''}"${f.equipo === US ? ' aria-current="true"' : ''}>
            <td class="c-pos">${f.pos}º</td>
            <th scope="row" class="c-team">${equipo(f.equipo)}</th>
            <td class="c-pts">${f.pts}</td>
            <td>${f.pj}</td><td class="c-opt">${f.g}</td><td class="c-opt">${f.e}</td><td class="c-opt">${f.p}</td>
            <td class="c-opt">${f.gf}</td><td class="c-opt">${f.gc}</td><td>${f.dg > 0 ? '+' + f.dg : f.dg}</td>
            <td class="c-opt c-forma">${forma(f)}</td>
            <td class="c-evo">${evo(f)}</td>
        </tr>`).join('');
    });
    $$('[data-liga="mini-tabla"]').forEach(tb => {
        let filas = tabla.slice(0, 5);
        if (yo && yo.pos > 5) filas = [...tabla.slice(0, 3), ...tabla.slice(yo.pos - 2, yo.pos)];
        tb.innerHTML = filas.map(f => `<tr class="${f.equipo === US ? 'is-us' : ''}">
            <td class="c-pos">${f.pos}º</td><th scope="row" class="c-team">${equipo(f.equipo)}</th>
            <td class="c-pts">${f.pts}</td><td>${f.pj}</td><td>${f.dg > 0 ? '+' + f.dg : f.dg}</td></tr>`).join('');
    });
    const ultimaFecha = ultimaJ ? P.filter(m => m.j === ultimaJ).reduce((a, m) => (m.inicio > a ? m.inicio : a), new Date(0)) : null;
    $$('[data-liga="tabla-meta"]').forEach(el => {
        el.textContent = ultimaJ ? `Tras la jornada ${ultimaJ} · ${dia(ultimaFecha)}` : 'La liga aún no ha empezado';
    });
    $$('[data-liga="posicion"]').forEach(el => {
        if (!yo || !ultimaJ) return;
        const lider = tabla[0], dif = lider.pts - yo.pts;
        const frase = yo.pos === 1 ? (tabla[1]?.pts === yo.pts ? 'Líderes, empatados a puntos con el segundo' : 'Líderes de la liga')
                    : dif === 0 ? 'Empatados a puntos con el líder' : `A ${dif} ${dif === 1 ? 'punto' : 'puntos'} del líder`;
        el.innerHTML = `<p class="pp-num">${yo.pos}º</p><p class="pp-cap"><b>${yo.pts} ${yo.pts === 1 ? 'punto' : 'puntos'}</b> ${esc(frase)}</p>`;
    });
    $$('[data-liga="oficial"]').forEach(a => { a.href = L.oficial?.clasificacion || a.href; });

    /* ---------- Partidos de la liga, jornada a jornada ---------- */
    const visor = document.querySelector('[data-liga="jornadas"]');
    if (visor) {
        const lista = visor.querySelector('.jz-list'), etiq = visor.querySelector('.jz-label');
        const prev = visor.querySelector('[data-jz="prev"]'), next = visor.querySelector('[data-jz="next"]');
        const total = Math.max(...P.map(m => m.j));
        let actual = Math.max(1, ultimaJ || 1);
        const pintar = () => {
            const ms = P.filter(m => m.j === actual);
            const fechas = [...new Set(ms.map(m => dia(m.inicio)))];
            etiq.textContent = `Jornada ${actual} · ${fechas.join(', ')}`;
            lista.innerHTML = ms.map(m => `<li class="jz-m${m.local === US || m.visitante === US ? ' is-us' : ''}">
                <span class="jz-home">${equipo(m.local)}</span>
                <span class="jz-score${m.jugado ? '' : ' is-time'}">${m.jugado ? `${m.gl}–${m.gv}` : fHora.format(m.inicio)}</span>
                <span class="jz-away">${equipo(m.visitante)}</span>
                <span class="jz-meta">${m.jugado ? 'Final' : dia(m.inicio)} · ${esc(m.campo)}</span>
            </li>`).join('');
            prev.disabled = actual <= 1; next.disabled = actual >= total;
        };
        prev.addEventListener('click', () => { if (actual > 1) { actual--; pintar(); } });
        next.addEventListener('click', () => { if (actual < total) { actual++; pintar(); } });
        pintar();
    }
})();
