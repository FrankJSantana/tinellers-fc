// js/jugadores-datos.js — fichas de jugador (jugador.html?id=...).
// Para añadir una jornada:
//   1) añade el partido en PARTIDOS,
//   2) en cada jugador, añade esa jornada en "jornadas" con su nota, goles, asistencias, mvp y el análisis,
//      por ejemplo: 5: { nota: 8.50, goles: 1, asistencias: 2, mvp: false, analisis: [] },
//   3) actualiza "media" y los totales de "temporada".
// El Fantasy (fantasy.html) puntúa solo con estos datos en cuanto la jornada está en PARTIDOS:
//   titular: true/false (+1 si fue titular), goles, asistencias, tiros (a puerta, sin contar los goles), mvp,
//   y los goles encajados salen de "gc" del partido. La nota no puntúa en el fantasy.
// Si un jugador no jugó, pon { estado: 'No jugó' } o { estado: 'Sancionado' } en esa jornada.
// Si jugó pero aún no tiene nota, deja la jornada sin "nota": la ficha muestra «–», la media no cambia
// y el fantasy puntúa igual (la nota no cuenta para el fantasy).
// Otros datos opcionales de cada jornada: paradas (porteros) y tiros (tiros a puerta sin contar los goles).
// "analisis" es el texto que explica la nota; cada elemento de la lista es un párrafo.
// Mientras esté vacío ([]), la ficha muestra «Análisis próximamente».
window.TINELLERS = {
  temporada: '2026',

  PARTIDOS: {
    1: { fecha: '18 oct', rival: 'Balkans FC', escudo: 'img/escudo-balkans.svg', local: false, gf: 3, gc: 2 },
    2: { fecha: '25 oct', rival: 'La Banda del Patio', escudo: 'img/escudo-banda-patio.svg', local: true, gf: 6, gc: 2 },
    // Jornada 3: 6–0 con goles de Alejandro Cuevas (3), Alfa Umaro y 2 en propia puerta.
    3: { fecha: '8 nov', rival: 'Cocidos Madrileños FC', escudo: 'img/escudo-cocidos.svg', local: false, gf: 6, gc: 0 }
  },

  JUGADORES: [
    {
      id: 'arian-burguillo', nombre: 'Arian Burguillo', dorsal: 1, puesto: 'Portero y capitán', portero: true,
      media: 8.63,
      temporada: { pj: 3, goles: 0, asistencias: 0, paradas: 20, mvp: 1, amarillas: 0 },
      jornadas: {
        1: { nota: 7.67, goles: 0, mvp: false, analisis: ["Dio 3 paradas en todo el partido, en el que el rival tiró poco. Encajó dos goles, uno de ellos de penalti. Buena comunicación, aunque fue un partido desapercibido para él."] },
        2: { nota: 10.00, goles: 0, mvp: true, analisis: ["MVP indiscutible: 9 paradas que dejaron al equipo como el de menos goles encajados de la liga. Buen posicionamiento y comunicación en los balones salientes; sin él el partido pudo quedar muy ajustado o incluso perderse, y sus paradas mantuvieron fuerte al equipo. A mejorar: demasiados balones largos al delantero que acababan en posesión rival."] },
        3: { nota: 8.23, goles: 0, asistencias: 0, paradas: 8, mvp: false, analisis: ["Nota con el nuevo sistema: 6,53 de base sobre 7,5 (posicionamiento 10, solidez defensiva 10, comunicación 8,5, aportación ofensiva 9, decisiones con balón 6) y +1,70 de bonus: 8 paradas (+1,20) y portería a cero (+0,50).", "Además evitó dos situaciones de gol saliendo del área."] }
      }
    },
    {
      id: 'alfa-junior-umaro', nombre: 'Alfa Junior Umaro', dorsal: 4, puesto: 'Jugador de campo',
      media: 9.17,
      temporada: { pj: 3, goles: 4, asistencias: 2, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 9.75, goles: 1, mvp: false, analisis: ["Titular, con 1 gol y 1 asistencia; pudo ser MVP perfectamente. Jugó todo el partido sin cambios, dio pases con visión y marcó el gol de la victoria. Solo se le corrigió que invadiera la posición de Luis en una ocasión. Partido de 10."] },
        2: { nota: 9.90, goles: 2, mvp: false, analisis: ["Titular los 50 minutos, con 2 goles y 1 asistencia. Se inventó él solo sus goles, con buen regate, presión, posicionamiento y tiro. Partido súper completo, nada que criticar: 10/10 para el míster."] },
        3: { nota: 7.85, goles: 1, asistencias: 0, mvp: false, analisis: ["Nota con el nuevo sistema: 6,75 de base sobre 7,5 (posicionamiento 10, solidez defensiva 9, comunicación 7, aportación ofensiva 10, decisiones con balón 9) y +1,10 de bonus: 1 gol (+0,50), 1 autogol del rival provocado (+0,20) y portería a cero (+0,40)."] }
      }
    },
    {
      id: 'luis-nunez', nombre: 'Luis Núñez', dorsal: 6, puesto: 'Capitán',
      media: 6.55,
      temporada: { pj: 3, goles: 1, asistencias: 3, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 9.43, goles: 1, mvp: false, analisis: ["Titular de mediapunta, con 1 gol y 1 asistencia. De los tres posibles MVP, el míster lo situó tercero. Sin él no había transición de balón: buen reparto de pases y posicionamiento, hizo lo que se le pidió al 100%, con todos los tiros a las frontales y buena compenetración con Alfa. Fue más líder aquí que en la jornada 2."] },
        2: { nota: 5.78, goles: 0, mvp: false, analisis: ["Titular de mediapunta, con 1 asistencia. Partido flojo del capitán: lo notó perdido, con poca comunicación frente a la jornada 1 y algunas decisiones fáciles, quizá por nervios. Muy buena compenetración con Alfa. Pisó posiciones de los laterales y dejó al rival distribuir por el medio; pases flojos y pocos tiros. Aun así, sin él no hay transición de balón: el equipo bajó mucho cuando lo sentó."] },
        3: { nota: 4.45, goles: 0, asistencias: 1, mvp: false, analisis: ["Nota con el nuevo sistema: 3,90 de base sobre 7,5 (posicionamiento 6,5, solidez defensiva 5, comunicación 6, aportación ofensiva 4,5, decisiones con balón 4) y +0,55 de bonus: 1 asistencia (+0,30) y portería a cero (+0,25)."] }
      }
    },
    {
      id: 'esteban-morales', nombre: 'Esteban Morales', dorsal: 8, puesto: 'Capitán',
      media: 5.48,
      temporada: { pj: 3, goles: 0, asistencias: 1, paradas: 0, mvp: 0, amarillas: 1 },
      jornadas: {
        1: { nota: 5.00, goles: 0, mvp: false, analisis: ["Titular de lateral. Partido desapercibido casi siempre, pero jugó bien en equipo: dio una asistencia sin gol que dejó a Alfa solo ante el portero y destacó sobre todo en los pases. Alguna vez se posicionó mal por el cansancio; tuvo una defensa rígida y en ataque hizo jugar a los compañeros. Provocó el penalti del rival."] },
        2: { nota: 6.00, goles: 0, mvp: false, analisis: ["Suplente. Partido normalito comparado con la jornada 1: buenos pases y buen repliegue, pero muy desapercibido tanto en defensa como en ataque. Vio una tarjeta amarilla. Como capitán, le falta presencia en el campo."] },
        3: { nota: 5.43, goles: 0, asistencias: 0, mvp: false, analisis: ["Nota con el nuevo sistema: 5,18 de base sobre 7,5 (posicionamiento 8, solidez defensiva 7,5, comunicación 4, aportación ofensiva 7,5, decisiones con balón 7,5) y +0,25 de bonus por portería a cero."] }
      }
    },
    {
      id: 'jefferson-marte', nombre: 'Jefferson Marte', dorsal: 10, puesto: 'Jugador de campo',
      media: 5.40,
      temporada: { pj: 3, goles: 0, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 3.71, goles: 0, mvp: false, analisis: ["Titular de central. Para el míster fue el partido más flojo del equipo: un gol vino por él y comprometió al portero unas tres veces en los primeros 10 minutos. Se sentó y volvió en la segunda parte de medio centro, donde también estuvo muy perdido en posición y decisiones. No era su día, no le salió nada."] },
        2: { nota: 7.09, goles: 0, mvp: false, analisis: ["Titular de medio recuperador. Buen partido comparado con la jornada 1: imperial en el medio campo pese a la altura del rival, ganó balones aéreos, fue un tanque en los duelos físicos y se entendió bien con su lateral, Nacho. Diez minutos perfectos para lo que se le pidió. A mejorar: se cansa muy pronto y le falta hablar más."] },
        3: { nota: 5.40, goles: 0, asistencias: 0, mvp: false, analisis: ["Nota con el nuevo sistema: 4,95 de base sobre 7,5 (posicionamiento 6, solidez defensiva 8, comunicación 4,5, aportación ofensiva 8, decisiones con balón 6,5) y +0,45 de bonus: 1 autogol del rival provocado (+0,20) y portería a cero (+0,25)."] }
      }
    },
    {
      id: 'sebas-rodriguez-yanez', nombre: 'Sebas Rodriguez Yañez', dorsal: 11, puesto: 'Jugador de campo',
      media: 6.63,
      temporada: { pj: 2, goles: 0, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 6.14, goles: 0, mvp: false, analisis: ["Suplente que jugó en banda. Defendió con picardía, como se le pidió, tomó buenas decisiones y jugó en equipo. Lo único a corregir: subía demasiado a la delantera siendo defensa."] },
        2: { nota: 7.00, goles: 0, mvp: false, analisis: ["Cubriendo varias posiciones, es hasta ahora el mejor parche para cubrir y dar descanso a otros jugadores. Frente a la jornada 1 minimiza fallos, corrige errores y va ganando opciones de titularidad. Gestionó su rol y su tiempo a la perfección, siempre con picardía. No sube más la nota porque, cuando genere peligro con pases y tiros, será el parche perfecto del equipo."] },
        3: { estado: 'No jugó' }
      }
    },
    {
      id: 'eloy-marte', nombre: 'Eloy Marte', dorsal: 14, puesto: 'Jugador de campo',
      media: 6.10,
      temporada: { pj: 2, goles: 0, asistencias: 1, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 3.89, goles: 0, mvp: false, analisis: ["Partido desapercibido como titular; fue cambiado un par de veces por el cansancio. Buena presión en campo rival, aunque alguna sobraba para evitar la fatiga. Generó pocas ocasiones de gol, pero arrastró la marca de los defensas rivales en varias ocasiones."] },
        2: { nota: 7.91, goles: 0, mvp: false, analisis: ["Titular de 9. Buen partido: a diferencia de la jornada 1, presionó con mucha cabeza. Su asistencia nace de una presión por la espalda que dejó solo a Alfa ante el portero. Tuvo dos palos y no marcó por mala suerte; se posicionó donde debía. A mejorar: para ser un 9 debe aprovechar más las ocasiones que le da el equipo."] },
        3: { estado: 'No jugó' }
      }
    },
    {
      id: 'piero-malasquez', nombre: 'Piero Malasquez', dorsal: 16, puesto: 'Jugador de campo',
      media: 8.43,
      temporada: { pj: 3, goles: 2, asistencias: 1, paradas: 0, mvp: 1, amarillas: 0 },
      jornadas: {
        1: { nota: 9.29, goles: 1, mvp: true, analisis: ["Era un perfil desconocido para todos y, al faltar Fidel, jugó de titular y sorprendió a todos. Evitó errores de los laterales que podían acabar en un 1 contra 1 con el portero, marcó desde la frontal del área, no falló ni un regate, comunicó muy bien y fue el líder de la defensa. MVP merecidísimo."] },
        2: { nota: 8.71, goles: 1, mvp: false, analisis: ["Titular de central. Buen partido, a ratos desapercibido. Hizo de capitán de la defensa, lideró el posicionamiento de los laterales y nunca dejó el área al descubierto. Marcó el gol que abrió el marcador, con buena aceleración. Defensa impecable, nada que criticar."] },
        3: { nota: 7.28, goles: 0, asistencias: 1, mvp: false, analisis: ["Nota con el nuevo sistema: 6,38 de base sobre 7,5 (posicionamiento 9, solidez defensiva 8, comunicación 7,5, aportación ofensiva 9, decisiones con balón 9) y +0,90 de bonus: 1 asistencia (+0,40) y portería a cero (+0,50)."] }
      }
    },
    {
      id: 'junior-de-jesus', nombre: 'Junior De Jesus', dorsal: 22, puesto: 'Jugador de campo',
      media: 6.89,
      temporada: { pj: 1, goles: 1, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { estado: 'No jugó' },
        2: { nota: 6.89, goles: 1, mvp: false, analisis: ["Suplente de 9. Primer tiempo muy flojo: lento, con poca actitud y perdido mientras entraba en sintonía con el equipo. En el segundo cambió por completo: hizo el rol de 9 que se pide, bajó las pelotas del portero y del equipo, jugó de cara al mediapunta, tuvo dos cabezazos que no entraron por poco, marcó 1 gol y estuvo bien posicionado en los córners. Si sigue así sumará más minutos en la segunda parte."] },
        3: { estado: 'No jugó' }
      }
    },
    {
      id: 'nacho-escalante', nombre: 'Nacho Escalante', dorsal: 23, puesto: 'Jugador de campo',
      media: 7.00,
      temporada: { pj: 3, goles: 0, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { nota: 6.88, goles: 0, mvp: false, analisis: ["Entró de suplente. Buen ataque pero mala organización en defensa en la primera parte. En la segunda dejó de regatear en la salida de defensa, se posicionó donde correspondía y basculó bien la pelota. Su nivel le ganó la titularidad para la jornada 2."] },
        2: { nota: 7.08, goles: 0, mvp: false, analisis: ["Titular de lateral izquierdo. Partido desapercibido con buena comunicación y posicionamiento. Se la jugó atrás varias veces, pero esta vez fue más culpa del equipo que suya: hubo tramos sin apoyo y con descolocación total, y tuvo que ir un par de veces a la banda opuesta a recuperar por un compañero descolgado. A mejorar: las decisiones en el medio campo."] },
        3: { goles: 0, asistencias: 0, mvp: false, analisis: [] }
      }
    },
    {
      id: 'fidel-escalante-mateo', nombre: 'Fidel Escalante', dorsal: 25, puesto: 'Jugador de campo',
      media: 5.98,
      temporada: { pj: 1, goles: 0, asistencias: 0, paradas: 0, mvp: 0, amarillas: 0 },
      jornadas: {
        1: { estado: 'No jugó' },
        2: { estado: 'Sancionado' },
        3: { nota: 5.98, goles: 0, asistencias: 0, mvp: false, analisis: ["Nota con el nuevo sistema: 5,48 de base sobre 7,5 (posicionamiento 8,5, solidez defensiva 8,5, comunicación 5,5, aportación ofensiva 6, decisiones con balón 8) y +0,50 de bonus por portería a cero."] }
      }
    },
    {
      id: 'alejandro-cuevas', nombre: 'Alejandro Cuevas', dorsal: 90, puesto: 'Jugador de campo',
      media: 8.63,
      temporada: { pj: 2, goles: 5, asistencias: 1, paradas: 0, mvp: 1, amarillas: 0 },
      jornadas: {
        1: { estado: 'No jugó' },
        2: { nota: 9.36, goles: 2, mvp: false, analisis: ["Suplente en mediapunta, delantero y lateral, volviendo de una lesión (el míster no la tuvo en cuenta en la nota). De lateral y mediapunta, sin presión: en defensa se sentía uno menos, pero en ofensiva marcó el ritmo de todo el equipo, dio transición con los laterales y salía con facilidad de presiones de cuatro. De delantero, peligro en cada balón que tocaba: 2 goles, con auténticos golazos, y 1 asistencia en menos de 20 minutos. Dio capitanía dentro y fuera del campo. La nota se resiente solo por la falta de presión."] },
        3: { nota: 7.90, goles: 3, asistencias: 0, tiros: 2, mvp: true, analisis: ["Nota con el nuevo sistema: 6,30 de base sobre 7,5 (posicionamiento 7,5, solidez defensiva 6, comunicación 10, aportación ofensiva 9,5, decisiones con balón 9) y +1,60 de bonus: 3 goles (+1,20), 2 tiros a puerta (+0,30) y portería a cero (+0,10)."] }
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
