/* Vigilante del control Cosemar: lo corre GitHub Actions cada hora (.github/workflows/actualizar-app.yml).
   1) Lee Gmail (acciones/gmail.js)  2) regenera datos y la app (datos/operacion.js, datos/construir_app.js)
   3) calcula las alertas de la app (acciones/alertas.js)  4) envía UN correo solo si hay novedades o alertas que no se habían avisado.
   Secretos: GMAIL_USUARIO, GMAIL_CLAVE_APP (lectura IMAP y envío SMTP), AVISOS_PARA, AVISOS_CC (opcional).
   Prueba sin enviar: VIGILANTE_CORREO_PRUEBA=<archivo> escribe el correo ahí en vez de mandarlo. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const RAIZ = path.join(__dirname, '..'), AVISADOS = path.join(RAIZ, 'datos/auto/avisados.json');
const APP = 'https://edgarortegariquelme.github.io/tablero-cosemar-recoleccion/';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function construir() { for (const f of ['datos/operacion.js', 'datos/construir_app.js']) execFileSync(process.execPath, [path.join(RAIZ, f)], { stdio: 'inherit', cwd: RAIZ }); }

function correoHTML(novedades, nuevas, abiertas) {
  const nom = { rec: 'Recolección', df: 'Disposición final' }, col = { alta: '#b3261e', media: '#9a6700', info: '#2f6db3' };
  let h = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2328;max-width:680px">';
  if (novedades.length) h += '<h3 style="margin:0 0 8px">Novedades en Gmail</h3><ul>' + novedades.map(n => '<li><b>' + esc(n.tipo) + ':</b> ' + esc(n.texto) + (n.enlace ? ' · <a href="' + esc(n.enlace) + '">abrir</a>' : '') + '</li>').join('') + '</ul>';
  if (nuevas.length) h += '<h3 style="margin:16px 0 8px">Alertas nuevas</h3><ul>' + nuevas.map(a => '<li><span style="color:' + col[a.nivel] + ';font-weight:bold">' + (a.nivel === 'alta' ? 'Urgente' : a.nivel === 'media' ? 'Atento' : 'Próximo') + '</span> · ' + nom[a.contrato] + ': ' + esc(a.texto) + '</li>').join('') + '</ul>';
  h += '<p style="color:#59636e">Alertas abiertas en total: ' + abiertas + '. Detalle, pagos, multas, flota y personal en la app: <a href="' + APP + '">' + APP + '</a></p>';
  return h + '<p style="color:#59636e;font-size:12px">Aviso automático del control contractual Cosemar (DMAO). Solo llega cuando hay algo nuevo.</p></div>';
}

async function enviar(asunto, html) {
  const E = process.env;
  if (E.VIGILANTE_CORREO_PRUEBA) { fs.writeFileSync(E.VIGILANTE_CORREO_PRUEBA, JSON.stringify({ para: E.AVISOS_PARA, cc: E.AVISOS_CC, asunto, html }, null, 1)); return 'prueba'; }
  if (E.GMAIL_PUENTE_URL) {   // el puente de Apps Script envía desde tu Gmail a ti mismo, con copia @maho.cl
    const r = await fetch(E.GMAIL_PUENTE_URL, { method: 'POST', redirect: 'follow', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ asunto, html, cc: E.AVISOS_CC || '' }) });
    const j = await r.json().catch(() => ({})); if (!j.enviado) throw new Error('El puente no envió el correo: ' + (j.error || r.status));
    return 'puente';
  }
  if (!E.GMAIL_USUARIO || !E.GMAIL_CLAVE_APP || !E.AVISOS_PARA) return null;
  const t = require('nodemailer').createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: E.GMAIL_USUARIO, pass: E.GMAIL_CLAVE_APP } });
  const r = await t.sendMail({ from: '"Control Cosemar" <' + E.GMAIL_USUARIO + '>', to: E.AVISOS_PARA, cc: E.AVISOS_CC || undefined, subject: asunto, html });
  return r.messageId;
}

(async () => {
  const informe = {};
  try { informe.gmail = await require('./gmail').ingestar(); }
  catch (e) { informe.gmail = { error: e.message, novedades: [] }; console.error('Gmail:', e.message); }   // si Gmail falla, la app igual se reconstruye
  construir();
  const { alertas, clave } = require('./alertas'), todas = alertas();
  let av = {}; try { av = JSON.parse(fs.readFileSync(AVISADOS, 'utf8')); } catch (e) {}
  const nuevas = todas.filter(a => !av[clave(a)]), novedades = informe.gmail.novedades || [];
  informe.alertas = { total: todas.length, nuevas: nuevas.length }; informe.novedades = novedades.length;
  if (nuevas.length || novedades.length) {
    const asunto = 'Cosemar · ' + [novedades.length && novedades.length + (novedades.length === 1 ? ' novedad' : ' novedades'), nuevas.length && nuevas.length + (nuevas.length === 1 ? ' alerta nueva' : ' alertas nuevas')].filter(Boolean).join(' y ');
    const id = await enviar(asunto, correoHTML(novedades, nuevas, todas.length));
    informe.correo = id ? 'enviado: ' + asunto : 'no enviado: falta el secreto GMAIL_PUENTE_URL';
    if (id) { const hoy = new Date().toISOString().slice(0, 10); nuevas.forEach(a => { av[clave(a)] = hoy; }); }
  } else informe.correo = 'sin novedades: no se envía nada';
  // Se olvidan las alertas que ya no están, para avisar de nuevo si reaparecen.
  const vivas = new Set(todas.map(clave)); Object.keys(av).forEach(k => { if (!vivas.has(k)) delete av[k]; });
  fs.mkdirSync(path.dirname(AVISADOS), { recursive: true }); fs.writeFileSync(AVISADOS, JSON.stringify(av, null, 1) + '\n');
  console.log(JSON.stringify(informe, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
