// Ejecutar después de regenerar los flujos. Solo evalúa nodos Code con páginas sintéticas.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const archivo = process.argv[2] || path.join(__dirname, '../n8n/prueba/cosemar_1_ingesta.json');
const { nodes } = JSON.parse(fs.readFileSync(archivo, 'utf8'));
const nodo = nombre => nodes.find(n => n.name === nombre);
const items = paginas => paginas.map(json => ({ json }));
const entradas = paginas => ({ all: () => items(paginas), first: () => ({ json: paginas[0] }) });

const libro = new Function('$input', nodo('Notion: leer libro').parameters.jsCode);
const primera = { results: [], has_more: true, next_cursor: 'pagina-2' };
const ultima = { results: [], has_more: false, next_cursor: null };
assert.equal(libro(entradas([primera, ultima])).length, 2);
for (const parcial of [[], [primera], [primera, primera, ultima], [{}], [{ results: [] }]]) {
  assert.throws(() => libro(entradas(parcial)), /Libro de control/);
}

const drive = nodo('Drive: archivos nuevos');
const comunicacion = nodo('Notion: comunicaciones');
const parametros = n => n.parameters.options.pagination.pagination.parameters.parameters[0];
assert.equal(parametros(drive).name, 'pageToken');
assert.equal(parametros(drive).type, 'qs');
assert.equal(parametros(comunicacion).name, 'start_cursor');
assert.equal(parametros(comunicacion).type, 'body');
assert.equal(comunicacion.executeOnce, true);
assert.match(drive.parameters.queryParameters.parameters.find(p => p.name === 'fields').value, /nextPageToken,incompleteSearch/);

const clasificar = new Function('$', nodo('Motor: clasificar y decidir').parameters.jsCode);
function leer(drivePaginas, comunicaciones) {
  const datos = {
    'Config': [JSON.parse(nodo('Config').parameters.jsonOutput)],
    'Notion: leer libro': [ultima],
    'Webhook evento': [{ body: {} }],
    'Drive: archivos nuevos': drivePaginas,
    'Notion: comunicaciones': comunicaciones,
  };
  const ops = clasificar(nombre => entradas(datos[nombre]));
  return ops[0].json.meta;
}
const archivoDrive = { id: 'duplicado-test', name: 'OC 3447-2901-SE26 servicio octubre 2026.pdf',
  parents: ['1204ZW0LRhGlJkoaRyah8wFf6u0UYuTtS'], modifiedTime: '2026-11-16T12:00:00Z' };
const doc = { id: 'com-test', last_edited_time: '2026-11-16T12:00:00Z', properties: { Documento: { rich_text: [{ plain_text: 'Cosemar Memo 400/2026' }] } } };
const datosDrive = { files: [archivoDrive] };
const datosCom = { ...ultima, results: [doc] };
const completa = leer([{ files: [], nextPageToken: 'p2' }, datosDrive], [primera, datosCom]);
assert.equal(completa.fuentes.drive, 1);
assert.equal(completa.fuentes.comunicaciones, 1);
assert.deepEqual(completa.fallasFuente, []);
for (const paginas of [[{ ...datosDrive, nextPageToken: 'restante' }], [datosDrive, { error: {} }], [{ ...datosDrive, incompleteSearch: true }]]) {
  const meta = leer(paginas, [ultima]);
  assert.equal(meta.fuentes.drive, 0);
  assert.match(meta.fallasFuente[0], /Drive/);
}
const parcial = leer([datosDrive], [{ ...datosCom, has_more: true, next_cursor: 'restante' }]);
assert.equal(parcial.fuentes.comunicaciones, 0);
assert.match(parcial.fallasFuente[0], /Notion Comunicaciones/);
console.log('Paginación comprobada para libro, Drive y Comunicaciones, con rechazo de fuentes parciales.');
