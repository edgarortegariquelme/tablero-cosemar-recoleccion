/* Pruebas de extremo a extremo con la API simulada de Notion/Drive (npm run mock).
 * Modo n8n (por defecto): n8n local con los flujos de n8n/prueba importados. Uso: node pruebas/e2e.js
 * Modo acciones: el ejecutor de GitHub Actions (acciones/ejecutor.js), sin n8n. Uso: E2E_MODO=acciones node pruebas/e2e.js */
const M = require('../motor/motor.js'), C = require('../datos/catalogo.js'), fs = require('fs');
const N8 = 'http://127.0.0.1:5678/webhook/cosemar/', MK = 'http://127.0.0.1:8787', HOY = '2026-11-16', R = [];
const j = async (u, b, m) => { const r = await fetch(u, { method: m || 'POST', headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { raw: t.slice(0, 300), status: r.status }; } };
const ctl = set => j(MK + '/_ctl', { set }), estado = async () => { const s = await j(MK + '/_state', null, 'GET'); s.eventos = M.normalizarLibro(s.eventos); return s; };
const ACC = process.env.E2E_MODO === 'acciones';
if (ACC) Object.assign(process.env, { COSEMAR_BASE: MK, COSEMAR_HOY: HOY, COSEMAR_CORREO_PRUEBA: MK + '/sink/mail' });
const A = ACC ? require('../acciones/ejecutor.js') : null;
const llamar = (ruta, b) => !ACC ? j(N8 + ruta, b || {}) : ruta === 'evento' ? A.ingesta(b && Object.keys(b).length ? b : null) : ruta === 'avisos' ? A.avisos() : A.reproceso();
const ingesta = b => llamar('evento', b);
function ok(id, nombre, cond, evidencia) { R.push({ id, nombre, resultado: cond ? 'APROBADA' : 'FALLA', evidencia }); console.log((cond ? '✔ ' : '✘ ') + id + ' ' + nombre + ' → ' + JSON.stringify(evidencia).slice(0, 330)); }
const pago = (s, per) => M.derivarPagos(s.eventos, C, HOY).filter(p => p.periodo === per)[0];
const san = (s, id) => M.derivarSanciones(s.eventos, HOY, C.sanciones).filter(x => x.id === id)[0];
(async () => {
  await j(MK + '/_ctl', { reset: true });
  let s0 = await estado(), r, s;
  // P01 línea base
  r = await ingesta(); s = await estado(); const sis = s.eventos.filter(e => e.modulo === 'Sistema')[0];
  ok('P01', 'Corrida sin novedades: lee las 161 filas (2 páginas), no crea nada y marca la última actualización exitosa', r.exito && s.eventos.length === 161 && r.escritos === 0 && /exitosa/.test(sis.detalle), { informe: r, filas: s.eventos.length, marca: sis.detalle });
  // P02 evento real de Drive sin intervención
  const antes = pago(s, '2026-10').estado;
  await ctl({ driveFiles: [{ id: 'drv-OC-oct', name: 'OC 3447-2901-SE26 servicio octubre 2026.pdf', mimeType: 'application/pdf', modifiedTime: '2026-11-16T14:02:11.000Z', webViewLink: 'https://drive.google.com/file/d/drv-OC-oct/view', parents: ['1204ZW0LRhGlJkoaRyah8wFf6u0UYuTtS'] }] });
  r = await ingesta(); s = await estado(); let p = pago(s, '2026-10'); const nuevo = s.eventos.filter(e => e.clave === 'PAG|2026-10|oc_emitida|3447-2901-SE26')[0];
  ok('P02', 'Un archivo nuevo en la carpeta de octubre actualiza el pago sin intervención manual', r.resumen.crear === 1 && antes === 'OC solicitada' && p.estado === 'OC emitida' && !!nuevo && /drive:drv-OC-oct/.test(nuevo.origen), { antes, despues: p.estado, fila: nuevo && { clave: nuevo.clave, origen: nuevo.origen, respaldo: nuevo.respaldo, fechaTipo: nuevo.fechaTipo }, informe: r.resumen });
  // P03 duplicados
  r = await ingesta(); const r2 = await ingesta({ eventos: [{ clave: nuevo.clave, modulo: 'Pago', entidad: '2026-10', hito: 'oc_emitida', fecha: nuevo.fecha, fechaTipo: nuevo.fechaTipo, documento: nuevo.documento, respaldo: nuevo.respaldo, verificacion: nuevo.verificacion, detalle: nuevo.detalle }] }); s = await estado();
  ok('P03', 'El mismo documento no se carga dos veces (ni por Drive ni por reenvío del evento)', r.resumen.crear === 0 && r.omitidos === 1 && r2.resumen.duplicado === 1 && s.eventos.filter(e => e.clave === nuevo.clave).length === 1, { reintentoDrive: { creados: r.resumen.crear, omitidos: r.omitidos }, reenvio: r2.resumen, filasConEsaClave: s.eventos.filter(e => e.clave === nuevo.clave).length });
  // P04 rectificación conserva historial
  const m = s.eventos.filter(e => e.clave === 'PAG|2026-10|memo_oc|2211')[0], difAntes = pago(s, '2026-10').diferencias.filter(d => d.tipo === 'monto').map(d => d.monto);
  r = await ingesta({ eventos: [{ clave: m.clave, modulo: 'Pago', entidad: '2026-10', hito: 'memo_oc', numero: '2211', fecha: '2026-11-16', fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', monto: 267940006, unidadMonto: 'CLP', documento: 'Memo 2211/2026 rectificado · OC octubre al valor D.A. 3.957 (PRUEBA)', respaldo: 'https://drive.google.com/file/d/prueba-rectifica/view', obligacion: 'OB-01' }] });
  s = await estado(); const vers = s.eventos.filter(e => e.clave === m.clave).map(e => ({ version: e.version, vigente: e.vigente, monto: e.monto, rectificaA: e.rectificaA })); p = pago(s, '2026-10');
  ok('P04', 'Una rectificación crea la versión 2, deja la 1 como historial y el tablero usa la nueva cifra', r.resumen.rectificar === 1 && vers.length === 2 && vers.filter(v => v.vigente).length === 1 && p.solicitadoOC === 267940006 && difAntes[0] === 6172583 && p.diferencias.filter(d => d.tipo === 'monto').length === 0, { versiones: vers, diferenciaAntes: difAntes, solicitadoOCDespues: p.solicitadoOC, diferenciasDespues: p.diferencias.map(d => d.tipo) });
  // P05 ambiguo a revisión
  const stSan = JSON.stringify(M.derivarSanciones(s.eventos, HOY).map(x => x.estado));
  await ctl({ driveFiles: [{ id: 'drv-scan', name: 'img16112026_0001.pdf', mimeType: 'application/pdf', modifiedTime: '2026-11-16T15:00:00.000Z', webViewLink: 'https://drive.google.com/file/d/drv-scan/view', parents: ['11kjK9ibJ3DTL4CQU0tzBPuLHQD9zbOmm'] }, { id: 'drv-disp', name: 'Memo solicita OC disposición final octubre 3447-187-LR24.pdf', mimeType: 'application/pdf', modifiedTime: '2026-11-16T15:01:00.000Z', webViewLink: 'x', parents: ['zzz'] }] });
  r = await ingesta(); s = await estado(); const rev = s.eventos.filter(e => e.modulo === 'Revisión');
  ok('P05', 'Un documento que no se puede clasificar va a la cola de revisión sin mover ningún estado; el de disposición final se omite', r.resumen.revision === 1 && rev.length === 1 && rev[0].verificacion === 'En revisión' && r.omitidos >= 1 && stSan === JSON.stringify(M.derivarSanciones(s.eventos, HOY).map(x => x.estado)), { informe: r.resumen, omitidos: r.omitidos, filaRevision: { clave: rev[0].clave, detalle: rev[0].detalle.slice(0, 120) } });
  await ctl({ driveFiles: [] });
  // P06 validación
  r = await ingesta({ eventos: [{ clave: 'PAG|2026-10|factura|X1', modulo: 'Pago', entidad: '2026-10', hito: 'factura', fecha: '2026-13-45', monto: -5, unidadMonto: 'CLP', documento: 'Factura con datos inválidos (PRUEBA)' }] }); s = await estado(); const er = s.eventos.filter(e => e.modulo === 'Error' && e.hito === 'validacion');
  ok('P06', 'Un dato inválido (fecha imposible, monto negativo) se rechaza y queda registrado con el motivo', r.resumen.error === 1 && er.length === 1 && /fecha inválida/.test(er[0].detalle) && !s.eventos.some(e => e.clave === 'PAG|2026-10|factura|X1'), { informe: r.resumen, motivo: er[0].detalle.slice(0, 110) });
  // P07 falla temporal y reproceso
  const ev = { clave: 'PAG|2026-10|oc_aceptada|3447-2901-SE26', modulo: 'Pago', entidad: '2026-10', hito: 'oc_aceptada', numero: '3447-2901-SE26', fecha: '2026-11-16', fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', documento: 'Aceptación OC 3447-2901-SE26 en Mercado Público (PRUEBA)', respaldo: 'https://www.mercadopublico.cl/prueba', obligacion: 'OB-02' };
  await ctl({ failClaves: { [ev.clave]: 3 } }); r = await ingesta({ eventos: [ev] }); s = await estado(); const e1 = s.eventos.filter(e => e.modulo === 'Error' && e.hito === 'escritura_fallida');
  const falla = { exito: r.exito, fallas: r.fallas, intentos503: s.log.length, errorRegistrado: e1.length, creado: s.eventos.some(e => e.clave === ev.clave) };
  const rr = await llamar('reprocesar'); s = await estado(); const e2 = s.eventos.filter(e => e.modulo === 'Error' && e.hito === 'escritura_fallida')[0];
  ok('P07', 'Una falla temporal de escritura (3 intentos) queda registrada y el reproceso la completa y la cierra', falla.exito === false && falla.intentos503 === 3 && falla.errorRegistrado === 1 && !falla.creado && s.eventos.some(e => e.clave === ev.clave && e.vigente) && e2.verificacion === 'Acreditado' && pago(s, '2026-10').estado === 'OC aceptada', { falla, trasReproceso: { creado: s.eventos.some(e => e.clave === ev.clave), errorVerificacion: e2.verificacion, nota: e2.rectificaA, estadoPago: pago(s, '2026-10').estado }, respuesta: rr });
  // P08 fuente caída
  const marcaAntes = s.eventos.filter(e => e.modulo === 'Sistema')[0].fecha; await new Promise(z => setTimeout(z, 1100));
  await ctl({ driveDown: true }); r = await ingesta(); s = await estado(); const ef = s.eventos.filter(e => e.hito === 'fuente_no_disponible'), sis2 = s.eventos.filter(e => e.modulo === 'Sistema')[0];
  await ctl({ driveDown: false }); const r3 = await ingesta();
  ok('P08', 'Si Drive no responde, la corrida lo informa, no marca «exitosa» y la siguiente corrida se recupera', r.exito === false && ef.length === 1 && /con errores/.test(sis2.detalle) && r3.exito === true, { conDriveCaido: { exito: r.exito, fallasFuente: r.fallasFuente, marca: sis2.detalle.slice(0, 60) }, siguiente: { exito: r3.exito } });
  // P09 acto formal sin respaldo no avanza; con respaldo avanza y calcula plazo
  s = await estado(); const e6 = san(s, 'PS06').estado;
  r = await ingesta({ eventos: [{ clave: 'SAN|PS06|decreto_multa|9999', modulo: 'Sanción', entidad: 'PS06', hito: 'decreto_multa', numero: '9999', fecha: '2026-11-10', monto: 10, unidadMonto: 'UTM', obligacion: 'OB-25' }] }); s = await estado(); const sinResp = san(s, 'PS06');
  r = await ingesta({ eventos: [{ clave: 'SAN|PS06|decreto_multa|9999', modulo: 'Sanción', entidad: 'PS06', hito: 'decreto_multa', numero: '9999', fecha: '2026-11-10', fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', monto: 10, unidadMonto: 'UTM', documento: 'D.A. 9.999/2026 aplica multa (PRUEBA)', respaldo: 'https://drive.google.com/file/d/prueba-da/view', obligacion: 'OB-25' },
    { clave: 'SAN|PS06|notificacion|of-31', modulo: 'Sanción', entidad: 'PS06', hito: 'notificacion', fecha: '2026-11-12', fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', documento: 'Oficio 31/2026 notifica decreto (PRUEBA)', respaldo: 'https://drive.google.com/file/d/prueba-of/view', obligacion: 'OB-25' }] });
  s = await estado(); const conResp = san(s, 'PS06');
  ok('P09', 'Un decreto sin respaldo no cambia el estado; con respaldo y notificación acreditada avanza y calcula el plazo de reposición', sinResp.estado === e6 && sinResp.pendientesDeRespaldo.length >= 1 && conResp.estado === 'Notificación del decreto a Cosemar' && conResp.plazo.vence === '2026-11-20' && conResp.plazo.diasHabiles === 4 && conResp.montos.decretado.valor === 10, { estadoInicial: e6, sinRespaldo: { estado: sinResp.estado, plazo: sinResp.plazo.estado }, conRespaldo: { estado: conResp.estado, notificacion: conResp.notificacion.fecha, regla: conResp.plazo.regla, vence: conResp.plazo.vence, diasHabilesRestantes: conResp.plazo.diasHabiles, decretadoUTM: conResp.montos.decretado.valor } });
  // P10 descuento una sola vez y derivación ≠ cobro efectivo
  const c0 = san(s, 'PS05');
  const der = { clave: 'SAN|PS05|derivacion_cobro|1732', modulo: 'Sanción', entidad: 'PS05', hito: 'derivacion_cobro', numero: '1732', fecha: '2026-08-21', fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', monto: 4193340, unidadMonto: 'CLP', documento: 'Memo 1732/2026 instruye descuento (PRUEBA)', respaldo: 'https://drive.google.com/file/d/prueba-1732/view', obligacion: 'OB-28' };
  r = await ingesta({ eventos: [der] }); s = await estado(); const c1 = san(s, 'PS05');
  const cob = { clave: 'SAN|PS05|cobro_efectivo|EP-2026-06', modulo: 'Sanción', entidad: 'PS05', hito: 'cobro_efectivo', numero: 'EP-2026-06', fecha: '2026-09-03', fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', monto: 4193340, unidadMonto: 'CLP', documento: 'Estado de pago junio 2026 con descuento (PRUEBA)', respaldo: 'https://drive.google.com/file/d/prueba-ep/view', detalle: 'Estado de pago: 2026-06', obligacion: 'OB-40' };
  await ingesta({ eventos: [cob] }); await ingesta({ eventos: [cob, Object.assign({}, cob)] }); s = await estado(); const c2 = san(s, 'PS05');
  ok('P10', 'Derivar a cobro no equivale a cobrar; el descuento efectivo se contabiliza una sola vez aunque el documento llegue tres veces', c0.montos.cobrado === null && c1.estado === 'Derivación a cobro (instrucción de descuento)' && c1.montos.cobrado === null && c2.cerrada && c2.montos.cobrado.valor === 4193340 && s.eventos.filter(e => e.clave === cob.clave).length === 1, { antes: { estado: c0.estado, cobrado: c0.montos.cobrado }, trasDerivacion: { estado: c1.estado, derivado: c1.montos.derivado.valor, cobrado: c1.montos.cobrado }, trasCobro: { estado: c2.estado, propuestoUTM: c2.montos.propuesto.valor, decretadoUTM: c2.montos.decretado.valor, cobradoCLP: c2.montos.cobrado.valor, respaldo: c2.montos.cobrado.respaldo, filasDelCobro: s.eventos.filter(e => e.clave === cob.clave).length } });
  // P11 avisos una sola vez
  const a1 = await llamar('avisos'); s = await estado(); const n1 = s.eventos.filter(e => e.modulo === 'Aviso').length, m1 = s.mails.length; const a2 = await llamar('avisos'); s = await estado();
  ok('P11', 'Los avisos se envían en un solo mensaje y una sola vez por evento', n1 > 0 && m1 === 1 && s.mails.length === 1 && s.eventos.filter(e => e.modulo === 'Aviso').length === n1 && s.mails[0].total === n1, { primeraCorrida: { avisosRegistrados: n1, mensajes: m1, asunto: s.mails[0].asunto }, segundaCorrida: { mensajesTotales: s.mails.length, respuesta: a2 }, ejemplos: s.mails[0].html.match(/<li>.*?<\/li>/g).slice(0, 3) });
  // P12 un vencimiento nuevo genera exactamente un aviso más
  await ingesta({ eventos: [{ clave: 'VEN|M-940|revision_tecnica|2026-11-10', modulo: 'Vencimiento', entidad: 'M-940', hito: 'revision_tecnica', fecha: '2026-11-10', fechaTipo: 'Declarada', documento: 'Revisión técnica (PRUEBA de vencido)', respaldo: 'https://docs.google.com/spreadsheets/d/prueba', patente: 'TCRY91-K', obligacion: 'OB-20' }] });
  await llamar('avisos'); s = await estado(); const ult = s.mails[s.mails.length - 1];
  ok('P12', 'Un documento de flota que aparece vencido genera un único aviso adicional', s.mails.length === 2 && ult.total === 1 && /VENCIDO/.test(ult.html), { mensajes: s.mails.length, aviso: ult.html.match(/<li>.*?<\/li>/g) });
  if (ACC) fs.writeFileSync(__dirname + '/resultados_e2e_acciones.json', JSON.stringify({ fecha: new Date().toISOString(), motor: 'acciones/ejecutor.js (GitHub Actions)', pruebas: R }, null, 1));
  else { fs.writeFileSync(__dirname + '/resultados_e2e.json', JSON.stringify({ fecha: new Date().toISOString(), n8n: '2.47.7 (local)', pruebas: R }, null, 1));
  fs.writeFileSync(__dirname + '/estado_final_mock.json', JSON.stringify(s.eventos)); }
  const f = R.filter(x => x.resultado !== 'APROBADA'); console.log('\n' + (R.length - f.length) + '/' + R.length + ' aprobadas'); process.exit(f.length ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
