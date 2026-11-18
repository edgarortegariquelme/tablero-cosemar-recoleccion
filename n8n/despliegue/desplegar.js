/* Importa y activa los flujos Cosemar en n8n por la API pública. La clave la inyecta el proxy de la sesión (cabecera X-N8N-API-KEY).
   Uso: node desplegar.js inventario | node desplegar.js importar | node desplegar.js activar */
const fs = require('fs'), path = require('path');
const BASE = process.env.N8N_BASE || 'https://edgar-ortega.app.n8n.cloud/api/v1';
const H = { 'X-N8N-API-KEY': process.env.N8N_API_KEY || 'inyectada-por-proxy', 'content-type': 'application/json', accept: 'application/json' };
const PROYECTO = '0CL2hgY8l3VVaCNZ';
async function api(metodo, ruta, cuerpo) {
  const respuesta = await fetch(BASE + ruta, {
    method: metodo, headers: H, redirect: 'error',
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  if (!respuesta.ok) throw new Error(metodo + ' ' + ruta.split('?')[0] + ' → ' + respuesta.status);
  return respuesta.json();
}
async function listarFlujos() {
  const flujos = [], cursores = new Set();
  const consulta = new URLSearchParams({ projectId: PROYECTO, limit: '100', excludePinnedData: 'true', includeParentFolder: 'true' });
  for (;;) {
    const pagina = await api('GET', '/workflows?' + consulta);
    if (!Array.isArray(pagina.data)) throw new Error('Inventario incompleto');
    for (const flujo of pagina.data) {
      if (!flujo.shared?.some(s => s.projectId === PROYECTO && s.role === 'workflow:owner')) {
        throw new Error('La API no acredita el proyecto propietario de todos los flujos');
      }
      flujos.push(flujo);
    }
    if (!pagina.nextCursor) return flujos;
    if (cursores.has(pagina.nextCursor)) throw new Error('Cursor repetido en el inventario');
    cursores.add(pagina.nextCursor);
    consulta.set('cursor', pagina.nextCursor);
  }
}
const DIR = path.join(__dirname, '../produccion');
const NOMBRES = ['cosemar_1_ingesta.json', 'cosemar_2_avisos.json', 'cosemar_3_reproceso.json'];
async function inventario() {
  const ws = await listarFlujos(), creds = {};
  ws.forEach(w => (w.nodes || []).forEach(n => Object.entries(n.credentials || {}).forEach(([tipo, c]) => { const k = tipo + '|' + c.id; creds[k] = creds[k] || { tipo, id: c.id, nombre: c.name, flujos: new Set() }; creds[k].flujos.add(w.name); })));
  const lista = Object.values(creds).map(c => ({ tipo: c.tipo, id: c.id, nombre: c.nombre, usadaEn: [...c.flujos].slice(0, 3) }));
  return { flujos: ws.map(w => ({ id: w.id, nombre: w.name, activo: w.active, version: w.versionId, publicada: w.activeVersionId, archivado: w.isArchived, carpetaId: w.parentFolder?.id || null })), credenciales: lista };
}
function elegir(lista, tipo) {
  const candidatas = lista.filter(c => c.tipo === tipo);
  if (candidatas.length !== 1) throw new Error('Se requiere una credencial inequívoca de tipo ' + tipo);
  return candidatas[0];
}
async function importar() {
  const inv = await inventario();
  const notion = elegir(inv.credenciales, 'notionApi');
  const drive = elegir(inv.credenciales, 'googleDriveOAuth2Api');
  const gmail = elegir(inv.credenciales, 'gmailOAuth2');
  // Esta credencial debe estar asignada explícitamente a los webhooks Cosemar.
  const headerId = process.env.COSEMAR_WEBHOOK_CREDENTIAL_ID;
  if (!headerId) throw new Error('Falta COSEMAR_WEBHOOK_CREDENTIAL_ID (identificador, no valor secreto)');
  const header = { id: headerId };
  const plan = NOMBRES.map(f => {
    const wf = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const coincidencias = inv.flujos.filter(x => x.nombre === wf.name);
    if (coincidencias.length > 1 || coincidencias.some(x => x.activo !== false || x.publicada || x.archivado)) {
      throw new Error('Revisar flujo activo o nombre ambiguo antes de importar: ' + wf.name);
    }
    return { f, wf, ya: coincidencias[0] };
  });
  const res = [];
  for (const { f, wf, ya } of plan) {
    wf.nodes.forEach(n => {
      const p = n.parameters || {};
      if (p.authentication === 'headerAuth' || p.genericAuthType === 'httpHeaderAuth') n.credentials = { httpHeaderAuth: header };
      if (p.nodeCredentialType === 'notionApi' && notion) n.credentials = { notionApi: { id: notion.id, name: notion.nombre } };
      if (p.nodeCredentialType === 'googleDriveOAuth2Api' && drive) n.credentials = { googleDriveOAuth2Api: { id: drive.id, name: drive.nombre } };
      if (n.type === 'n8n-nodes-base.gmail' && gmail) n.credentials = { gmailOAuth2: { id: gmail.id, name: gmail.nombre } };
      if (n.name === 'Config') { const c = JSON.parse(p.jsonOutput); c.ingestaUrl = BASE.replace('/api/v1', '') + '/webhook/cosemar/evento'; p.jsonOutput = JSON.stringify(c, null, 2); }
    });
    const cuerpo = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: { executionOrder: 'v1', timezone: 'America/Santiago', saveManualExecutions: true } };
    if (ya) {
      const actual = await api('GET', '/workflows/' + ya.id);
      if (!ya.version || actual.versionId !== ya.version || actual.active !== false || actual.activeVersionId) {
        throw new Error('Cambió el borrador durante la importación: ' + wf.name);
      }
    }
    const r = ya
      ? await api('PUT', '/workflows/' + ya.id + '?publishIfActive=false', cuerpo)
      : await api('POST', '/workflows', { ...cuerpo, projectId: PROYECTO });
    if (!r.id || !r.versionId || r.name !== wf.name || r.active !== false) {
      throw new Error('Respuesta de importación sin borrador verificable: ' + wf.name);
    }
    res.push({ archivo: f, id: r.id, version: r.versionId, nombre: r.name, accion: ya ? 'actualizado' : 'creado' });
  }
  const temporal = path.join(__dirname, 'ids.' + process.pid + '.tmp');
  fs.writeFileSync(temporal, JSON.stringify(res, null, 1));
  fs.renameSync(temporal, path.join(__dirname, 'ids.json'));
  return { importados: res, credencialesUsadas: { notion: notion && notion.nombre, drive: drive && drive.nombre, gmail: gmail && gmail.nombre }, faltan: [] };
}
async function activar() {
  const ids = JSON.parse(fs.readFileSync(path.join(__dirname, 'ids.json'), 'utf8'));
  const inv = await inventario();
  if (ids.length !== NOMBRES.length) throw new Error('Manifiesto incompleto');
  for (const archivo of NOMBRES) {
    const esperado = JSON.parse(fs.readFileSync(path.join(DIR, archivo), 'utf8'));
    const entrada = ids.find(w => w.archivo === archivo);
    const flujo = inv.flujos.find(w => w.id === entrada?.id && w.nombre === esperado.name);
    if (!flujo || !entrada.version || flujo.version !== entrada.version || flujo.archivado ||
        (flujo.activo && flujo.publicada !== entrada.version)) {
      throw new Error('Revisar versión y proyecto antes de activar ' + archivo);
    }
  }
  const activos = [];
  for (const w of ids) {
    if (inv.flujos.find(f => f.id === w.id).publicada !== w.version) {
      const r = await api('POST', '/workflows/' + w.id + '/activate', { versionId: w.version });
      if (!r.active || r.activeVersionId !== w.version) throw new Error('Publicación sin confirmar: ' + w.nombre);
    }
    activos.push(w.nombre);
    console.error('Versión activa confirmada: ' + w.nombre);
  }
  return activos;
}
const cmd = process.argv[2] || 'inventario';
({ inventario, importar, activar })[cmd]().then(r => console.log(JSON.stringify(r, null, 1))).catch(e => { console.error('ERROR', e.message); process.exit(1); });
