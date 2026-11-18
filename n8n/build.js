/* Genera los flujos n8n (producción y variante de prueba local). Uso: node n8n/build.js */
const fs = require('fs'), path = require('path'), D = __dirname;
const motor = fs.readFileSync(path.join(D, '../motor/motor.js'), 'utf8'), glue = fs.readFileSync(path.join(D, 'glue.js'), 'utf8');
const pre = 'const __m = { exports: {} };\n(function (module) {\n' + motor + '\n})(__m);\nconst M = __m.exports;\n' + glue + '\n';
const code = f => pre + fs.readFileSync(path.join(D, f), 'utf8');
const NOTION = { libroDb: '41a9e3e655c08141b986d51c9090c499', comDb: '27091b1e60d74952939c54967147e178', contratoPagina: '4159e3e655c0810a974aec33d1bd63d4' };
const CARPETAS = { '11kjK9ibJ3DTL4CQU0tzBPuLHQD9zbOmm': '1. LICITACION RECOLECCION RSD 3447-86-LR23', '1S6PzQeBg6BWSCQnIdfaokWU-9OXF3Fx-': '1. MULTAS (PROCESOS SANCIONATORIOS)', '122zU1bsRlvC_jVNQFqdZMW2kVyYhXfzo': '2. PAGOS SERVICIOS 2026',
  '1eJrvdI2lkm6YtU-eR4rvDV6ipN-_BfVH': '2. PAGOS SERVICIOS 2026/9. SEPTIEMBRE 2026', '1204ZW0LRhGlJkoaRyah8wFf6u0UYuTtS': '2. PAGOS SERVICIOS 2026/10. OCTUBRE 2026', '1new6tELuK_9HDRqRkvCQaXYunKtBB-zy': '3. POLIZAS', '182QnsD9zNaSZkIz_5HPbTvRomvymlgE2': '6. FISCALIZACION AL CONTRATO' };
function build(test) {
  const cfg = { notionBase: test ? 'http://127.0.0.1:8787' : 'https://api.notion.com', driveBase: test ? 'http://127.0.0.1:8787' : 'https://www.googleapis.com', libroDb: NOTION.libroDb, comunicacionesDb: NOTION.comDb, contratoPagina: test ? null : NOTION.contratoPagina,
    carpetas: CARPETAS, hoy: test ? '2026-11-16' : null, avisosPara: 'CORREO_AVISOS', tableroUrl: 'https://claude.ai/artifact/FqSZ9xCaUeVFhjHQPZhtMG', ingestaUrl: test ? 'http://127.0.0.1:5678/webhook/cosemar/evento' : 'https://edgar-ortega.app.n8n.cloud/webhook/cosemar/evento', desdeInicial: '2026-11-10' };
  let y = 0; const id = n => 'cos-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const N = (name, type, v, params, x, yy, extra) => Object.assign({ id: id(name), name, type: 'n8n-nodes-base.' + type, typeVersion: v, position: [x, yy], parameters: params }, extra || {});
  const config = (x, yy) => N('Config', 'set', 3.4, { mode: 'raw', jsonOutput: JSON.stringify(cfg, null, 2), options: {} }, x, yy, { notes: 'Único lugar para cambiar identificadores, carpetas, destinatarios y URL. «hoy» vacío = fecha de Chile.' });
  const auth = (cred) => test ? {} : { authentication: 'predefinedCredentialType', nodeCredentialType: cred };
  const nver = { sendHeaders: true, headerParameters: { parameters: [{ name: 'Notion-Version', value: '2022-06-28' }] } };
  function paginar(type, name, value, completeExpression) {
    return { pagination: { pagination: {
      paginationMode: 'updateAParameterInEachRequest',
      parameters: { parameters: [{ type, name, value }] },
      paginationCompleteWhen: 'other', completeExpression,
      limitPagesFetched: true, maxRequests: 100,
    } } };
  }
  const paginarNotion = paginar('body', 'start_cursor', '={{ $response.body.next_cursor }}', '={{ !$response.body.has_more || !$response.body.next_cursor }}');
  const paginarDrive = paginar('qs', 'pageToken', '={{ $response.body.nextPageToken }}', '={{ !$response.body.nextPageToken }}');
  const leer = (x, yy) => [
    N('Notion: consultar libro', 'httpRequest', 4.2, Object.assign({ method: 'POST', url: "={{ $('Config').first().json.notionBase }}/v1/databases/{{ $('Config').first().json.libroDb }}/query", sendBody: true, specifyBody: 'json', jsonBody: '{"page_size": 100}', options: paginarNotion }, nver, auth('notionApi')), x, yy, { retryOnFail: true, maxTries: 3, waitBetweenTries: 2000 }),
    N('Notion: leer libro', 'code', 2, { jsCode: `const paginas = $input.all();
const cursores = new Set();
if (!paginas.length) throw new Error('Libro de control sin respuesta');
for (const [indice, { json: p }] of paginas.entries()) {
  const intermedia = indice < paginas.length - 1;
  if (!Array.isArray(p.results) || p.has_more !== intermedia ||
      (intermedia && (!p.next_cursor || cursores.has(p.next_cursor)))) {
    throw new Error('Libro de control incompleto. Se suspendió la ejecución antes de escribir.');
  }
  cursores.add(p.next_cursor);
}
return paginas;` }, x + 110, yy),
  ];
  const escribir = (name, x, yy) => N(name, 'httpRequest', 4.2, Object.assign({ method: '={{ $json.method }}', url: '={{ $json.url }}', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: {} }, nver, auth('notionApi')), x, yy, { retryOnFail: false, onError: 'continueRegularOutput' });
  const si = (name, x, yy) => N(name, 'if', 2.2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, conditions: [{ id: id(name) + '-c', leftValue: '={{ $json.noop }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: true, options: {} }, x, yy);
  const js = (name, file, x, yy) => N(name, 'code', 2, { jsCode: code(file) }, x, yy);
  const hook = (name, p, x, yy) => N(name, 'webhook', 2, { httpMethod: 'POST', path: p, authentication: test ? 'none' : 'headerAuth', responseMode: 'lastNode', options: {} }, x, yy, { webhookId: id(name) });
  const cron = (name, rule, x, yy) => N(name, 'scheduleTrigger', 1.2, { rule: { interval: [rule] } }, x, yy);
  const link = (c, a, b, out, i) => { c[a] = c[a] || { main: [] }; while (c[a].main.length <= (out || 0)) c[a].main.push([]); c[a].main[out || 0].push({ node: b, type: 'main', index: i || 0 }); };
  const wf = (idw, name, nodes, pairs) => { const c = {}; pairs.forEach(p => link(c, p[0], p[1], p[2])); return { id: idw, name: name + (test ? ' (prueba local)' : ''), nodes, connections: c, active: false, settings: { executionOrder: 'v1', timezone: 'America/Santiago', saveManualExecutions: true }, pinData: {}, versionId: idw + '-v1', meta: { templateCredsSetupCompleted: !test } }; };
  // ---- 1 · Ingesta y validación ----
  const w1 = wf(test ? 'cosemarT1ingesta000' : 'cosemar1ingesta0000', 'Cosemar 1 · Ingesta y validación', [
    cron('Cada hora', { field: 'hours', hoursInterval: 1 }, 0, 0), hook('Webhook evento', 'cosemar/evento', 0, 200), config(220, 100), ...leer(440, 100),
    N('Cursor', 'code', 2, { jsCode: glue + "\nconst cfg = $('Config').first().json; const pgs = $input.all().flatMap(i => i.json.results || []).map(aEvento);\nconst sis = pgs.filter(e => e.modulo === 'Sistema' && e.fecha)[0]; let desde = cfg.desdeInicial;\nif (sis) { const d = new Date(sis.fecha + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 2); desde = d.toISOString().slice(0, 10); }\nconst padres = Object.keys(cfg.carpetas).map(k => \"'\" + k + \"' in parents\").join(' or ');\nreturn [{ json: { desde, q: \"modifiedTime > '\" + desde + \"T00:00:00' and trashed = false and ((\" + padres + \") or fullText contains 'Cosemar')\" } }];" }, 660, 100),
    N('Drive: archivos nuevos', 'httpRequest', 4.2, Object.assign({ method: 'GET', url: "={{ $('Config').first().json.driveBase }}/drive/v3/files", sendQuery: true, queryParameters: { parameters: [{ name: 'q', value: '={{ $json.q }}' }, { name: 'fields', value: 'nextPageToken,incompleteSearch,files(id,name,mimeType,modifiedTime,webViewLink,parents)' }, { name: 'pageSize', value: '200' }, { name: 'orderBy', value: 'modifiedTime' }, { name: 'supportsAllDrives', value: 'true' }, { name: 'includeItemsFromAllDrives', value: 'true' }] }, options: paginarDrive }, auth('googleDriveOAuth2Api')), 880, 100, { retryOnFail: true, maxTries: 2, waitBetweenTries: 1000, onError: 'continueRegularOutput', alwaysOutputData: true }),
    N('Notion: comunicaciones', 'httpRequest', 4.2, Object.assign({ method: 'POST', url: "={{ $('Config').first().json.notionBase }}/v1/databases/{{ $('Config').first().json.comunicacionesDb }}/query", sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ page_size: 100, filter: { timestamp: 'last_edited_time', last_edited_time: { on_or_after: $('Cursor').first().json.desde } } }) }}", options: paginarNotion }, nver, auth('notionApi')), 1100, 100, { executeOnce: true, retryOnFail: true, maxTries: 2, waitBetweenTries: 1000, onError: 'continueRegularOutput', alwaysOutputData: true }),
    js('Motor: clasificar y decidir', 'code_ingesta.js', 1320, 100), si('¿Sin cambios?', 1540, 100), escribir('Notion: escribir', 1760, 200), js('Seleccionar versiones reemplazadas', 'code_rectificaciones.js', 1980, 100), si('¿Sin versiones reemplazadas?', 2200, 100),
    escribir('Notion: cerrar versiones', 2420, 200), js('Cierre: errores y marca de sincronización', 'code_cierre.js', 2640, 100), escribir('Notion: cierre', 2860, 100),
    N('Informe', 'code', 2, { jsCode: "const c = $('Cierre: errores y marca de sincronización').all(); const r = $input.all(); const inf = Object.assign({}, c[0].json.informe);\ninf.cierreFallido = r.filter(x => x.json.error).length; if (inf.cierreFallido) inf.exito = false; return [{ json: inf }];" }, 3080, 100)
  ], [['Cada hora', 'Config'], ['Webhook evento', 'Config'], ['Config', 'Notion: consultar libro'], ['Notion: consultar libro', 'Notion: leer libro'], ['Notion: leer libro', 'Cursor'], ['Cursor', 'Drive: archivos nuevos'], ['Drive: archivos nuevos', 'Notion: comunicaciones'], ['Notion: comunicaciones', 'Motor: clasificar y decidir'], ['Motor: clasificar y decidir', '¿Sin cambios?'],
    ['¿Sin cambios?', 'Seleccionar versiones reemplazadas', 0], ['¿Sin cambios?', 'Notion: escribir', 1], ['Notion: escribir', 'Seleccionar versiones reemplazadas'],
    ['Seleccionar versiones reemplazadas', '¿Sin versiones reemplazadas?'], ['¿Sin versiones reemplazadas?', 'Cierre: errores y marca de sincronización', 0],
    ['¿Sin versiones reemplazadas?', 'Notion: cerrar versiones', 1], ['Notion: cerrar versiones', 'Cierre: errores y marca de sincronización'], ['Cierre: errores y marca de sincronización', 'Notion: cierre'], ['Notion: cierre', 'Informe']]);
  // ---- 2 · Vencimientos y avisos ----
  const enviar = test ? N('Enviar aviso', 'httpRequest', 4.2, { method: 'POST', url: 'http://127.0.0.1:8787/sink/mail', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json) }}', options: {} }, 1540, 0)
    : N('Enviar aviso', 'gmail', 2.1, { sendTo: '={{ $json.para }}', subject: '={{ $json.asunto }}', emailType: 'html', message: '={{ $json.html }}', options: { appendAttribution: false } }, 1540, 0);
  const w2 = wf(test ? 'cosemarT2avisos0000' : 'cosemar2avisos00000', 'Cosemar 2 · Vencimientos y avisos', [
    cron('Cada día 08:10', { field: 'cronExpression', expression: '10 8 * * 1-6' }, 0, 0), hook('Webhook avisos', 'cosemar/avisos', 0, 200), config(220, 100), ...leer(440, 100), js('Motor: avisos', 'code_avisos.js', 660, 100), si('¿Sin avisos?', 880, 100),
    { ...escribir('Notion: registrar aviso', 1100, 0), retryOnFail: false, onError: 'stopWorkflow' },
    js('Componer mensaje', 'code_mensaje.js', 1320, 0), enviar,
    js('Confirmar envío', 'code_avisos_confirmar.js', 1760, 0),
    { ...escribir('Notion: confirmar envío', 1980, 0), onError: 'stopWorkflow' }
  ], [['Cada día 08:10', 'Config'], ['Webhook avisos', 'Config'], ['Config', 'Notion: consultar libro'], ['Notion: consultar libro', 'Notion: leer libro'], ['Notion: leer libro', 'Motor: avisos'], ['Motor: avisos', '¿Sin avisos?'], ['¿Sin avisos?', 'Notion: registrar aviso', 1], ['Notion: registrar aviso', 'Componer mensaje'], ['Componer mensaje', 'Enviar aviso'], ['Enviar aviso', 'Confirmar envío'], ['Confirmar envío', 'Notion: confirmar envío']]);
  // ---- 3 · Reproceso de errores ----
  const w3 = wf(test ? 'cosemarT3reproceso0' : 'cosemar3reproceso00', 'Cosemar 3 · Reproceso de errores', [
    cron('Cada 6 horas', { field: 'hours', hoursInterval: 6 }, 0, 0), hook('Webhook reprocesar', 'cosemar/reprocesar', 0, 200), config(220, 100), ...leer(440, 100), js('Preparar reproceso', 'code_reproceso.js', 660, 100), si('¿Nada que reprocesar?', 880, 100),
    N('Reenviar', 'httpRequest', 4.2, { ...(test ? {} : { authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' }), method: 'POST', url: "={{ $('Config').first().json.ingestaUrl }}", sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: {} }, 1100, 0, { retryOnFail: false, onError: 'continueRegularOutput' }),
    js('Marcar resueltos', 'code_reproceso_cierre.js', 1320, 0), si('¿Ninguno resuelto?', 1540, 0), escribir('Notion: cerrar error', 1760, 0)
  ], [['Cada 6 horas', 'Config'], ['Webhook reprocesar', 'Config'], ['Config', 'Notion: consultar libro'], ['Notion: consultar libro', 'Notion: leer libro'], ['Notion: leer libro', 'Preparar reproceso'], ['Preparar reproceso', '¿Nada que reprocesar?'], ['¿Nada que reprocesar?', 'Reenviar', 1], ['Reenviar', 'Marcar resueltos'], ['Marcar resueltos', '¿Ninguno resuelto?'], ['¿Ninguno resuelto?', 'Notion: cerrar error', 1]]);
  return [w1, w2, w3];
}
for (const prueba of [false, true]) {
  const dir = path.join(D, prueba ? 'prueba' : 'produccion');
  fs.mkdirSync(dir, { recursive: true });
  build(prueba).forEach((flujo, i) => {
    const archivo = 'cosemar_' + (i + 1) + '_' + ['ingesta', 'avisos', 'reproceso'][i] + '.json';
    const json = JSON.stringify(flujo, null, 1);
    fs.writeFileSync(path.join(dir, archivo), json);
    if (!prueba) fs.writeFileSync(path.join(D, '../entregables', archivo), json);
  });
}
console.log('Generados los flujos locales, de producción y de entrega.');
