/* Ingesta de Drive (lo que hacía el flujo n8n «Cosemar 1 · Ingesta», ahora sin n8n ni Notion).
   Pide al puente de Apps Script los archivos modificados desde la última lectura dentro de las carpetas del expediente,
   los clasifica con el mismo motor (M.clasificar) y los agrega al libro de control del repositorio (datos/libro_novedades.json)
   con la misma regla de deduplicación y rectificación (M.aplicar). Estado: datos/auto/drive.json.
   Modo de prueba: DRIVE_PRUEBA=<archivo.json con {archivos:[...]}>. */
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..'), ESTADO = path.join(RAIZ, 'datos/auto/drive.json'), NOVEDADES = path.join(RAIZ, 'datos/libro_novedades.json');
const M = require('../motor/motor.js');

// Carpetas del expediente (las mismas del nodo «Config» de n8n).
const CARPETAS = {
  '11kjK9ibJ3DTL4CQU0tzBPuLHQD9zbOmm': '1. LICITACION RECOLECCION RSD 3447-86-LR23',
  '1S6PzQeBg6BWSCQnIdfaokWU-9OXF3Fx-': '1. MULTAS (PROCESOS SANCIONATORIOS)',
  '122zU1bsRlvC_jVNQFqdZMW2kVyYhXfzo': '2. PAGOS SERVICIOS 2026',
  '1new6tELuK_9HDRqRkvCQaXYunKtBB-zy': '3. POLIZAS',
  '182QnsD9zNaSZkIz_5HPbTvRomvymlgE2': '6. FISCALIZACION AL CONTRATO'
};

function leerEstado() { try { return JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch (e) { return { desde: '2026-11-20', vistos: {} }; } }

async function archivosPuente(desde) {
  const u = require('./gmail').puenteURL(); u.searchParams.set('accion', 'drive'); u.searchParams.set('desde', desde); u.searchParams.set('carpetas', Object.keys(CARPETAS).join(','));
  const r = await fetch(u, { redirect: 'follow' }); if (!r.ok) throw new Error('Puente Drive respondió ' + r.status);
  const j = await r.json();
  if (j.error) throw new Error('Puente Drive: ' + j.error);
  if (!Array.isArray(j.archivos)) throw new Error('el puente no tiene la función de Drive: hay que actualizar el script (nueva versión de la implementación)');
  return j.archivos;
}

async function ingestarDrive() {
  const st = leerEstado(), novedades = [];
  let archivos;
  if (process.env.DRIVE_PRUEBA) archivos = JSON.parse(fs.readFileSync(process.env.DRIVE_PRUEBA, 'utf8')).archivos;
  else if (process.env.GMAIL_PUENTE_URL) archivos = await archivosPuente(st.desde);
  else return { omitido: 'falta el secreto GMAIL_PUENTE_URL', novedades };
  const nov = JSON.parse(fs.readFileSync(NOVEDADES, 'utf8'));
  const libro = M.normalizarLibro(require('../datos/semilla.js').concat(require('../pruebas/pagos_confirmados.json'), nov));
  const resumen = { leidos: archivos.length, crear: 0, rectificar: 0, revision: 0, duplicado: 0, omitidos: 0, errores: 0 };
  archivos.forEach(f => {
    if (st.vistos[f.id] === f.modificado) { resumen.omitidos++; return; }
    st.vistos[f.id] = f.modificado;
    const cand = M.clasificar({ id: f.id, nombre: f.nombre, ruta: f.ruta || CARPETAS[f.raiz] || '', fecha: (f.modificado || '').slice(0, 10), enlace: f.enlace, origen: 'GitHub · drive:' + f.id + ' · mod:' + f.modificado });
    if (/fuera del alcance/.test(cand.detalle || '')) { resumen.omitidos++; return; }
    const r = M.aplicar(libro.concat(nov), cand, new Date().toISOString());
    resumen[r.accion] = (resumen[r.accion] || 0) + 1;
    if (r.accion === 'error') { novedades.push({ tipo: 'Drive', texto: 'No pude clasificar «' + f.nombre + '»: ' + r.motivo + '. Revísalo en la carpeta.', enlace: f.enlace }); return; }
    if (!r.registro || r.accion === 'duplicado') return;
    nov.push(r.registro);
    const que = r.accion === 'revision' ? 'quedó en revisión (' + r.motivo + ')' : (r.registro.modulo + (r.registro.entidad ? ' ' + r.registro.entidad : '') + (r.registro.hito ? ' · ' + r.registro.hito.replace(/_/g, ' ') : '')) + (r.accion === 'rectificar' ? ' (rectifica una versión anterior)' : '');
    novedades.push({ tipo: 'Drive', texto: 'Documento nuevo en «' + (f.ruta || CARPETAS[f.raiz] || 'Drive') + '»: ' + f.nombre + ' → ' + que + '.', enlace: f.enlace });
  });
  const hoy = new Date().toISOString().slice(0, 10), d = new Date(hoy + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 2);
  st.desde = d.toISOString().slice(0, 10); st.leido = new Date().toISOString(); st.resumen = resumen;
  const ids = Object.keys(st.vistos); if (ids.length > 5000) ids.slice(0, ids.length - 5000).forEach(k => delete st.vistos[k]);
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true }); fs.writeFileSync(ESTADO, JSON.stringify(st, null, 1) + '\n');
  if (resumen.crear || resumen.rectificar || resumen.revision) fs.writeFileSync(NOVEDADES, JSON.stringify(nov, null, 1) + '\n');
  return { resumen, novedades };
}

// Plazos de procesos sancionatorios (lo único de «Cosemar 2 · Avisos» que no cubren las alertas de la app).
function avisosPlazos(hoy) {
  const libro = M.normalizarLibro(require('../datos/semilla.js').concat(require('../pruebas/pagos_confirmados.json'), JSON.parse(fs.readFileSync(NOVEDADES, 'utf8'))));
  return M.avisos(libro, null, hoy).filter(a => /^plazo_/.test(a.hito)).map(a => ({ nivel: a.hito === 'plazo_vencido' ? 'alta' : 'media', contrato: 'rec', texto: 'Proceso ' + a.documento, fecha: hoy, clave: a.clave }));
}

module.exports = { ingestarDrive, avisosPlazos, CARPETAS };
if (require.main === module) ingestarDrive().then(r => console.log(JSON.stringify(r, null, 1)), e => { console.error(e); process.exit(1); });
