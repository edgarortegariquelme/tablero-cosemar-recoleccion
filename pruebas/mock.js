/* Servidor de prueba: imita la API de Notion (consulta, creación y edición de filas), el listado de Drive y un buzón de avisos.
 * Permite inyectar fallas temporales para probar reintentos y reproceso. Solo para pruebas locales. */
const http = require('http'), fs = require('fs'), path = require('path');
const M = require('../motor/motor.js'); eval(fs.readFileSync(path.join(__dirname, '../n8n/glue.js'), 'utf8'));
let seq = 0, pages = [], mails = [], ctl = { driveFiles: [], comunicaciones: [], failClaves: {}, driveDown: false, log: [] };
const nid = () => 'pg-' + String(++seq).padStart(5, '0');
function seed() { seq = 0; pages = require('../datos/semilla.js').map(e => ({ object: 'page', id: nid(), url: 'https://mock.notion/' + seq, created_time: '2026-11-16T12:00:00.000Z', last_edited_time: '2026-11-16T12:00:00.000Z', properties: aPropiedades(Object.assign({}, e, { huella: '' })) })); mails = []; ctl = { driveFiles: [], comunicaciones: [], failClaves: {}, driveDown: false, log: [] }; }
seed();
const body = req => new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { r(b ? JSON.parse(b) : {}); } catch (e) { r({}); } }); });
const send = (res, code, o) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(o)); };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), b = await body(req); let m;
  if (req.method === 'POST' && (m = /^\/v1\/databases\/([^/]+)\/query$/.exec(u.pathname))) {
    if (m[1] === '27091b1e60d74952939c54967147e178') return send(res, 200, { object: 'list', results: ctl.comunicaciones, has_more: false, next_cursor: null });
    const start = b.start_cursor ? +b.start_cursor : 0, size = Math.min(b.page_size || 100, 100), slice = pages.slice(start, start + size), more = start + size < pages.length;
    return send(res, 200, { object: 'list', results: slice, has_more: more, next_cursor: more ? String(start + size) : null });
  }
  if (req.method === 'POST' && u.pathname === '/v1/pages') {
    const clave = txt(b.properties && b.properties['Clave']);
    if (ctl.failClaves[clave] > 0) { ctl.failClaves[clave]--; ctl.log.push('503 ' + clave); return send(res, 503, { object: 'error', status: 503, code: 'service_unavailable', message: 'Falla temporal simulada' }); }
    const pg = { object: 'page', id: nid(), url: 'https://mock.notion/' + seq, created_time: new Date().toISOString(), last_edited_time: new Date().toISOString(), properties: b.properties }; pages.push(pg); return send(res, 200, pg);
  }
  if (req.method === 'PATCH' && (m = /^\/v1\/pages\/([^/]+)$/.exec(u.pathname))) { const pg = pages.find(p => p.id === m[1]); if (!pg) return send(res, 404, { object: 'error', status: 404, message: 'no existe' }); Object.assign(pg.properties, b.properties); pg.last_edited_time = new Date().toISOString(); return send(res, 200, pg); }
  if (req.method === 'GET' && u.pathname === '/drive/v3/files') { if (ctl.driveDown) return send(res, 500, { error: { code: 500, message: 'Drive no disponible (simulado)' } }); return send(res, 200, { files: ctl.driveFiles, q: u.searchParams.get('q') }); }
  if (req.method === 'POST' && u.pathname === '/sink/mail') { mails.push(b); return send(res, 200, { ok: true, n: mails.length }); }
  if (req.method === 'POST' && u.pathname === '/_ctl') { if (b.reset) seed(); Object.assign(ctl, b.set || {}); return send(res, 200, { ok: true }); }
  if (req.method === 'GET' && u.pathname === '/_state') return send(res, 200, { eventos: pages.map(aEvento), mails, log: ctl.log });
  send(res, 404, { error: 'ruta no simulada: ' + req.method + ' ' + u.pathname });
}).listen(8787, '127.0.0.1', () => console.log('mock en 8787'));
