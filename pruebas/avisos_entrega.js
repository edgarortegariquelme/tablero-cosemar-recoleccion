// Comprueba las tres etapas con registros sin conexión, incluyendo pérdidas de respuesta.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../motor/motor.js');
const semilla = require('../datos/semilla.js');
const base = path.join(__dirname, '../n8n');
const glue = fs.readFileSync(path.join(base, 'glue.js'), 'utf8');
const { aPropiedades } = new Function(glue + '\nreturn { aPropiedades };')();
const semillaNotion = semilla.map((e, i) => ({ id: String(i), properties: aPropiedades(e) }));
const cfg = { hoy: '2026-11-16', notionBase: 'https://api.notion.com', libroDb: 'libro' };
const nodos = { Config: [{ json: cfg }], 'Notion: leer libro': [{ json: { results: semillaNotion } }] };
function correr(nombre, entrada = []) {
  const script = fs.readFileSync(path.join(base, nombre + '.js'), 'utf8');
  const envolver = items => ({ all: () => items, first: () => items[0] });
  return new Function('M', '$', '$input', '$execution', glue + '\n' + script)(
    M, nombreNodo => envolver(nodos[nombreNodo]), envolver(entrada), { id: 'prueba-21' }
  );
}
const ops = correr('code_avisos');
nodos['Motor: avisos'] = ops;
assert.ok(ops.length > 1);
const reservas = ops.map(({ json: o }, i) => {
  assert.equal(o.body.properties.Verificación.select.name, 'Por verificar');
  return { json: { object: 'page', id: 'aviso-' + i, properties: o.body.properties } };
});
nodos['Notion: registrar aviso'] = reservas;
assert.throws(() => correr('code_mensaje', reservas.slice(1)), /Reserva incompleta/);
assert.throws(() => correr('code_mensaje', reservas.slice().reverse()), /Reserva incompleta/);
const mensaje = correr('code_mensaje', reservas);
assert.equal(mensaje.length, 1);
assert.match(mensaje[0].json.asunto, /Cosemar-avisos-prueba-21/);
for (const respuesta of [{ error: true }, {}, { ok: true, n: 1 }]) {
  assert.throws(() => correr('code_avisos_confirmar', [{ json: respuesta }]), /no confirmó/);
}
const parches = correr('code_avisos_confirmar', [{ json: { id: 'gmail-100' } }]);
assert.equal(parches.length, reservas.length);
parches.forEach(({ json: p }, i) => {
  assert.equal(p.url, cfg.notionBase + '/v1/pages/aviso-' + i);
  assert.equal(p.body.properties.Verificación.select.name, 'Acreditado');
  assert.match(p.body.properties.Detalle.rich_text[0].text.content, /Cosemar-avisos-prueba-21 · mensaje gmail-100/);
});
// Simula una caída después del envío y antes de confirmar la marca en Notion.
nodos['Notion: leer libro'][0].json.results = semillaNotion.concat(reservas.map(item => item.json));
assert.equal(correr('code_avisos')[0].json.noop, true);
console.log('Avisos: reserva parcial, correlación, confirmación y repetición incierta verificadas.');
