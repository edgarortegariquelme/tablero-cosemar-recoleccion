/**
 * Puente Gmail ↔ Control Cosemar (Google Apps Script, corre en tu propia cuenta de Google; no usa contraseñas).
 * - GET  ?k=CLAVE&desde=AAAA-MM-DD  → devuelve en JSON los correos del contrato desde esa fecha (con los adjuntos de RT y manifolds).
 * - POST ?k=CLAVE  {asunto, html, cc} → envía el aviso desde tu Gmail A TI MISMO (cc solo a direcciones @maho.cl).
 * Instalación (una vez): pegar este código en script.google.com → Implementar → Nueva implementación → Aplicación web
 * (Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario) → autorizar → ejecutar «enlace» y guardar en el secreto
 * GMAIL_PUENTE_URL de GitHub la URL de la aplicación web (termina en /exec) seguida de ?k=CLAVE. Quien no tenga la clave del enlace no obtiene nada.
 */
var BUSQUEDA = '(from:grupoebi.cl OR to:grupoebi.cl OR cc:grupoebi.cl OR from:hgomez@maho.cl OR subject:cosemar OR "3447-86-LR23" OR "3447-187-LR24" OR subject:manifold)';
var CON_ADJUNTOS = /revisi[oó]n\s+t[eé]cnica|manifold/i;

function clave_() {
  var p = PropertiesService.getScriptProperties(), k = p.getProperty('CLAVE');
  if (!k) { k = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); p.setProperty('CLAVE', k); }
  return k;
}
function salida_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function autorizado_(e) { return e && e.parameter && e.parameter.k === clave_(); }

/** Ejecuta esta función después de implementar: deja en el registro la clave que va al final del enlace para GitHub.
 *  El enlace completo es la «URL de la aplicación web» (Implementar → Gestionar implementaciones; termina en /exec) + ?k=CLAVE. */
function enlace() {
  Logger.log('Agrega esto al final de la URL de la aplicación web (la que termina en /exec):\n?k=' + clave_());
}

/** Cambia la clave (por ejemplo, si se compartió el enlace). El enlace anterior deja de funcionar al instante. */
function nuevaClave() {
  PropertiesService.getScriptProperties().deleteProperty('CLAVE');
  enlace();
}

function doGet(e) {
  if (!autorizado_(e)) return salida_({ error: 'no autorizado' });
  var desde = String(e.parameter.desde || '').match(/^\d{4}-\d{2}-\d{2}$/) ? e.parameter.desde : Utilities.formatDate(new Date(Date.now() - 2 * 864e5), 'America/Santiago', 'yyyy-MM-dd');
  var limite = new Date(desde + 'T00:00:00-04:00'), out = [];
  GmailApp.search('after:' + desde.replace(/-/g, '/') + ' ' + BUSQUEDA, 0, 100).forEach(function (t) {
    t.getMessages().forEach(function (m) {
      if (m.getDate() < limite || m.isInTrash()) return;
      var de = m.getFrom(), mm = de.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/), asunto = m.getSubject() || '';
      var adj = [];
      if (CON_ADJUNTOS.test(asunto) || m.getAttachments({ includeInlineImages: false }).some(function (a) { return /manifold/i.test(a.getName()); })) {
        m.getAttachments({ includeInlineImages: false }).forEach(function (a) {
          if (a.getSize() < 8e6 && /pdf|jpe?g|png/i.test(a.getName() + ' ' + a.getContentType())) adj.push({ nombre: a.getName(), tipo: a.getContentType(), b64: Utilities.base64Encode(a.getBytes()) });
        });
      }
      out.push({ id: m.getId(), hilo: t.getId(), fecha: m.getDate().toISOString(), de: { nombre: mm ? mm[1].trim() : '', correo: (mm ? mm[2] : de).trim().toLowerCase() },
        asunto: asunto, texto: (m.getPlainBody() || '').slice(0, 6000), adjuntos: adj });
    });
  });
  return salida_({ desde: desde, mensajes: out });
}

function doPost(e) {
  if (!autorizado_(e)) return salida_({ error: 'no autorizado' });
  var d = JSON.parse(e.postData.contents || '{}'), yo = Session.getEffectiveUser().getEmail();
  var cc = String(d.cc || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return /^[^@\s]+@maho\.cl$/i.test(x); }).join(',');
  GmailApp.sendEmail(yo, String(d.asunto || 'Control Cosemar').slice(0, 200), 'Abre este correo en formato HTML.', { htmlBody: String(d.html || ''), cc: cc || undefined, name: 'Control Cosemar' });
  return salida_({ enviado: true, cc: cc });
}
