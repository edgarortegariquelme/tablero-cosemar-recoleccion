/* Importa y activa los flujos Cosemar en n8n por la API pública. La clave la inyecta el proxy de la sesión (cabecera X-N8N-API-KEY).
   Uso: node desplegar.js inventario | node desplegar.js importar | node desplegar.js activar */
const fs = require('fs'), path = require('path');
const BASE = process.env.N8N_BASE || 'https://edgar-ortega.app.n8n.cloud/api/v1';
const H = { 'X-N8N-API-KEY': process.env.N8N_API_KEY || 'inyectada-por-proxy', 'content-type': 'application/json', accept: 'application/json' };
async function api(m, p, b) { const r = await fetch(BASE + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { raw: t.slice(0, 300) }; } if (!r.ok) throw new Error(m + ' ' + p + ' → ' + r.status + ' ' + JSON.stringify(j).slice(0, 300)); return j; }
async function todos(p) { let out = [], cur = null; do { const j = await api('GET', p + (p.includes('?') ? '&' : '?') + 'limit=100' + (cur ? '&cursor=' + cur : '')); out = out.concat(j.data || []); cur = j.nextCursor; } while (cur); return out; }
const DIR = path.join(__dirname, '../produccion');
const NOMBRES = ['cosemar_1_ingesta.json', 'cosemar_2_avisos.json', 'cosemar_3_reproceso.json'];
async function inventario() {
  const ws = await todos('/workflows'), creds = {};
  ws.forEach(w => (w.nodes || []).forEach(n => Object.entries(n.credentials || {}).forEach(([tipo, c]) => { const k = tipo + '|' + c.id; creds[k] = creds[k] || { tipo, id: c.id, nombre: c.name, flujos: new Set() }; creds[k].flujos.add(w.name); })));
  const lista = Object.values(creds).map(c => ({ tipo: c.tipo, id: c.id, nombre: c.nombre, usadaEn: [...c.flujos].slice(0, 3) }));
  return { flujos: ws.map(w => ({ id: w.id, nombre: w.name, activo: w.active })), credenciales: lista };
}
function elegir(lista, tipos) { return lista.find(c => tipos.includes(c.tipo)) || null; }
async function importar() {
  const inv = await inventario();
  const notion = elegir(inv.credenciales, ['notionApi']), drive = elegir(inv.credenciales, ['googleDriveOAuth2Api']), gmail = elegir(inv.credenciales, ['gmailOAuth2']);
  const faltan = [!notion && 'Notion API (notionApi)', !drive && 'Google Drive OAuth2 (googleDriveOAuth2Api)', !gmail && 'Gmail OAuth2 (gmailOAuth2)'].filter(Boolean);
  const res = [];
  for (const f of NOMBRES) {
    const wf = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    wf.nodes.forEach(n => {
      const p = n.parameters || {};
      if (p.nodeCredentialType === 'notionApi' && notion) n.credentials = { notionApi: { id: notion.id, name: notion.nombre } };
      if (p.nodeCredentialType === 'googleDriveOAuth2Api' && drive) n.credentials = { googleDriveOAuth2Api: { id: drive.id, name: drive.nombre } };
      if (n.type === 'n8n-nodes-base.gmail' && gmail) n.credentials = { gmailOAuth2: { id: gmail.id, name: gmail.nombre } };
      if (n.name === 'Config') { const c = JSON.parse(p.jsonOutput); c.ingestaUrl = BASE.replace('/api/v1', '') + '/webhook/cosemar/evento'; p.jsonOutput = JSON.stringify(c, null, 2); }
    });
    const ya = inv.flujos.find(x => x.nombre === wf.name);
    const cuerpo = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: { executionOrder: 'v1', timezone: 'America/Santiago', saveManualExecutions: true } };
    const r = ya ? await api('PUT', '/workflows/' + ya.id, cuerpo) : await api('POST', '/workflows', cuerpo);
    res.push({ archivo: f, id: r.id, nombre: r.name, accion: ya ? 'actualizado' : 'creado' });
  }
  fs.writeFileSync(path.join(__dirname, 'ids.json'), JSON.stringify(res, null, 1));
  return { importados: res, credencialesUsadas: { notion: notion && notion.nombre, drive: drive && drive.nombre, gmail: gmail && gmail.nombre }, faltan };
}
async function activar() {
  const ids = JSON.parse(fs.readFileSync(path.join(__dirname, 'ids.json'), 'utf8')), out = [];
  for (const w of ids) { try { const r = await api('POST', '/workflows/' + w.id + '/activate'); out.push({ nombre: w.nombre, activo: r.active }); } catch (e) { out.push({ nombre: w.nombre, error: e.message }); } }
  return out;
}
const cmd = process.argv[2] || 'inventario';
({ inventario, importar, activar })[cmd]().then(r => console.log(JSON.stringify(r, null, 1))).catch(e => { console.error('ERROR', e.message); process.exit(1); });
