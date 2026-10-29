// js/calendario.js — partidos de la quiniela. Para abrir una jornada nueva, añade un bloque
// copiando el de la jornada 3 y cambiando los datos. Las apuestas de cada jornada se cierran
// solas 24 horas antes de la hora del partido.
//
//   n            número de jornada
//   local        equipo que juega en casa       visitante  equipo de fuera
//   escudoLocal / escudoVisitante  imagen del escudo (deja '' si no hay)
//   fecha        día y hora del partido, hora de Madrid: 'AAAA-MM-DDTHH:MM:00+01:00'
//                (+01:00 en invierno, +02:00 en verano)
//   campo        dónde se juega
export const HORAS_CIERRE = 24;

export const JORNADAS = [
    {
        n: 3,
        local: 'Cocidos Madrileños FC', escudoLocal: 'img/escudo-cocidos.svg',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2026-11-08T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    // {
    //     n: 4,
    //     local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
    //     visitante: 'Nombre del rival', escudoVisitante: '',
    //     fecha: '2026-11-15T19:00:00+01:00',
    //     campo: 'Campo, Ciudad Lineal'
    // },
];
