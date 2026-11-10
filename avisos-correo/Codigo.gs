/**
 * Avisos por correo del Fantasy Tinellers (Google Apps Script, en la cuenta del administrador).
 *
 * Cada hora mira la base de datos del fantasy (Firestore) y la web, y envía desde tu Gmail:
 *   1. Recordatorio, 24 horas antes del cierre de cada jornada, con el equipo de cada uno.
 *   2. Último aviso, 3 horas antes del cierre, solo a quien todavía no tiene equipo.
 *   3. Puntos de la jornada, en cuanto la web tiene los datos del partido (js/jugadores-datos.js).
 * Solo escribe a quien marcó "Avisarme por correo" en la web (colección avisos).
 *
 * Instalación: pega este archivo, activa "Mostrar el archivo de manifiesto appsscript.json"
 * en Configuración del proyecto, pega también appsscript.json y ejecuta instalar() una vez.
 * Para ver un ejemplo sin escribir a nadie: ejecuta enviarPrueba() (te llega solo a ti).
 */
var PROYECTO = 'tinellers-fc';
var WEB = 'https://frankjsantana.github.io/tinellers-fc/';
var FANTASY = WEB + 'fantasy.html';
var PRIMERA = 4;
var BASE = 'https://firestore.googleapis.com/v1/projects/' + PROYECTO + '/databases/(default)/documents/';
var POS = { POR: 'portero', CEN: 'central', BAN: 'banda', MED: 'medio', DEL: 'delantero' };
var FORMACIONES = {
  '1-2-1': ['POR', 'CEN', 'BAN', 'BAN', 'DEL'],
  '1-3': ['POR', 'CEN', 'BAN', 'MED', 'BAN'],
  '1-1-2': ['POR', 'CEN', 'MED', 'DEL', 'DEL'],
  '2-1-1': ['POR', 'CEN', 'CEN', 'MED', 'DEL']
};
var CORTOS = { 'alejandro-cuevas': 'Jandro' };
// Puntos: los mismos que js/fantasy-logica.js (si cambian allí, cámbialos aquí también).
var GRUPO = { POR: 'DEF', CEN: 'DEF', BAN: 'BAN', MED: 'MED', DEL: 'DEL' };
var TABLA = {
  gol: { DEF: 5, BAN: 4, MED: 4, DEL: 3 },
  asistencia: { DEF: 4, BAN: 3, MED: 3, DEL: 2 },
  tiros2: { DEF: 3, BAN: 2, MED: 2, DEL: 1 },
  porteria0: { DEF: 4, BAN: 3, MED: 2, DEL: 1 }
};
var PUNTOS = { titular: 1, mvp: 5, capitan: 2 };
// Posición principal de cada jugador (para equipos guardados con una formación antigua)
var POS_PRINCIPAL = {
  'arian-burguillo': 'POR', 'gilbert-natanael-de-jesus': 'CEN', 'junior-de-jesus': 'DEL', 'luis-nunez': 'MED',
  'alejandro-cuevas': 'DEL', 'fidel-escalante-mateo': 'CEN', 'piero-malasquez': 'CEN', 'alfa-junior-umaro': 'BAN',
  'eloy-marte': 'BAN', 'sebas-rodriguez-yanez': 'BAN', 'esteban-morales': 'MED', 'jefferson-marte': 'MED', 'nacho-escalante': 'BAN'
};

/* ---------- Puesta en marcha ---------- */
function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('revisar').timeBased().everyHours(1).create();
  // Las jornadas que ya tienen puntos no se vuelven a enviar
  var T = datosWeb_(), props = PropertiesService.getScriptProperties();
  Object.keys(T.PARTIDOS || {}).forEach(function (n) { props.setProperty('puntos-j' + n, 'ya estaba'); });
  Logger.log('Listo: revisaré cada hora. Avisos activos: ' + avisos_().length);
}

function enviarPrueba() {
  var yo = Session.getActiveUser().getEmail();
  var c = contexto_(), j = proximaJornada_(c.jornadas);
  if (!j) { Logger.log('No hay jornadas abiertas'); return; }
  var a = { email: yo, nombre: 'Prueba', uid: '__prueba__' };
  enviar_(a, recordatorio_(a, j, equipoDe_(c, a.uid, j.n), c));
  Logger.log('Enviado a ' + yo);
}

/* ---------- Cada hora ---------- */
function revisar() {
  var props = PropertiesService.getScriptProperties();
  var c = contexto_();
  if (!c.avisos.length) return;
  var ahora = new Date();
  c.jornadas.forEach(function (j) {
    var horas = (j.cierre - ahora) / 36e5;
    if (horas <= 25 && horas > 3 && !props.getProperty('recordatorio-j' + j.n)) {
      c.avisos.forEach(function (a) { enviar_(a, recordatorio_(a, j, equipoDe_(c, a.uid, j.n), c)); });
      props.setProperty('recordatorio-j' + j.n, ahora.toISOString());
    }
    if (horas <= 3 && horas > 0 && !props.getProperty('ultimo-j' + j.n)) {
      c.avisos.filter(function (a) { return !equipoDe_(c, a.uid, j.n); })
        .forEach(function (a) { enviar_(a, ultimoAviso_(a, j)); });
      props.setProperty('ultimo-j' + j.n, ahora.toISOString());
    }
    if (c.T.PARTIDOS && c.T.PARTIDOS[j.n] && ahora > j.inicio && !props.getProperty('puntos-j' + j.n)) {
      var tabla = clasificacion_(c, j.n);
      c.avisos.forEach(function (a) { enviar_(a, puntos_(a, j, c, tabla)); });
      props.setProperty('puntos-j' + j.n, ahora.toISOString());
    }
  });
}

/* ---------- Datos ---------- */
function contexto_() {
  var jornadas = listar_('quinielas').map(function (d) {
    return { n: d.n, partido: d.partido, inicio: new Date(d.inicio), cierre: new Date(d.cierre) };
  }).filter(function (j) { return j.n >= PRIMERA; }).sort(function (a, b) { return a.n - b.n; });
  var equipos = {};
  var hasta = proximaJornada_(jornadas) ? proximaJornada_(jornadas).n : (jornadas.length ? jornadas[jornadas.length - 1].n : PRIMERA);
  jornadas.forEach(function (j) { if (j.n <= hasta) equipos[j.n] = mapa_(listarConId_('fantasy/j' + j.n + '/equipos')); });
  return { jornadas: jornadas, equipos: equipos, avisos: avisos_(), T: datosWeb_() };
}
function avisos_() {
  return listarConId_('avisos').filter(function (x) { return x.datos.activo && x.datos.email; })
    .map(function (x) { return { uid: x.id, email: x.datos.email, nombre: x.datos.nombre || '' }; });
}
function proximaJornada_(jornadas) {
  var ahora = new Date();
  for (var i = 0; i < jornadas.length; i++) if (jornadas[i].cierre > ahora) return jornadas[i];
  return null;
}
function equipoDe_(c, uid, n) {
  for (var k = n; k >= PRIMERA; k--) if (c.equipos[k] && c.equipos[k][uid]) return c.equipos[k][uid];
  return null;
}
function datosWeb_() {
  var txt = UrlFetchApp.fetch(WEB + 'js/jugadores-datos.js?t=' + Date.now()).getContentText();
  return new Function('window', txt + '\n;return window.TINELLERS;')({});
}
function jugador_(T, id) {
  var j = (T.JUGADORES || []).filter(function (x) { return x.id === id; })[0];
  return { id: id, corto: CORTOS[id] || (j ? j.nombre.split(' ')[0] : id), nombre: j ? j.nombre : id, datos: j };
}
function posEnEquipo_(e, i) {
  var f = FORMACIONES[e.formacion];
  return f ? f[i] : (POS_PRINCIPAL[e.jugadores[i]] || 'MED');
}
function puntosJugador_(T, id, n, pos) {
  if (!T.PARTIDOS || !T.PARTIDOS[n]) return null;
  var j = jugador_(T, id).datos, r = j && j.jornadas && j.jornadas[n];
  if (!r || r.estado) return 0;
  var g = GRUPO[pos] || 'MED', gc = T.PARTIDOS[n].gc;
  var enc = typeof gc !== 'number' ? 0 : gc === 0 ? TABLA.porteria0[g] : gc >= 2 ? -gc : 0;
  return (r.titular === true ? PUNTOS.titular : 0) + TABLA.gol[g] * (r.goles || 0) + TABLA.asistencia[g] * (r.asistencias || 0) +
    TABLA.tiros2[g] * Math.floor((r.tiros || 0) / 2) + enc + (r.mvp ? PUNTOS.mvp : 0);
}
function puntosEquipo_(T, e, n) {
  if (!e) return null;
  var detalle = e.jugadores.map(function (id, i) {
    var b = puntosJugador_(T, id, n, posEnEquipo_(e, i)) || 0, cap = id === e.capitan;
    return { id: id, base: b, cap: cap, pts: cap ? b * PUNTOS.capitan : b };
  });
  return { total: detalle.reduce(function (s, x) { return s + x.pts; }, 0), detalle: detalle };
}
function clasificacion_(c, hastaN) {
  var uids = {};
  Object.keys(c.equipos).forEach(function (n) { Object.keys(c.equipos[n]).forEach(function (u) { uids[u] = true; }); });
  var filas = Object.keys(uids).map(function (uid) {
    var total = 0, nombre = '';
    c.jornadas.forEach(function (j) {
      if (j.n > hastaN) return;
      var e = equipoDe_(c, uid, j.n); if (!e) return;
      nombre = e.nombre || nombre;
      if (c.T.PARTIDOS && c.T.PARTIDOS[j.n]) total += puntosEquipo_(c.T, e, j.n).total;
    });
    return { uid: uid, nombre: nombre || 'Sin nombre', total: total };
  }).sort(function (a, b) { return b.total - a.total || a.nombre.localeCompare(b.nombre); });
  filas.forEach(function (f, i) { f.pos = i > 0 && filas[i - 1].total === f.total ? filas[i - 1].pos : i + 1; });
  return filas;
}

/* ---------- Correos ---------- */
function recordatorio_(a, j, e, c) {
  var asunto = 'Fantasy Tinellers: la jornada ' + j.n + ' cierra ' + cuando_(j.cierre);
  var cuerpo = '<p>Hola ' + esc_(nombre_(a)) + ',</p>' +
    '<p>La <b>jornada ' + j.n + '</b> (' + esc_(j.partido) + ', ' + dia_(j.inicio) + ') cierra <b>' + cuando_(j.cierre) + '</b>. ' +
    'Después ya no se puede cambiar el equipo.</p>' +
    (e ? '<p>Ahora mismo juegas con:</p>' + listaEquipo_(c.T, e, null) + '<p>Si quieres hacer cambios, guárdalos antes del cierre.</p>'
       : '<p><b>Todavía no tienes equipo.</b> Si no lo haces antes del cierre, no sumarás puntos esta jornada.</p>');
  return { asunto: asunto, html: plantilla_(cuerpo, e ? 'Revisar mi equipo' : 'Hacer mi equipo') };
}
function ultimoAviso_(a, j) {
  return {
    asunto: 'Fantasy Tinellers: último aviso, cierra en 3 horas',
    html: plantilla_('<p>Hola ' + esc_(nombre_(a)) + ',</p><p>La jornada ' + j.n + ' cierra a las <b>' + hora_(j.cierre) +
      '</b> y todavía no tienes equipo. Te da tiempo: son cinco jugadores y un capitán.</p>', 'Hacer mi equipo')
  };
}
function puntos_(a, j, c, tabla) {
  var e = equipoDe_(c, a.uid, j.n), yo = tabla.filter(function (f) { return f.uid === a.uid; })[0];
  var p = e ? puntosEquipo_(c.T, e, j.n) : null;
  var top = tabla.slice(0, 3).map(function (f) { return f.pos + 'º ' + esc_(f.nombre) + ' · ' + f.total + ' pts'; }).join('<br>');
  var cuerpo = '<p>Hola ' + esc_(nombre_(a)) + ',</p>' +
    (p ? '<p>En la <b>jornada ' + j.n + '</b> has sumado <b style="font-size:20px">' + p.total + ' puntos</b>.</p>' + listaEquipo_(c.T, e, p) +
         (yo ? '<p>Vas <b>' + yo.pos + 'º de ' + tabla.length + '</b> con ' + yo.total + ' puntos en total.</p>' : '')
       : '<p>Ya están los puntos de la <b>jornada ' + j.n + '</b>. Esta vez no tenías equipo, pero aún llegas a la siguiente.</p>') +
    '<p style="color:#39446a">Clasificación:<br>' + top + '</p>';
  return { asunto: 'Fantasy Tinellers: ' + (p ? 'has sumado ' + p.total + ' puntos' : 'puntos') + ' en la jornada ' + j.n, html: plantilla_(cuerpo, 'Ver la clasificación') };
}
function listaEquipo_(T, e, p) {
  var pos = e.jugadores.map(function (id, i) { return posEnEquipo_(e, i); });
  return '<table style="border-collapse:collapse;margin:8px 0 16px">' + e.jugadores.map(function (id, i) {
    var x = p ? p.detalle[i] : null;
    return '<tr><td style="padding:4px 12px 4px 0;color:#39446a;font-size:13px">' + (pos[i] ? POS[pos[i]] : '') + '</td>' +
      '<td style="padding:4px 12px 4px 0"><b>' + esc_(jugador_(T, id).nombre) + '</b>' + (id === e.capitan ? ' (capitán)' : '') + '</td>' +
      (x ? '<td style="padding:4px 0;text-align:right"><b>' + x.pts + '</b></td>' : '') + '</tr>';
  }).join('') + '</table>';
}
function plantilla_(cuerpo, boton) {
  return '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#070d26;max-width:520px">' +
    '<p style="font-size:22px;font-weight:bold;margin:0 0 16px">FANTASY TINELLERS</p>' + cuerpo +
    '<p style="margin:24px 0"><a href="' + FANTASY + '" style="background:#d2111f;color:#fff;padding:12px 22px;text-decoration:none;font-weight:bold">' + boton + '</a></p>' +
    '<p style="font-size:12px;color:#39446a">Recibes este correo porque marcaste "Avisarme por correo" en el fantasy. ' +
    'Para dejar de recibirlo, entra en el fantasy y desmarca esa opción.</p></div>';
}
function enviar_(a, m) {
  try { MailApp.sendEmail({ to: a.email, subject: m.asunto, htmlBody: m.html, name: 'Fantasy Tinellers' }); }
  catch (err) { Logger.log('No se pudo enviar a ' + a.email + ': ' + err); }
}

/* ---------- Firestore (con la cuenta del administrador) ---------- */
function pedir_(url) {
  var r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'x-goog-user-project': PROYECTO }, muteHttpExceptions: true });
  if (r.getResponseCode() === 404) return {};
  if (r.getResponseCode() !== 200) throw new Error('Firestore ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText());
}
function listarConId_(ruta) {
  var out = [], token = '';
  do {
    var r = pedir_(BASE + ruta + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    (r.documents || []).forEach(function (d) { out.push({ id: d.name.split('/').pop(), datos: campos_(d.fields || {}) }); });
    token = r.nextPageToken || '';
  } while (token);
  return out;
}
function listar_(ruta) { return listarConId_(ruta).map(function (x) { return x.datos; }); }
function mapa_(lista) { var m = {}; lista.forEach(function (x) { m[x.id] = x.datos; }); return m; }
function campos_(f) { var o = {}; Object.keys(f).forEach(function (k) { o[k] = valor_(f[k]); }); return o; }
function valor_(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valor_);
  if ('mapValue' in v) return campos_(v.mapValue.fields || {});
  return null;
}

/* ---------- Fechas en español (hora de Madrid) ---------- */
var DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function f_(d, p) { return Utilities.formatDate(d, 'Europe/Madrid', p); }
function dia_(d) { return DIAS[Number(f_(d, 'u'))] + ' ' + Number(f_(d, 'd')) + ' de ' + MESES[Number(f_(d, 'M')) - 1]; }
function hora_(d) { return f_(d, 'HH:mm'); }
function cuando_(d) { return 'el ' + dia_(d) + ' a las ' + hora_(d); }
function nombre_(a) { return (a.nombre || '').split(' ')[0] || 'crack'; }
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
