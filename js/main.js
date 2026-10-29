// js/main.js — comportamiento común: menú, entradas, escudo de portada, cuenta atrás y tabla ordenable
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Menú móvil ---------- */
    const btn = document.getElementById('menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        const setOpen = open => {
            menu.classList.toggle('is-open', open);
            btn.setAttribute('aria-expanded', String(open));
            btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        };
        btn.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
        menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
        window.matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
    }

    /* ---------- Entradas escalonadas, una sola vez ---------- */
    const items = Array.from(document.querySelectorAll('[data-r]'));
    const seen = new Map();
    items.forEach(el => {
        const n = seen.get(el.parentNode) || 0;
        seen.set(el.parentNode, n + 1);
        el.style.setProperty('--d', Math.min(n * 80, 400) + 'ms');
    });
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
        }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
        items.forEach(el => io.observe(el));
    } else {
        items.forEach(el => el.classList.add('in'));
    }

    /* ---------- Escudo de portada: se abre al cargar y acompaña el scroll ---------- */
    const crest = document.querySelector('.hero-crest');
    if (crest) {
        requestAnimationFrame(() => requestAnimationFrame(() => crest.classList.add('in')));
        if (!reduce) {
            let ticking = false;
            const move = () => {
                const y = Math.min(window.scrollY, 600);
                crest.style.transform = `translateY(${(y * -0.12).toFixed(1)}px)`;
                ticking = false;
            };
            window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true });
        }
    }

    /* ---------- Cuenta atrás al inicio del partido ---------- */
    document.querySelectorAll('[data-kickoff]').forEach(box => {
        const t = new Date(box.dataset.kickoff).getTime();
        if (isNaN(t)) return;
        const cells = {};
        box.querySelectorAll('[data-u]').forEach(b => { cells[b.dataset.u] = b; });
        const tick = () => {
            const diff = t - Date.now();
            if (diff <= 0) {
                const live = diff > -2 * 3600 * 1000;
                const msg = document.createElement('span');
                msg.className = 'count-msg';
                msg.textContent = live ? 'Se está jugando' : 'Partido jugado';
                box.replaceWith(msg);
                return false;
            }
            const d = Math.floor(diff / 864e5), h = Math.floor(diff % 864e5 / 36e5),
                  m = Math.floor(diff % 36e5 / 6e4), s = Math.floor(diff % 6e4 / 1e3);
            if (cells.d) cells.d.textContent = d;
            if (cells.h) cells.h.textContent = h;
            if (cells.m) cells.m.textContent = m;
            if (cells.s) cells.s.textContent = s;
            return true;
        };
        if (tick()) { const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000); }
    });

    /* ---------- Tabla ordenable (estadísticas) ---------- */
    document.querySelectorAll('table[data-sort]').forEach(table => {
        const body = table.tBodies[0];
        const heads = Array.from(table.tHead.rows[0].cells);
        const val = (tr, i) => {
            const c = tr.cells[i];
            const raw = (c.dataset.v ?? c.textContent).trim();
            const n = parseFloat(raw.replace('#', '').replace(',', '.'));
            return isNaN(n) ? raw.toLowerCase() : n;
        };
        heads.forEach((th, i) => {
            const b = th.querySelector('button');
            if (!b) return;
            b.addEventListener('click', () => {
                const dir = th.getAttribute('aria-sort') === 'descending' ? 'ascending' : (i === 1 ? 'ascending' : 'descending');
                heads.forEach(h => h.removeAttribute('aria-sort'));
                th.setAttribute('aria-sort', dir);
                const rows = Array.from(body.rows).sort((a, c) => {
                    const x = val(a, i), y = val(c, i);
                    const r = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), 'es');
                    return dir === 'ascending' ? r : -r;
                });
                rows.forEach(r => body.appendChild(r));
            });
        });
    });
})();
