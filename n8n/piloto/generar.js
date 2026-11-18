// Exporta un flujo n8n importable. Sus únicos nodos son de ejecución manual y cálculo local.
const fs = require('node:fs');
const path = require('node:path');

function asignar(solicitud) {
  if (solicitud.proyecto !== 'Cosemar') return { estado: 'fuera_de_alcance' };
  if (solicitud.operacion !== 'comprobar_claves') return { estado: 'requiere_aprobacion_humana' };
  if (!Array.isArray(solicitud.filas) || solicitud.filas.length === 0 ||
      !solicitud.filas.every(f => f && typeof f.clave === 'string' && typeof f.vigente === 'boolean')) {
    return { estado: 'entrada_invalida' };
  }
  return { estado: 'asignada', tarea: 'comprobar_claves' };
}

function ejecutar(solicitud, orden) {
  if (orden.estado !== 'asignada') return { ejecutada: false };
  const porClave = new Map();
  let vacias = 0;
  let vigentes = 0;
  for (const fila of solicitud.filas) {
    if (!fila.vigente) continue;
    vigentes++;
    const clave = fila.clave.trim();
    if (clave) porClave.set(clave, (porClave.get(clave) || 0) + 1);
    else vacias++;
  }
  const duplicadas = [...porClave.values()].filter(n => n > 1).length;
  return { ejecutada: true, vigentes, vacias, duplicadas };
}

// Relee la entrada original desde el nodo Solicitud. Usa ordenación y agrupación
// por adyacencia para comprobar el conteo del ejecutor de forma independiente.
function auditar(solicitud, orden, informe) {
  if (orden.estado !== 'asignada') return { dictamen: 'sin_ejecucion' };
  const claves = solicitud.filas.filter(f => f.vigente).map(f => f.clave.trim()).sort();
  let repetidas = 0;
  for (let i = 1; i < claves.length; i++) {
    if (claves[i] && claves[i] === claves[i - 1] && claves[i] !== claves[i - 2]) repetidas++;
  }
  const evidencia = { vigentes: claves.length, vacias: claves.filter(c => c === '').length, duplicadas: repetidas };
  const coincide = informe.ejecutada === true && Object.entries(evidencia).every(([k, v]) => informe[k] === v);
  return { dictamen: coincide ? 'verificado' : 'discrepancia', evidencia };
}

function cerrar(orden, informe, auditoria) {
  if (orden.estado !== 'asignada') return { estado: orden.estado, orden, informe, auditoria };
  let estado = 'requiere_revision';
  if (auditoria.dictamen === 'verificado') {
    estado = auditoria.evidencia.vacias || auditoria.evidencia.duplicadas ? 'hallazgos' : 'completada';
  }
  return { estado, orden, informe, auditoria };
}

const ejemplo = { proyecto: 'Cosemar', operacion: 'comprobar_claves', filas: [
  { clave: 'EJEMPLO-01', vigente: true }, { clave: 'EJEMPLO-01', vigente: false }
] };
function construir(solicitud = ejemplo) {
  const nodos = [];
  const connections = {};
  function agregar(name, type, typeVersion, parameters) {
    const anterior = nodos.at(-1);
    if (anterior) connections[anterior.name] = { main: [[{ node: name, type: 'main', index: 0 }]] };
    nodos.push({ id: 'piloto-' + nodos.length, name, type: 'n8n-nodes-base.' + type, typeVersion,
      position: [nodos.length * 220, 0], parameters });
  }
  const entrada = "$('Solicitud').first().json";
  const orden = "$('Líder · asignar').first().json";
  const informe = "$('Ejecutor · contabilizar').first().json";
  function codigo(nombre, fn, argumentos) {
    agregar(nombre, 'code', 2, { jsCode: fn.toString() + '\nreturn [{ json: ' + fn.name + '(' + argumentos + ') }];' });
  }
  agregar('Inicio manual', 'manualTrigger', 1, {});
  agregar('Solicitud', 'set', 3.4, { mode: 'raw', jsonOutput: JSON.stringify(solicitud), options: {} });
  codigo('Líder · asignar', asignar, entrada);
  codigo('Ejecutor · contabilizar', ejecutar, entrada + ', ' + orden);
  codigo('Auditor · relectura', auditar, entrada + ', ' + orden + ', ' + informe);
  codigo('Líder · cierre', cerrar, orden + ', ' + informe + ', $input.first().json');
  return { id: 'dmaoPilotoRoles01', name: 'DMAO · piloto local de control Cosemar', active: false,
    settings: { executionOrder: 'v1', timezone: 'America/Santiago' }, nodes: nodos, connections };
}
module.exports = { construir, asignar, ejecutar, auditar, cerrar };
if (require.main === module) {
  fs.writeFileSync(path.join(__dirname, 'roles.json'), JSON.stringify(construir(), null, 2) + '\n');
}
