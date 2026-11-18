/* Ejecuta los 3 flujos Cosemar sin n8n (GitHub Actions o local).
 * Usa EXACTAMENTE el código de los nodos de n8n/produccion/*.json (generados por n8n/build.js) y reproduce
 * la semántica de los nodos HTTP: paginación del libro, reintentos y «continuar si falla».
 *
 * Uso: node acciones/ejecutor.js ingesta | avisos | reproceso | revisar
 * Variables (secretos de GitHub):
 *   NOTION_TOKEN            integración de Notion con acceso a «Cosemar · Libro de control» y «Comunicaciones» (obligatoria)
 *   GOOGLE_SA_JSON          JSON de cuenta de servicio con lectura de las carpetas del expediente (opcional: sin ella se omite Drive)
 *   AVISOS_PARA, AVISOS_CC  destinatarios de los avisos
 *   GMAIL_USUARIO, GMAIL_CLAVE_APP  cuenta y contraseña de aplicación para enviar los avisos por SMTP
 *   EVENTOS_JSON            (opcional, solo ingesta) cuerpo {eventos:[...]} o {documentos:[...]}, equivale al webhook /cosemar/evento
 * Variables de prueba: COSEMAR_BASE (API simulada), COSEMAR_HOY, COSEMAR_CORREO_PRUEBA (buzón simulado). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const RAIZ = path.join(__dirname, '..');
const leerFlujo = n => JSON.parse(fs.readFileSync(path.join(RAIZ, 'n8n/produccion', n), 'utf8'));
const FLUJOS = { ingesta: leerFlujo('cosemar_1_ingesta.json'), avisos: leerFlujo('cosemar_2_avisos.json'), reproceso: leerFlujo('cosemar_3_reproceso.json') };
const nodo = (w, nombre) => { const n = w.nodes.find(x => x.name === nombre); if (!n) throw new Error('No existe el nodo «' + nombre + '» en ' + w.name); return n; };
const esperar = ms => new Promise(r => setTimeout(r, ms));

// ---------- Configuración: la misma del nodo «Config», con ajustes por variable de entorno ----------
function configuracion() {
  const cfg = JSON.parse(nodo(FLUJOS.ingesta, 'Config').parameters.jsonOutput);
  const E = process.env;
  if (E.COSEMAR_BASE) { cfg.notionBase = E.COSEMAR_BASE; cfg.driveBase = E.COSEMAR_BASE; cfg.contratoPagina = null; }
  if (E.COSEMAR_HOY) cfg.hoy = E.COSEMAR_HOY;
  cfg.avisosPara = E.AVISOS_PARA || '';
  cfg.avisosCc = E.AVISOS_CC || '';
  cfg.ingestaUrl = 'interno:ingesta';
  return cfg;
}

// ---------- Nodo Code: mismo texto que en n8n, con $() y $input ----------
function codigo(w, nombre, ctx, entrada) {
  const js = nodo(w, nombre).parameters.jsCode;
  const $ = n => { const it = ctx[n]; if (!it) throw new Error("Node '" + n + "' hasn't been executed"); return { all: () => it, first: () => it[0] }; };
  const $input = { all: () => entrada || [], first: () => (entrada || [])[0] };
  const salida = new Function('$', '$input', 'require', js)($, $input, require);
  return (salida || []).map(i => ({ json: i.json }));
}

// ---------- Credenciales ----------
let tokenDrive = null;
async function accesoDrive() {
  if (process.env.COSEMAR_BASE) return null;
  if (tokenDrive) return tokenDrive;
  const sa = JSON.parse(process.env.GOOGLE_SA_JSON);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url'), ahora = Math.floor(Date.now() / 1000);
  const sin = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/drive.readonly', aud: 'https://oauth2.googleapis.com/token', iat: ahora, exp: ahora + 3600 });
  const firma = crypto.createSign('RSA-SHA256').update(sin).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + sin + '.' + firma });
  const j = await r.json(); if (!j.access_token) throw new Error('Google no entregó token: ' + JSON.stringify(j).slice(0, 200));
  return (tokenDrive = j.access_token);
}
function cabeceras(cfg, url) {
  const h = { 'content-type': 'application/json', accept: 'application/json' };
  if (url.startsWith(cfg.notionBase)) { h['Notion-Version'] = '2022-06-28'; if (process.env.NOTION_TOKEN) h.authorization = 'Bearer ' + process.env.NOTION_TOKEN; }
  return h;
}

// ---------- Nodo HTTP: reintentos y, si corresponde, «continuar si falla» (devuelve {error}) ----------
async function http(cfg, { method, url, body, query }, { intentos = 1, espera = 1000, continuar = false } = {}) {
  let u = url; if (query) u += '?' + new URLSearchParams(query).toString();
  const h = cabeceras(cfg, url);
  if (url.startsWith(cfg.driveBase + '/drive')) { const t = await accesoDrive(); if (t) h.authorization = 'Bearer ' + t; }
  let ultimo;
  for (let i = 1; i <= intentos; i++) {
    try {
      const r = await fetch(u, { method, headers: h, body: body == null || method === 'GET' ? undefined : JSON.stringify(body) });
      const t = await r.text(); let j; try { j = t ? JSON.parse(t) : {}; } catch (e) { j = { raw: t.slice(0, 300) }; }
      if (r.ok) return j;
      ultimo = new Error(r.status + ' - ' + JSON.stringify(j).slice(0, 300));
    } catch (e) { ultimo = e; }
    if (i < intentos) await esperar(espera);
  }
  if (continuar) return { error: { message: ultimo.message } };
  throw ultimo;
}
const itemsHttp = async (cfg, entrada, opciones) => { const out = []; for (const i of entrada) out.push({ json: await http(cfg, i.json, opciones) }); return out; };
const ESCRIBIR = { intentos: 3, espera: 1500, continuar: true };

async function leerLibro(cfg) {
  const out = []; let cursor;
  for (let n = 0; n < 100; n++) {
    const j = await http(cfg, { method: 'POST', url: cfg.notionBase + '/v1/databases/' + cfg.libroDb + '/query', body: Object.assign({ page_size: 100 }, cursor ? { start_cursor: cursor } : {}) }, { intentos: 3, espera: 2000 });
    out.push({ json: j }); if (!j.has_more) break; cursor = j.next_cursor;
  }
  return out;
}

// ---------- 1 · Ingesta y validación ----------
async function ingesta(cuerpo) {
  const w = FLUJOS.ingesta, cfg = configuracion(), ctx = { Config: [{ json: cfg }] };
  if (cuerpo) ctx['Webhook evento'] = [{ json: { body: cuerpo } }];
  ctx['Notion: leer libro'] = await leerLibro(cfg);
  ctx.Cursor = codigo(w, 'Cursor', ctx, ctx['Notion: leer libro']);
  const q = ctx.Cursor[0].json.q;
  if (process.env.COSEMAR_BASE || process.env.GOOGLE_SA_JSON) {
    ctx['Drive: archivos nuevos'] = [{ json: await http(cfg, { method: 'GET', url: cfg.driveBase + '/drive/v3/files', query: { q, fields: 'files(id,name,mimeType,modifiedTime,webViewLink,parents)', pageSize: '200', orderBy: 'modifiedTime', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' } }, { intentos: 2, espera: 2000, continuar: true }) }];
  } else ctx['Drive: archivos nuevos'] = [{ json: { files: [] } }];
  ctx['Notion: comunicaciones'] = [{ json: await http(cfg, { method: 'POST', url: cfg.notionBase + '/v1/databases/' + cfg.comunicacionesDb + '/query', body: { page_size: 100, filter: { timestamp: 'last_edited_time', last_edited_time: { on_or_after: ctx.Cursor[0].json.desde } } } }, { intentos: 2, espera: 1000, continuar: true }) }];
  ctx['Motor: clasificar y decidir'] = codigo(w, 'Motor: clasificar y decidir', ctx, ctx['Notion: comunicaciones']);
  if (!ctx['Motor: clasificar y decidir'][0].json.noop) ctx['Notion: escribir'] = await itemsHttp(cfg, ctx['Motor: clasificar y decidir'], ESCRIBIR);
  const cierre = 'Cierre: errores y marca de sincronización';
  ctx[cierre] = codigo(w, cierre, ctx, ctx['Notion: escribir'] || ctx['Motor: clasificar y decidir']);
  ctx['Notion: cierre'] = await itemsHttp(cfg, ctx[cierre], ESCRIBIR);
  const inf = codigo(w, 'Informe', ctx, ctx['Notion: cierre'])[0].json;
  if (!process.env.GOOGLE_SA_JSON && !process.env.COSEMAR_BASE) inf.drive = 'omitido: falta el secreto GOOGLE_SA_JSON';
  return inf;
}

// ---------- 2 · Vencimientos y avisos ----------
async function enviarCorreo(cfg, m) {
  if (process.env.COSEMAR_CORREO_PRUEBA) return http(cfg, { method: 'POST', url: process.env.COSEMAR_CORREO_PRUEBA, body: m });
  const E = process.env;
  if (!E.GMAIL_USUARIO || !E.GMAIL_CLAVE_APP || !m.para) throw new Error('Faltan secretos para enviar correo: ' + ['AVISOS_PARA', 'GMAIL_USUARIO', 'GMAIL_CLAVE_APP'].filter(k => !E[k]).join(', '));
  const smtp = E.COSEMAR_SMTP_PRUEBA ? { host: '127.0.0.1', port: +E.COSEMAR_SMTP_PRUEBA, secure: false, ignoreTLS: true } : { host: 'smtp.gmail.com', port: 465, secure: true };
  const t = require('nodemailer').createTransport(Object.assign(smtp, { auth: { user: E.GMAIL_USUARIO, pass: E.GMAIL_CLAVE_APP } }));
  const r = await t.sendMail({ from: '"Control Cosemar" <' + E.GMAIL_USUARIO + '>', to: m.para, cc: cfg.avisosCc || undefined, subject: m.asunto, html: m.html });
  return { enviado: r.messageId, aceptados: r.accepted.length };
}
async function avisos() {
  const w = FLUJOS.avisos, cfg = configuracion(), ctx = { Config: [{ json: cfg }] };
  // Sin forma de enviar el correo no se registran avisos: si se registraran, no se volverían a enviar.
  if (!process.env.COSEMAR_CORREO_PRUEBA) { const falta = ['AVISOS_PARA', 'GMAIL_USUARIO', 'GMAIL_CLAVE_APP'].filter(k => !process.env[k]); if (falta.length) return { omitido: true, motivo: 'faltan secretos: ' + falta.join(', ') }; }
  ctx['Notion: leer libro'] = await leerLibro(cfg);
  ctx['Motor: avisos'] = codigo(w, 'Motor: avisos', ctx, ctx['Notion: leer libro']);
  if (ctx['Motor: avisos'][0].json.noop) return ctx['Motor: avisos'][0].json;
  ctx['Notion: registrar aviso'] = await itemsHttp(cfg, ctx['Motor: avisos'], ESCRIBIR);
  const msj = codigo(w, 'Componer mensaje', ctx, ctx['Notion: registrar aviso']);
  if (!msj.length) return { avisos: 0, mensaje: 'ningún aviso quedó registrado' };
  const env = await enviarCorreo(cfg, msj[0].json);
  return { avisos: msj[0].json.total, asunto: msj[0].json.asunto, envio: env };
}

// ---------- 3 · Reproceso de errores ----------
async function reproceso() {
  const w = FLUJOS.reproceso, cfg = configuracion(), ctx = { Config: [{ json: cfg }] };
  ctx['Notion: leer libro'] = await leerLibro(cfg);
  ctx['Preparar reproceso'] = codigo(w, 'Preparar reproceso', ctx, ctx['Notion: leer libro']);
  if (ctx['Preparar reproceso'][0].json.noop) return ctx['Preparar reproceso'][0].json;
  const res = [];
  for (const i of ctx['Preparar reproceso']) {
    if (i.json.url === cfg.ingestaUrl) { try { res.push({ json: await ingesta(i.json.body) }); } catch (e) { res.push({ json: { error: { message: e.message } } }); } }
    else res.push({ json: await http(cfg, i.json, { intentos: 2, espera: 2000, continuar: true }) });
  }
  const marcar = codigo(w, 'Marcar resueltos', ctx, res);
  if (marcar[0].json.noop) return Object.assign({ reprocesados: res.length }, marcar[0].json);
  const cerr = await itemsHttp(cfg, marcar, ESCRIBIR);
  return { reprocesados: res.length, resueltos: cerr.filter(x => !x.json.error).length };
}

// ---------- Revisión de configuración (no escribe nada) ----------
function revisar() {
  const E = process.env, falta = [];
  if (!E.NOTION_TOKEN) falta.push('NOTION_TOKEN (libro de control; sin él no corre nada)');
  ['AVISOS_PARA', 'GMAIL_USUARIO', 'GMAIL_CLAVE_APP'].forEach(k => { if (!E[k]) falta.push(k + ' (avisos por correo)'); });
  if (!E.GOOGLE_SA_JSON) falta.push('GOOGLE_SA_JSON (opcional: lectura de Drive)');
  return { listo: !!E.NOTION_TOKEN, falta };
}

module.exports = { ingesta, avisos, reproceso, revisar, configuracion };

if (require.main === module) {
  const cmd = process.argv[2], E = process.env;
  const resumen = t => { if (E.GITHUB_STEP_SUMMARY) fs.appendFileSync(E.GITHUB_STEP_SUMMARY, t + '\n'); };
  (async () => {
    if (!['ingesta', 'avisos', 'reproceso', 'revisar'].includes(cmd)) throw new Error('Uso: node acciones/ejecutor.js ingesta|avisos|reproceso|revisar');
    const rev = revisar();
    if (cmd === 'revisar' || (!rev.listo && !E.COSEMAR_BASE)) {
      const t = (rev.listo ? 'Configuración lista' : 'Sin NOTION_TOKEN: no se ejecuta nada') + (rev.falta.length ? ' · faltan: ' + rev.falta.join('; ') : '');
      console.log(t); resumen('### Cosemar · ' + cmd + '\n' + t); return;
    }
    let cuerpo = null; if (cmd === 'ingesta' && E.EVENTOS_JSON) cuerpo = JSON.parse(E.EVENTOS_JSON);
    const r = cmd === 'ingesta' ? await ingesta(cuerpo) : cmd === 'avisos' ? await avisos() : await reproceso();
    const t = JSON.stringify(r, null, 1); console.log(t);
    resumen('### Cosemar · ' + cmd + '\n```json\n' + t + '\n```' + (rev.falta.length ? '\nFaltan secretos: ' + rev.falta.join('; ') : ''));
    if (cmd === 'ingesta' && r.exito === false) process.exitCode = 1;
  })().catch(e => { console.error('ERROR', e.message); resumen('### Cosemar · ' + cmd + '\nERROR: ' + e.message); process.exit(1); });
}
