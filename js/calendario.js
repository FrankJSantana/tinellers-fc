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
    {
        n: 4,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'La Trese FC', escudoVisitante: '',
        fecha: '2026-11-15T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    },
    {
        n: 5,
        local: 'El Club de Carl', escudoLocal: '',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2026-11-22T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    },
    {
        n: 6,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'Les Fifiwis', escudoVisitante: '',
        fecha: '2026-11-29T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    },
    {
        n: 7,
        local: 'Hortaleza Eleven FC', escudoLocal: '',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2026-12-13T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    {
        n: 8,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'Lineal King', escudoVisitante: '',
        fecha: '2026-12-20T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    {
        n: 9,
        local: 'Jagger de Munich', escudoLocal: '',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2027-01-10T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    {
        n: 10,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'Secreto Loungue', escudoVisitante: '',
        fecha: '2027-01-17T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    },
    {
        n: 11,
        local: 'Kows FC', escudoLocal: '',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2027-01-24T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    },
    {
        n: 12,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'Balkans FC', escudoVisitante: '',
        fecha: '2027-01-31T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    },
    {
        n: 13,
        local: 'La Banda del Patio', escudoLocal: '',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2027-02-07T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    {
        n: 14,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'Cocidos Madrileños FC', escudoVisitante: 'img/escudo-cocidos.svg',
        fecha: '2027-02-21T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    {
        n: 15,
        local: 'La Trese FC', escudoLocal: '',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2027-02-28T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    {
        n: 16,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'El Club de Carl', escudoVisitante: '',
        fecha: '2027-03-07T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    },
    {
        n: 17,
        local: 'Les Fifiwis', escudoLocal: '',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2027-03-14T19:00:00+01:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    },
    {
        n: 18,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'Hortaleza Eleven FC', escudoVisitante: '',
        fecha: '2027-04-04T19:00:00+02:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    },
    {
        n: 19,
        local: 'Lineal King', escudoLocal: '',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2027-04-11T19:00:00+02:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    {
        n: 20,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'Jagger de Munich', escudoVisitante: '',
        fecha: '2027-04-18T19:00:00+02:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    {
        n: 21,
        local: 'Secreto Loungue', escudoLocal: '',
        visitante: 'Tinellers FC', escudoVisitante: 'img/escudo-tinellers.webp',
        fecha: '2027-04-25T19:00:00+02:00',
        campo: 'IDB Almudena, F7: 1 · Ciudad Lineal'
    },
    {
        n: 22,
        local: 'Tinellers FC', escudoLocal: 'img/escudo-tinellers.webp',
        visitante: 'Kows FC', escudoVisitante: '',
        fecha: '2027-05-09T19:00:00+02:00',
        campo: 'IDB Almudena, F7: 2 · Ciudad Lineal'
    }
];
