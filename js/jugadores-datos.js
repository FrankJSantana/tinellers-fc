// js/jugadores-datos.js — fichas de jugador (jugador.html?id=...).
// Para añadir una jornada:
//   1) añade el partido en PARTIDOS,
//   2) en cada jugador, añade esa jornada en "jornadas" con su nota, goles, asistencias, mvp y el análisis,
//      por ejemplo: 5: { nota: 8.50, goles: 1, asistencias: 2, mvp: false, analisis: [] },
//   3) actualiza "media" y los totales de "temporada".
// El Fantasy (fantasy.html) puntúa solo con estos datos en cuanto la jornada está en PARTIDOS.
// Si un jugador no jugó, pon { estado: 'No jugó' } o { estado: 'Sancionado' } en esa jornada.
// Si jugó pero aún no tiene nota, deja la jornada sin "nota": la ficha muestra «–», la media no cambia
// y el fantasy le suma solo goles, asistencias y MVP hasta que llegue la nota.
// Otros datos opcionales de cada jornada: paradas (porteros) y tiros (tiros a puerta sin contar los goles).
// "analisis" es el texto que explica la nota; cada elemento de la lista es un párrafo.
// Mientras esté vacío ([]), la ficha muestra «Análisis próximamente».
window.TINELLERS = {
  temporada: '2026',

  PARTIDOS: {
    1: { fecha: '18 oct', rival: 'Balkans FC', escudo: 'img/escudo-balkans.svg', local: false, gf: 3, gc: 2 },
    2: { fecha: '25 oct', rival: 'La Banda del Patio', escudo: 'img/escudo-banda-patio.svg', local: true, gf: 6, gc: 2 },
    // Jornada 3: 6–0 con goles de Alejandro Cuevas (3), Alfa Umaro y 2 en propia puerta. Notas pendientes.
    3: { fecha: '8 nov', rival: 'Cocidos Madrileños FC', escudo: 'img/escudo-cocidos.svg', local: false, gf: 6, gc: 0 }
  },

  JUGADORES: [
    {
      id: 'arian-burguillo', nombre: 'Arian Burguillo', dorsal: 1, puesto: 'Portero y capitán', portero: true,
      media: 8.89,
      temporada: { pj: 3, goles: 0, asistencias: 0, paradas: 20, mvp: 1, amarillas: 0 },
      jornadas: {
        1: { nota: 7.67, goles: 0, mvp: false, analisis: [] },
        2: { nota: 10.00, goles: 0, mvp: true, analisis: [] },
        3: { goles: 0, asistencias: 0, paradas: 8, mvp: false, analisis: [] }
      }
    },
    {
      id: 'alfa-junior-umaro', nombre: 'Alfa Junior Umaro', dorsal: 4, puesto: 'Jugador de campo',
      media: 9.83,
      temporada: { pj: 3, goles: 4, asistencias: 2, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 9.75, goles: 1, mvp: false, analisis: [] },
        2: { nota: 9.90, goles: 2, mvp: false, analisis: [] },
        3: { goles: 1, asistencias: 0, mvp: false, analisis: [] }
      }
    },
    {
      id: 'luis-nunez', nombre: 'Luis Núñez', dorsal: 6, puesto: 'Capitán',
      media: 7.38,
      temporada: { pj: 3, goles: 1, asistencias: 3, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 9.43, goles: 1, mvp: false, analisis: [] },
        2: { nota: 5.78, goles: 0, mvp: false, analisis: [] },
        3: { goles: 0, asistencias: 1, mvp: false, analisis: [] }
      }
    },
    {
      id: 'esteban-morales', nombre: 'Esteban Morales', dorsal: 8, puesto: 'Capitán',
      media: 5.56,
      temporada: { pj: 3, goles: 0, asistencias: 1, paradas: 0, mvp: 0, amarillas: 1 },
      jornadas: {
        1: { nota: 5.00, goles: 0, mvp: false, analisis: [] },
        2: { nota: 6.00, goles: 0, mvp: false, analisis: [] },
        3: { goles: 0, asistencias: 0, mvp: false, analisis: [] }
      }
    },
    {
      id: 'jefferson-marte', nombre: 'Jefferson Marte', dorsal: 10, puesto: 'Jugador de campo',
      media: 5.78,
      temporada: { pj: 3, goles: 0, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 3.71, goles: 0, mvp: false, analisis: [] },
        2: { nota: 7.09, goles: 0, mvp: false, analisis: [] },
        3: { goles: 0, asistencias: 0, mvp: false, analisis: [] }
      }
    },
    {
      id: 'sebas-rodriguez-yanez', nombre: 'Sebas Rodriguez Yañez', dorsal: 11, puesto: 'Jugador de campo',
      media: 6.63,
      temporada: { pj: 2, goles: 0, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 6.14, goles: 0, mvp: false, analisis: [] },
        2: { nota: 7.00, goles: 0, mvp: false, analisis: [] },
        3: { estado: 'No jugó' }
      }
    },
    {
      id: 'eloy-marte', nombre: 'Eloy Marte', dorsal: 14, puesto: 'Jugador de campo',
      media: 6.10,
      temporada: { pj: 2, goles: 0, asistencias: 1, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 3.89, goles: 0, mvp: false, analisis: [] },
        2: { nota: 7.91, goles: 0, mvp: false, analisis: [] },
        3: { estado: 'No jugó' }
      }
    },
    {
      id: 'piero-malasquez', nombre: 'Piero Malasquez', dorsal: 16, puesto: 'Jugador de campo',
      media: 9.00,
      temporada: { pj: 3, goles: 2, asistencias: 1, paradas: 0, mvp: 1, amarillas: 0 },
      jornadas: {
        1: { nota: 9.29, goles: 1, mvp: true, analisis: [] },
        2: { nota: 8.71, goles: 1, mvp: false, analisis: [] },
        3: { goles: 0, asistencias: 1, mvp: false, analisis: [] }
      }
    },
    {
      id: 'junior-de-jesus', nombre: 'Junior De Jesus', dorsal: 22, puesto: 'Jugador de campo',
      media: 6.89,
      temporada: { pj: 1, goles: 1, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { estado: 'No jugó' },
        2: { nota: 6.89, goles: 1, mvp: false, analisis: [] },
        3: { estado: 'No jugó' }
      }
    },
    {
      id: 'nacho-escalante', nombre: 'Nacho Escalante', dorsal: 23, puesto: 'Jugador de campo',
      media: 7.00,
      temporada: { pj: 3, goles: 0, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 6.88, goles: 0, mvp: false, analisis: [] },
        2: { nota: 7.08, goles: 0, mvp: false, analisis: [] },
        3: { goles: 0, asistencias: 0, mvp: false, analisis: [] }
      }
    },
    {
      id: 'fidel-escalante-mateo', nombre: 'Fidel Escalante', dorsal: 25, puesto: 'Jugador de campo',
      media: null,
      temporada: { pj: 1, goles: 0, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { estado: 'No jugó' },
        2: { estado: 'Sancionado' },
        3: { goles: 0, asistencias: 0, mvp: false, analisis: [] }
      }
    },
    {
      id: 'alejandro-cuevas', nombre: 'Alejandro Cuevas', dorsal: 90, puesto: 'Jugador de campo',
      media: 9.36,
      temporada: { pj: 2, goles: 5, asistencias: 1, paradas: 0, mvp: 1, amarillas: 0 },
      jornadas: {
        1: { estado: 'No jugó' },
        2: { nota: 9.36, goles: 2, mvp: false, analisis: [] },
        3: { goles: 3, asistencias: 0, tiros: 2, mvp: true, analisis: [] }
      }
    },
    {
      id: 'gilbert-natanael-de-jesus', nombre: 'Gilbert Natanael De Jesus', dorsal: 99, puesto: 'Jugador de campo',
      media: null,
      temporada: { pj: 1, goles: 0, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        3: { goles: 0, asistencias: 0, mvp: false, analisis: [] }
      }
    }
  ]
};
