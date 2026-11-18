const assert = require('node:assert/strict');
const test = require('node:test');
const { asignar, ejecutar, auditar, cerrar, construir } = require('../n8n/piloto/generar');
const flujo = require('../n8n/piloto/roles.json');
const limpio = { proyecto: 'Cosemar', operacion: 'comprobar_claves', filas: [
  { clave: 'A', vigente: false }, { clave: 'A', vigente: true }
] };

function correr(s) {
  const orden = asignar(s);
  const informe = ejecutar(s, orden);
  return cerrar(orden, informe, auditar(s, orden, informe));
}

test('el flujo importable se reproduce y solo contiene cálculo local y un inicio manual', () => {
  assert.deepEqual(construir(), flujo);
  assert.equal(flujo.active, false);
  assert.deepEqual([...new Set(flujo.nodes.map(n => n.type))].sort(),
    ['n8n-nodes-base.code', 'n8n-nodes-base.manualTrigger', 'n8n-nodes-base.set']);
});
test('cierra con evidencia y conserva una versión histórica', () => {
  assert.deepEqual(correr(limpio).auditoria.evidencia, { vigentes: 1, vacias: 0, duplicadas: 0 });
  assert.equal(correr(limpio).estado, 'completada');
});
test('cuenta claves distintas duplicadas y vacías', () => {
  const r = correr({ ...limpio, filas: ['a','a','b','b','b',' ','c'].map(clave => ({ clave, vigente: true })) });
  assert.equal(r.estado, 'hallazgos');
  assert.deepEqual(r.auditoria.evidencia, { vigentes: 7, duplicadas: 2, vacias: 1 });
});
test('un resultado del ejecutor alterado no cierra la tarea', () => {
  const orden = asignar(limpio);
  const informe = { ...ejecutar(limpio, orden), vigentes: 0 };
  assert.equal(cerrar(orden, informe, auditar(limpio, orden, informe)).estado, 'requiere_revision');
});
test('las solicitudes sensibles, inválidas y ajenas no reciben ejecución', () => {
  for (const [modificar, esperado] of [
    [{ operacion: 'activar', aprobado: true }, 'requiere_aprobacion_humana'],
    [{ proyecto: 'JGL' }, 'fuera_de_alcance'], [{ filas: [] }, 'entrada_invalida'],
    [{ filas: [{ clave: 'X', vigente: 'false' }] }, 'entrada_invalida']
  ]) {
    const r = correr({ ...limpio, ...modificar });
    assert.equal(r.estado, esperado);
    assert.equal(r.informe.ejecutada, false);
  }
});
