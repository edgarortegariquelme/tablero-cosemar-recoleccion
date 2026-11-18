// Prueba el CLI con una API local y un manifiesto temporal aislado.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');

const proyecto = '0CL2hgY8l3VVaCNZ';
const raiz = path.resolve(__dirname, '../n8n');
const owner = [{ role: 'workflow:owner', projectId: proyecto }];
const tipos = ['notionApi', 'googleDriveOAuth2Api', 'gmailOAuth2'];
const credenciales = Object.fromEntries(tipos.map(tipo => [tipo, { id: tipo, name: tipo }]));

async function laboratorio(t) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cosemar-preflight-'));
  t.after(() => fs.rm(tmp, { recursive: true, force: true }));
  const deploy = path.join(tmp, 'despliegue');
  await fs.mkdir(deploy);
  const cli = path.join(deploy, 'desplegar.js');
  await fs.copyFile(path.join(raiz, 'despliegue/desplegar.js'), cli);
  await fs.symlink(path.join(raiz, 'produccion'), path.join(tmp, 'produccion'), 'dir');
  const archivos = (await fs.readdir(path.join(raiz, 'produccion'))).sort();
  const nombres = await Promise.all(archivos.map(async archivo =>
    JSON.parse(await fs.readFile(path.join(raiz, 'produccion', archivo), 'utf8')).name));
  const flujos = [{ id: 'semilla', name: 'Credenciales de prueba', shared: owner, nodes: [{ credentials: credenciales }] }];
  const escrituras = [];
  const sim = { flujos, escrituras, nombres };
  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    function enviar(status, datos) {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(datos));
    }
    try {
      if (req.method === 'GET' && url.pathname === '/api/v1/workflows') {
        if (url.searchParams.get('projectId') !== proyecto) return enviar(400, {});
        return enviar(200, { data: flujos });
      }
      const id = url.pathname.split('/')[4];
      const flujo = flujos.find(f => f.id === id);
      if (req.method === 'GET') return enviar(flujo ? 200 : 404, flujo);
      let texto = '';
      for await (const parte of req) texto += parte;
      const cuerpo = JSON.parse(texto);
      escrituras.push({ id, metodo: req.method, ruta: url.pathname, cuerpo });
      if (req.method === 'POST' && url.pathname.endsWith('/activate')) {
        if (id === sim.fallar) return enviar(503, {});
        if (cuerpo.versionId !== flujo.versionId) return enviar(409, {});
        flujo.active = true;
        flujo.activeVersionId = cuerpo.versionId;
        return enviar(200, flujo);
      }
      if (req.method === 'POST' && !id && cuerpo.projectId === proyecto) {
        const nuevo = { ...cuerpo, id: 'w' + flujos.length, versionId: 'v1', active: false, shared: owner };
        flujos.push(nuevo);
        return enviar(201, nuevo);
      }
      return enviar(400, {});
    } catch (error) {
      enviar(500, { error: error.message });
    }
  });
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => servidor.close(resolve)));
  sim.ejecutar = (comando, extraEnv = {}) => new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [cli, comando], {
      cwd: tmp,
      env: { N8N_BASE: 'http://127.0.0.1:' + servidor.address().port + '/api/v1',
        N8N_API_KEY: 'local', COSEMAR_WEBHOOK_CREDENTIAL_ID: 'cabecera-local', ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let salida = '';
    proc.stdout.on('data', data => { salida += data; });
    proc.stderr.on('data', data => { salida += data; });
    proc.once('error', reject);
    proc.once('close', codigo => resolve({ codigo, salida }));
  });
  return sim;
}

test('la prevalidación rechaza lotes completos antes de escribir', async t => {
  const sim = await laboratorio(t);
  const base = structuredClone(sim.flujos);
  const borrador = { id: 'b3', name: sim.nombres[2], shared: owner, active: false, versionId: 'v1' };
  const casos = [
    ['sin credenciales', [], {}],
    ['sin cabecera', base, { COSEMAR_WEBHOOK_CREDENTIAL_ID: '' }],
    ['proyecto ajeno', [{ ...base[0], shared: [{ role: 'workflow:owner', projectId: 'otro' }] }], {}],
    ['último flujo publicado', [...base, { ...borrador, active: true, activeVersionId: 'v1' }], {}],
    ['último flujo archivado', [...base, { ...borrador, isArchived: true }], {}],
    ['coincidencia ambigua', [...base, borrador, { ...borrador, id: 'otro' }], {}],
    ['credencial ambigua', [...base, { ...borrador, nodes: [{ credentials: { notionApi: { id: 'otra' } } }] }], {}]
  ];
  for (const [nombre, flujos, env] of casos) {
    sim.flujos.splice(0, sim.flujos.length, ...flujos);
    const resultado = await sim.ejecutar('importar', env);
    assert.equal(resultado.codigo, 1, nombre + ' ' + resultado.salida);
    assert.equal(sim.escrituras.length, 0, nombre);
  }
});

test('fija las versiones, detecta divergencias y reanuda una activación parcial', async t => {
  const sim = await laboratorio(t);
  const creacion = await sim.ejecutar('importar');
  assert.equal(creacion.codigo, 0, creacion.salida);
  assert.equal(sim.escrituras.length, 3);
  for (const envio of sim.escrituras) {
    assert.equal(envio.cuerpo.projectId, proyecto);
    const webhooks = envio.cuerpo.nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
    assert.equal(webhooks.length, 1);
    assert.equal(webhooks[0].credentials.httpHeaderAuth.id, 'cabecera-local');
  }
  sim.escrituras.length = 0;
  sim.flujos[3].versionId = 'v2';
  assert.equal((await sim.ejecutar('activar')).codigo, 1);
  assert.equal(sim.escrituras.length, 0);
  sim.flujos[3].versionId = 'v1';
  sim.fallar = 'w2';
  assert.equal((await sim.ejecutar('activar')).codigo, 1);
  assert.deepEqual(sim.escrituras.map(e => e.id), ['w1', 'w2']);
  assert.equal(sim.flujos[1].activeVersionId, 'v1');
  sim.fallar = undefined;
  sim.escrituras.length = 0;
  const reanudacion = await sim.ejecutar('activar');
  assert.equal(reanudacion.codigo, 0, reanudacion.salida);
  assert.deepEqual(sim.escrituras.map(e => e.id), ['w2', 'w3']);
  assert.ok(sim.flujos.slice(1).every(f => f.active && f.activeVersionId === 'v1'));
});
