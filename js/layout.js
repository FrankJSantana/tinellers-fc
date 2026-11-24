// js/layout.js — cabecera y pie comunes a todas las páginas.
// Se cargan con un <script data-part="header"> y otro <script data-part="footer"> en el sitio donde va cada pieza.
// Para añadir o cambiar un enlace del menú o del pie, se hace aquí y se ve en toda la web.
(function () {
    const script = document.currentScript;
    if (!script) return;
    const part = script.dataset.part;

    // Página actual (sin parámetros ni #): '' o '/' es la portada
    const actual = location.pathname.split('/').pop() || 'index.html';
    const aria = href => (href === actual ? ' aria-current="page"' : '');

    const MENU = [
        ['partidos.html', 'Partidos'],
        ['clasificacion.html', 'Clasificación'],
        ['noticias.html', 'Noticias'],
        ['estadisticas.html', 'Estadísticas'],
        ['jugador.html', 'Jugadores'],
        ['quienes-somos.html', 'Club']
    ];
    const FANTASY = ['fantasy.html', 'Fantasy'];
    const enlace = ([href, texto], clase = '') =>
        `<a${clase ? ` class="${clase}"` : ''} href="${href}"${aria(href)}>${texto}</a>`;

    const CABECERA = `
<a class="sr-only skip" href="#main">Saltar al contenido</a>
<header class="site-head">
  <div class="wrap bar">
    <a class="brand" href="index.html" aria-label="Tinellers FC, inicio"><img src="img/escudo-tinellers-96.webp" alt="" width="96" height="106"><span>Tinellers FC</span></a>
    <nav class="nav" aria-label="Principal">
      ${MENU.map(m => enlace(m)).join('\n      ')}
      ${enlace(FANTASY, 'btn')}
    </nav>
    <button class="menu-btn" id="menu-btn" type="button" aria-label="Abrir menú" aria-controls="mobile-menu" aria-expanded="false"><span></span></button>
  </div>
  <div class="mobile-menu" id="mobile-menu">
    ${enlace(['index.html', 'Inicio'])}
    ${MENU.map(m => enlace(m)).join('\n    ')}
    ${enlace(FANTASY, 'btn')}
  </div>
</header>`;

    const PIE = `
<footer class="site-foot">
  <div class="wrap foot-cols">
    <div class="fcol" data-r><p class="fh">Club</p><a href="quienes-somos.html">Quiénes somos</a><a href="jugador.html">Jugadores</a><a href="noticias.html">Noticias</a></div>
    <div class="fcol" data-r><p class="fh">Competición</p><a href="partidos.html">Partidos</a><a href="clasificacion.html">Clasificación</a><a href="partidos.html#resultados">Resultados</a><a href="estadisticas.html">Estadísticas</a></div>
    <div class="fcol" data-r><p class="fh">Comunidad</p><a href="fantasy.html">Fantasy</a></div>
    <div class="fcol" data-r><p class="fh">Dónde jugamos</p><p>Ciudad Lineal, Madrid</p><p>Domingos a las 19:00</p><p>Liga municipal de fútbol 7</p></div>
  </div>
  <div class="wrap foot-mid"><div data-r><img class="" src="img/escudo-tinellers-320.webp" alt="Escudo de Tinellers FC" width="320" height="354"></div><h2 class="foot-motto" data-r>El escudo, la cerveza y el césped</h2></div>
  <div class="wrap foot-mark">
    <p class="mark" aria-hidden="true" data-r>Tinellers FC</p>
    <div class="legal"><p>© 2026 Tinellers FC. Web creada por Franklin Jiménez Santana.</p><a href="privacidad.html">Privacidad</a> · <a href="#top">Volver arriba</a></div>
  </div>
</footer>`;

    // Se inserta justo donde está el script, de forma síncrona: no hay saltos de diseño al cargar.
    script.insertAdjacentHTML('beforebegin', part === 'footer' ? PIE : CABECERA);
})();
