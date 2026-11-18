// Verifica las decisiones de ambos nodos con respuestas locales de Notion.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../motor/motor');
const leer = nombre => fs.readFileSync(path.join(__dirname, '../n8n', nombre), 'utf8');
const convertir = new Function(leer('glue.js') + '\nreturn aPropiedades;')();
const ejecutar = (archivo, nodos, entrada) => {
  const items = filas => filas.map(json => ({ json }));
  const selector = nombre => ({
    all: () => items(nodos[nombre]),
    first: () => items(nodos[nombre])[0]
  });
  return new Function('$', '$input', 'M', leer('glue.js') + '\n' + leer(archivo))(
    selector, { all: () => items(entrada) }, M
  ).map(i => i.json);
};
const clave = 'PAG|2026-10|memo_oc|2211';
function pagina(id, version, vigente = true) {
  const registro = { clave, modulo: 'Pago', entidad: '2026-10', hito: 'memo_oc',
    fecha: '2026-11-16', fechaTipo: 'Acto acreditado', verificacion: 'Acreditado',
    monto: 1250 + version, unidadMonto: 'CLP', documento: 'Memo 2211', vigente, version };
  if (version > 1) registro.rectificaA = clave + ' v' + (version - 1);
  return { id, object: 'page', properties: convertir(registro) };
}
const cfg = { notionBase: 'http://localhost', libroDb: 'libro', hoy: '2026-11-16' };
const anterior = pagina('original', 1), reemplazo = pagina('nueva', 2);
const nodos = { Config: [cfg], 'Notion: leer libro': [{ results: [anterior] }],
  'Drive: archivos nuevos': [], 'Notion: comunicaciones': [], 'Webhook evento': [{ body: {
    eventos: [{ clave, modulo: 'Pago', entidad: '2026-10', hito: 'memo_oc', fecha: cfg.hoy,
      fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', monto: 1252,
      unidadMonto: 'CLP', documento: 'Memo 2211' }]
  } }] };
const plan = ejecutar('code_ingesta.js', nodos, []);
assert.deepEqual(plan.map(o => [o.accion, o.method]), [['rectificar', 'POST']]);
const seleccionar = entrada => ejecutar('code_rectificaciones.js', nodos, entrada);
const noop = [{ noop: true }];
const falla = { error: { message: '503' } };
assert.deepEqual(seleccionar([falla]), noop);
assert.deepEqual(seleccionar([{}]), noop);
const baja = seleccionar([reemplazo]);
assert.deepEqual(baja.map(x => x.url), ['http://localhost/v1/pages/original']);
nodos['Motor: clasificar y decidir'] = plan;
nodos['Notion: escribir'] = [reemplazo];
nodos['Seleccionar versiones reemplazadas'] = baja;
const cierre = ejecutar('code_cierre.js', nodos, [falla]);
assert.equal(cierre[0].informe.exito, false);
assert.equal(cierre[0].informe.bajasFallidas, 1);
nodos['Notion: leer libro'][0].results.push(reemplazo);
assert.deepEqual(seleccionar(noop), baja);
assert.equal(ejecutar('code_ingesta.js', nodos, [])[0].noop, true);
anterior.properties.Vigente.checkbox = false;
assert.deepEqual(seleccionar(noop), noop);
anterior.properties.Vigente.checkbox = true;
reemplazo.properties.Vigente.checkbox = false;
assert.deepEqual(seleccionar(noop), noop);
assert.deepEqual(seleccionar([pagina('tercera', 3)]), baja);
console.log('Rectificación verificada: creación, fallo, cierre, recuperación y repetición.');
