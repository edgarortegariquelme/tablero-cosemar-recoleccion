/* Libro de control · carga inicial (corte 16-11-2026). Cada registro cita su respaldo.
 * Origen: Notion (Trazabilidad, expediente canónico), Inventario maestro (22-09-2026), planilla de vencimientos y flujograma. */
var C = require('./catalogo.js'), M = require('../motor/motor.js'), F = C.fuentes, N = 'https://app.notion.com/p/', D = 'https://drive.google.com/file/d/';
var INV = 'Semilla 16-11-2026 · Inventario maestro 22-09-2026', NOT = 'Semilla 16-11-2026 · Notion Trazabilidad', out = [];
function f(s) { if (!s) return null; if (/^\d{4}-/.test(s)) return s; var p = s.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
function add(e) { e.vigente = true; e.version = 1; if (!e.fechaTipo) e.fechaTipo = e.fecha ? 'Fecha de archivo' : 'Sin fecha'; if (!e.verificacion) e.verificacion = 'Reportado'; e.huella = M.huella(e); out.push(e); return e; }
function S(id, hito, fecha, doc, x) { x = x || {}; var meta = C.sanciones[id];
  return add(Object.assign({ clave: 'SAN|' + id + '|' + hito + '|' + (x.numero || M.hash(doc)), modulo: 'Sanción', entidad: id, hito: hito, fecha: f(fecha), documento: doc, respaldo: F.multas.u, obligacion: meta.obligacion, origen: INV,
    detalle: x.nota || '' }, x, { nota: undefined })); }
function P(per, hito, fecha, doc, x) { x = x || {};
  return add(Object.assign({ clave: 'PAG|' + per + '|' + hito + '|' + (x.numero || M.hash(doc)), modulo: 'Pago', entidad: per, hito: hito, fecha: f(fecha), documento: doc, respaldo: F.pagos.u, origen: INV,
    obligacion: { memo_oc: 'OB-01', oc_emitida: 'OB-01', oc_aceptada: 'OB-02', factura: 'OB-03', informe_gps: 'OB-10,OB-24', informe_trabajos: 'OB-10', recepcion_conforme: 'OB-10', revision_sanciones: 'OB-11', memo_pago: 'OB-04', pago: 'OB-10', diferencia: 'OB-15' }[hito] || null,
    detalle: x.nota || '' }, x, { nota: undefined })); }
var V261 = { monto: 261767423, unidadMonto: 'CLP' };

// ===== Sanciones =====
S('PS01','manifold','25-02-2026','0. manifold 45.pdf'); S('PS01','informe_tecnico','25-02-2026','3. informe 1 inicia proceso (firmado).pdf');
S('PS01','comunicacion_empresa','25-02-2026','4. Manifold 47 informa inicio.pdf'); S('PS01','comunicacion_empresa','26-02-2026','5. manifold 1 da plazo.pdf');
S('PS01','respuesta_empresa','02-03-2026','6.1 Oficio apelacion multa N°1.2026.pdf');
S('PS01','informe_tecnico','02-03-2026','7. informe consolidado sanciona infraccion 15 UTM firmado.pdf',{monto:15,unidadMonto:'UTM'});
S('PS01','memo_secmun','03-03-2026','8. memo sec mun solicita decretar multa 15 UTM.docx',{monto:15,unidadMonto:'UTM',verificacion:'Por verificar',nota:'Word sin número ni firma: no consta envío'});
S('PS01','respuesta_empresa','30-03-2026','8. APELACIÓN MULTA 24-02-2026 - (4.1).pdf');
S('PS01','informe_evaluacion','20-04-2026','10. INFORME DE EVALUACIÓN DE SUBSANACIÓN Y CONFORMIDAD.pdf');
S('PS01','cierre_sin_multa','02-06-2026','11. mail de cierre.msg',{nota:'Proceso dejado sin efecto'});
S('PS02','comunicacion_empresa','05-02-2026','1. Gmail - Instrucción gráfica e identificación.pdf');
S('PS02','informe_tecnico','17-02-2026','4. INFORME TECNICO FUNDADO.pdf',{monto:40,unidadMonto:'UTM',nota:'Monto 40 UTM según matriz del inventario: cotejar en el informe'});
S('PS02','manifold','25-02-2026','0. manifold 46.pdf'); S('PS02','informe_evaluacion','27-02-2026','9. informe acoge parcialmente descargos.docx');
S('PS02','respuesta_empresa','06-04-2026','14. Carta Apelacion Grafica.PDF');
S('PS02','respuesta_empresa','03-06-2026','22. Gmail - RE proceso sancionatorio en curso N°2.2026.pdf',{nota:'Correspondencia sobre el proceso en curso; contenido por cotejar'});
S('PS03','manifold','2026-02-11','Gmail - manifold 11-02-2026 camión con RT rechazada.pdf',{fechaTipo:'Declarada',patente:'TPPW41-0',nota:'Fecha según el nombre del documento'});
S('PS03','informe_tecnico','16-02-2026','informe n 1 encargado contrato inicia proceso.pdf'); S('PS03','respuesta_empresa','16-02-2026','4. CARTA DE APELACIÓN cosemar.pdf');
S('PS03','informe_tecnico','03-03-2026','7. informe n°2 aplica multa 5 UTM.docx',{monto:5,unidadMonto:'UTM'});
S('PS03','memo_secmun','02-06-2026','1150.2026 MEMO SOLICITA DECRETAR MULTA PROCESO 3.docx',{numero:'1150',monto:5,unidadMonto:'UTM'});
S('PS03','decreto_multa','09-06-2026','3307 - Multa a Empresa Cosemar Spa PP N°60-2023.pdf',{numero:'3307',monto:5,unidadMonto:'UTM',nota:'Revisar RUT consignado en el D.A. 3.307 (observación del diagnóstico 09-10-2026)'});
S('PS03','notificacion','13-08-2026','MAIL. Informa resolución proceso multa N32023 por papeles vencidos móvil 980..msg');
S('PS04','comunicacion_empresa','16-02-2026','1. Gmail - inicio proceso de multa por limpieza de equipos.pdf'); S('PS04','informe_tecnico','16-02-2026','3.1 Informe N°2 proceso sancionat limpieza flota.pdf');
S('PS04','manifold','25-02-2026','1.1 MANIFOLD.pdf'); S('PS04','respuesta_empresa','25-02-2026','10. Apelación Multa Cursada Cosemar (Recepcion Conforme).pdf');
S('PS04','cierre_sin_multa','03-06-2026','11.1 Informe cierre proceso N4.2026 deja sin efecto.pdf');
S('PS05','manifold','06-04-2026','1. manifold 4 inicia proceso sancionatorio n°5.2026.pdf'); S('PS05','informe_tecnico','06-04-2026','5. informe tecnico proceso N°5.pdf');
S('PS05','comunicacion_empresa','06-04-2026','6.oficio N°5 informa inicio proceso n5.pdf'); S('PS05','respuesta_empresa','22-04-2026','7. APELACIÓN PROCESO SANCIONATORIO - CAMBIO EN PLAN DE TRABAJO.pdf');
S('PS05','memo_secmun','13-05-2026','849.2026 MEMO SOLICITA DECRETAR MULTA PROCESO 5.docx',{numero:'849',monto:60,unidadMonto:'UTM'});
S('PS05','decreto_multa','18-05-2026','10. DECRETO ALC N 2463 - 2026.pdf',{numero:'2463',monto:60,unidadMonto:'UTM',nota:'60 UTM = $4.193.340 según matriz del inventario'});
S('PS05','notificacion','19-05-2026','12. manifold 26 informa decreto multa5.2026.pdf',{nota:'También: 11. oficio N°8 cosemar oficia multa.docx'});
S('PS05','reposicion_recibida','26-05-2026','13. Reposición alto hospicio (multa 5).pdf'); S('PS05','analisis_reposicion','27-05-2026','14. informe recomienda mantener firme.docx');
S('PS05','memo_reposicion','16-06-2026','1099. 2026 pide mantener firme multa.docx',{numero:'1099'});
S('PS05','decreto_final','2026-06-17','DECRETO ALC N 3649 - 2026 mantengase firme multa 5.pdf',{numero:'3649',monto:60,unidadMonto:'UTM',fechaTipo:'Declarada',nota:'Fecha 17-06-2026 según el título del D.A. 4.637'});
S('PS05','rectificacion_decreto','07-08-2026','4637 - Rectifiquese DA N°3.649 de fecha 17 de junio de 2026.pdf',{numero:'4637',monto:60,unidadMonto:'UTM'});
S('PS05','derivacion_cobro',null,'Memo 1732/2026 · instruye descuento en pago de junio (citado en el inventario)',{numero:'1732',monto:4193340,unidadMonto:'CLP',verificacion:'Por verificar',respaldo:null,nota:'No localizado en la carpeta de junio, donde figura el memo 1570/2026: aclarar número y obtener el estado de pago con el descuento'});
S('PS06','manifold','2026-04-14','1. Gmail - Manifold 14-04-2026 equipo no asociado a contrato_.pdf',{fechaTipo:'Declarada',nota:'Fecha según el nombre del documento'});
S('PS06','informe_tecnico','14-04-2026','2. INFORME DE FISCALIZACIÓN ITS.pdf'); S('PS06','respuesta_empresa','20-04-2026','3. RESPUESTA A INFORME - DESVIACIONES DETECTADAS.pdf');
S('PS06','informe_evaluacion','22-04-2026','5. informe respuesta y descargos cosemar proceso 6.pdf');
S('REQ07','manifold','05-06-2026','1. manifold 28 solicita res san instalaciones cosemar.pdf',{nota:'El diagnóstico del 09-10 fecha el requerimiento el 03-06: diferencia por cotejar'});
S('REQ07','comunicacion_empresa','05-06-2026','2. mail requerimiento anexo a manifold 28.msg');
Object.keys(C.sanciones).forEach(function (id) { var m = C.sanciones[id];
  add({ clave: 'HAL|' + id, modulo: 'Hallazgo', entidad: id, hito: 'hallazgo', documento: m.titulo, respaldo: F.multas.u, obligacion: m.obligacion, sector: m.sector, patente: m.patente || null, origen: INV, detalle: 'Cláusula: ' + C.obligaciones.filter(function (o) { return o.id === m.obligacion; })[0].clausula + ' · Carpeta: ' + m.carpeta }); });

// ===== Pagos por mes de servicio =====
P('2025-12','oc_emitida','10-02-2026','OC 3447-88-SE26 servicio Diciembre 25 (sin reajuste).pdf',{numero:'3447-88-SE26'});
P('2025-12','memo_pago','24-11-2025','274.2026 SOLICITA PAGO FACTURA DICIEMBRE 2025.docx',{numero:'274',verificacion:'Por verificar',nota:'Word con fecha de archivo anterior al mes de servicio: confirmar memo firmado'});
P('2026-01','memo_oc','05-02-2026','258.2026 MEMO FINANZAS PIDE OC ENERO 2026.docx',{numero:'258'}); P('2026-01','informe_gps','04-02-2026','5. CONTROL DOCUMENTAL GPS ENERO 2026_compressed (1).pdf');
P('2026-01','recepcion_conforme','25-02-2026','Certificado de Recepción Conforme Firmado.pdf'); P('2026-01','memo_pago','25-02-2026','408.2026 SOLICITA PAGO FACTURA ENERO 2026.pdf',{numero:'408'});
P('2026-02','memo_oc','16-03-2026','X.2026 MEMO FINANZAS PIDE OC FEBRERO 2026.docx',{verificacion:'Por verificar',nota:'Memo sin número («X»): expediente incompleto'});
P('2026-02','informe_gps','25-03-2026','CONTROL DOCUMENTAL GPS FEBRERO 2026 HERNAN.pdf'); P('2026-02','memo_pago','24-03-2026','memo 642.pdf',{numero:'642'});
P('2026-03','memo_oc','28-04-2026','839.2026 MEMO FINANZAS PIDE OC MARZO 2026.docx',{numero:'839'});
P('2026-03','informe_gps','21-04-2026','2. Gmail - INFORME CONTROL DOCUMENTAL VALIDACION DE SERVICIO Y RESPALDO FOTOGRAFICO MARZO 2026.pdf');
P('2026-03','informe_trabajos','21-04-2026','2. Gmail - INFORME CONTROL DOCUMENTAL VALIDACION DE SERVICIO Y RESPALDO FOTOGRAFICO MARZO 2026.pdf',{numero:'fotos-marzo'});
P('2026-03','recepcion_conforme','11-05-2026','5. Certificado Recepción Conforme.pdf'); P('2026-03','memo_pago','11-05-2026','00. memo 961 Solicitud de Pago Servicio de Recolección Marzo 2026.pdf',{numero:'961'});
P('2026-04','memo_oc','01-06-2026','1135.2026 MEMO FINANZAS PIDE OC ABRIL 2026.docx',{numero:'1135'}); P('2026-04','oc_emitida','05-06-2026','4. OC 3447-1576-SE26 servicio Abril 2026.pdf',{numero:'3447-1576-SE26'});
P('2026-04','informe_gps','13-05-2026','3. INFORME DOCUMENTAL GPS ABRIL 2026.pdf'); P('2026-04','memo_pago','12-06-2026','1231.2026 SOLICITA PAGO FACTURA ABRIL 2026.docx',Object.assign({numero:'1231',nota:'Monto según inventario (abril–agosto)'},V261));
P('2026-05','memo_oc','01-06-2026','1137.2026 MEMO FINANZAS PIDE OC MAYO 2026.docx',{numero:'1137'}); P('2026-05','oc_emitida','05-06-2026','OC 3447-1577-SE26 servicio mayo 2026.pdf',{numero:'3447-1577-SE26'});
P('2026-05','oc_emitida','09-06-2026','Gmail - Informa solicitud para cancelación a Proveedor OC 3447-1577-SE26 reemplaza OC 3447-1625',{numero:'3447-1625-SE26',nota:'OC 3447-1625 reemplazada por la 3447-1577 según el correo'});
P('2026-05','informe_gps','16-06-2026','5. CONTROL DOCUEMENTAL GPS MAYO 2026.pdf'); P('2026-05','memo_pago','19-06-2026','1301.2026 SOLICITA PAGO FACTURA MAYO 2026.docx',Object.assign({numero:'1301',nota:'Monto según inventario'},V261));
P('2026-06','memo_oc','06-07-2026','1390.2026 MEMO FINANZAS PIDE OC JUNIO 2026.docx',{numero:'1390'}); P('2026-06','informe_gps','10-07-2026','6. CONTROL DOCUMENTAL GPS JUNIO 2026.pdf');
P('2026-06','recepcion_conforme','24-06-2026','CERTIFICADO RECEP CONFORME JUNIO 2026.docx',{verificacion:'Por verificar',nota:'El inventario indica que el archivo contiene una nota sobre la multa D.A. 3.307, no el certificado'});
P('2026-06','memo_pago','20-08-2026','1570.2026 SOLICITA PAGO FACTURA JUNIO 2026 (1).docx',Object.assign({numero:'1570',nota:'Monto según inventario'},V261));
P('2026-06','diferencia','29-07-2026','pago cosemar junio 2026 con firmas.pdf',{nota:'Documento firmado del 29-07 anterior al memo 1570 (20-08); el inventario cita el memo 1732 como instrucción de descuento de PS05 ($4.193.340) y la nota de multa D.A. 3.307 (PS03): verificar en el estado de pago qué descuento se aplicó y que se haya contabilizado una sola vez'});
P('2026-07','memo_oc','11-08-2026','1673.2026 MEMO FINANZAS PIDE OC JULIO 2026.docx',{numero:'1673'}); P('2026-07','informe_gps','05-08-2026','Gmail - CONTROL DOCUMENTAL JULIO 2026.pdf');
P('2026-07','recepcion_conforme','24-06-2026','CERTIFICADO RECEP CONFORME JULIO 2026 (1).docx',{verificacion:'Por verificar',nota:'Archivo fechado antes del mes de servicio; el inventario indica que contiene una nota sobre la multa D.A. 3.307'});
P('2026-07','memo_pago','02-09-2026','1797.2026 solicita pago factura julio cosemar recoleccion.docx',Object.assign({numero:'1797',nota:'Monto según inventario'},V261));
P('2026-08','memo_oc','2026-09-07','Memo 1839/2026 · Solicita OC agosto 2026',Object.assign({numero:'1839',fechaTipo:'Acto acreditado',verificacion:'Acreditado',respaldo:'https://docs.google.com/document/d/1f0EVRjR9_6wg7_OFQmMrI4djA8peLtZ3/edit',origen:'Semilla 16-11-2026 · Notion expediente'},V261));
P('2026-08','memo_pago','2026-09-24','Memo 1964/2026 · Solicita pago agosto 2026',Object.assign({numero:'1964',fechaTipo:'Acto acreditado',verificacion:'Acreditado',respaldo:'https://docs.google.com/document/d/1OBRL2J5z-D6kYcJs5zQMMOuh-jSeeWuw/edit',origen:'Semilla 16-11-2026 · Notion expediente'},V261));
P('2026-09','factura',null,'Factura 54.395 (citada en el Memo 2111/2026)',Object.assign({numero:'54395',respaldo:D+'1py1mDc2v2TbQZ4o4y3ZEyImVv8hsdV9L/view',origen:NOT,nota:'Fecha de emisión y OC del período por incorporar'},V261));
P('2026-09','memo_pago','2026-10-20','Memo 2111/2026 · Solicita pago factura 54.395 septiembre',Object.assign({numero:'2111',fechaTipo:'Acto acreditado',verificacion:'Acreditado',respaldo:D+'1py1mDc2v2TbQZ4o4y3ZEyImVv8hsdV9L/view',origen:NOT,nota:'Trámite Notion N°9 · pelota en DAF desde 20-10 · '+N+'4159e3e655c08141a053e055b397981a'},V261));
P('2026-10','memo_oc','2026-11-05','Memo 2211/2026 · Solicita OC octubre 2026',Object.assign({numero:'2211',fechaTipo:'Acto acreditado',verificacion:'Acreditado',respaldo:D+'1mx8cKl4eLUxuUS_BiPfC1eBRm4rpt32-/view',origen:NOT,nota:'Trámite Notion N°14 · pelota en DAF desde 05-11 · '+N+'4159e3e655c081ceb8b1e389328b5325'},V261));
P('AJUSTE-DA2459','memo_oc','09-06-2026','1124.2026 MEMO FINANZAS PIDE OC DEUDA COSEMAR IPC CON AUM POB.docx',{numero:'1124',nota:'Ajuste retroactivo por D.A. 2.459 (IPC 4,1% + viviendas): se controla aparte de las mensualidades para no duplicarlo'});
P('AJUSTE-DA2459','recepcion_conforme','18-06-2026','INFOFRME RECEP DEUDA IPC Y AUM POB.docx'); P('AJUSTE-DA2459','memo_pago','13-07-2026','1300.2026 MEMO FINANZAS PIDE pago factura DEUDA COSEMAR IPC CON AUM POB.docx',{numero:'1300'});

// ===== Vencimientos: garantías, seguros y flota =====
function Vn(ent, tipo, vence, doc, x) { return add(Object.assign({ clave: 'VEN|' + ent + '|' + tipo + '|' + (x && x.numero || vence), modulo: 'Vencimiento', entidad: ent, hito: tipo, fecha: vence, fechaTipo: 'Declarada', documento: doc, respaldo: F.venc.u, origen: 'Semilla 16-11-2026 · Control vencimientos COSEMAR', detalle: '' }, x || {})); }
Vn('GAR-FC','poliza','2029-10-28','Póliza Continental 224103598 · fiel cumplimiento',{numero:'224103598',monto:19605,unidadMonto:'UF',respaldo:F.poliza.u,fechaTipo:'Acto acreditado',verificacion:'Acreditado',obligacion:'OB-17',detalle:'Emitida 04-06-2024 · vigencia 01-07-2024 a 28-10-2029',origen:'Semilla 16-11-2026 · Notion expediente'});
Vn('GAR-FC','endoso','2029-10-28','Endoso 225146034 · +UF 355 · total UF 19.960',{numero:'225146034',monto:19960,unidadMonto:'UF',respaldo:F.endoso355.u,fechaTipo:'Acto acreditado',verificacion:'Acreditado',obligacion:'OB-17',detalle:'Emitido 16-12-2025 · vigencia 09-12-2025 a 28-10-2029',origen:'Semilla 16-11-2026 · Notion expediente'});
Vn('GAR-FC','endoso','2029-10-28','Endoso 226139451 · +UF 419,57 · total UF 20.379,57',{numero:'226139451',monto:20379.57,unidadMonto:'UF',respaldo:F.nGar.u,fechaTipo:'Acto acreditado',verificacion:'Reportado',obligacion:'OB-17',detalle:'Emitido 26-10-2026 · rige desde 19-10-2026 · recibido, en revisión formal de Jurídico; anexo y decreto pendientes; custodia en Tesorería pendiente',origen:NOT});
Vn('SEG-RC','poliza','2027-07-31','Póliza RC Continental 226102080 · UF 2.000',{numero:'226102080',monto:2000,unidadMonto:'UF',respaldo:F.rc.u,fechaTipo:'Acto acreditado',verificacion:'Acreditado',obligacion:'OB-18',detalle:'Vigencia 31-07-2026 12:00 a 31-07-2027 12:00 · la página 4 indica ID 3447-86-LE23 en vez de LR23: proponer rectificación · renovación automática condicionada',origen:'Semilla 16-11-2026 · Notion expediente'});
var FL = 'M-921 SZZJ80-4 2026-11-16|M-922 SZZJ82-0 2026-11-19|M-938 TCXV47-0 2026-12-18|M-939 TCXV48-9 2026-12-24|M-940 TCRY91-K 2026-12-05|M-970 TPPW40-2 2027-01-02|M-971 TPPW38-0 2027-01-07|M-972 TPPW36-4 2027-01-17|M-973 TPPW34-8 2027-01-23|M-974 TPPW33-K 2027-01-14|M-975 TPPW31-3 2027-01-24|M-976 TPPW32-1 2027-01-18|M-977 TPPW39-9 2027-01-21|M-978 TPPW42-9 2027-01-11|M-979 TPRD80-3 2027-01-13|M-980 TPPW41-0 2027-01-31|M-984 TPRF92-3 2030-07-22|M-985 PWWC14-3 2027-01-14';
FL.split('|').forEach(function (r) { var p = r.split(' ');
  Vn(p[0],'revision_tecnica',p[2],'Revisión técnica',{patente:p[1],obligacion:'OB-20'}); Vn(p[0],'permiso_circulacion','2027-09-30','Permiso de circulación 2026',{patente:p[1],obligacion:'OB-21'}); Vn(p[0],'soap','2027-09-30','SOAP 2026-2027 (Seguros Sura)',{patente:p[1],obligacion:'OB-22'}); });

// ===== Reajustes y modificaciones (trámites vigentes en Notion) =====
function R(id, hito, fecha, doc, url, det, x) { return add(Object.assign({ clave: 'REA|' + id + '|' + hito, modulo: 'Reajuste', entidad: id, hito: hito, fecha: fecha, fechaTipo: fecha ? 'Acto acreditado' : 'Sin fecha', verificacion: 'Acreditado', documento: doc, respaldo: N + url, detalle: det, origen: NOT, obligacion: 'OB-15,OB-16' }, x || {})); }
R('DA-2459','anexo_en_tramite','2026-11-11','Anexo de contrato por D.A. 2.459/2026 (IPC 4,1% + 1.317 viviendas)','4159e3e655c0819cb21ddee46f0a5239','Estado: Enviado · en DAF desde 11-11 · falta certificado presupuestario acotado (Memo 2256/2026) · en ejecución: $261.767.423/mes',{monto:261767423,unidadMonto:'CLP'});
R('DA-3957','decretado_no_ejecutado','2026-07-02','D.A. 3.957/2026 (1.116 viviendas) · anexo de contrato','4159e3e655c081eabe14fccfe1d8c7ca','Decretado el 02-07-2026, vigente desde 01-07-2026, NO ejecutado: OC y pagos siguen en $261.767.423 · en Jurídico desde 15-10',{monto:267940006,unidadMonto:'CLP'});
R('IPC-2P','observado','2026-10-22','Reajuste IPC 2° período (4,3%) · anexo de contrato','4159e3e655c081468b95e5300eacc8f2','Estado: Observado · NO VALIDADO · en Administración desde 22-10 · DAF sin certificado presupuestario · propuesta $234.618.492 neto / $279.196.005 bruto: no incluido en ninguna factura',{monto:279196005,unidadMonto:'CLP',verificacion:'Reportado',obligacion:'OB-15'});
R('GAR-ANEXO','respondido','2026-11-11','Anexo de garantía · Endoso 226139451 (UF 419,57)','4159e3e655c081adb462f2691c014371','Estado: Respondido · en Jurídico desde 11-11 · depende de los anexos D.A. 2.459 y 3.957',{obligacion:'OB-17'});

// ===== Registro de control (monitoreo) =====
function K(id, fecha, item, evidencia, url, resultado, seguimiento, obl) { return add({ clave: 'CTL|' + id, modulo: 'Control', entidad: item, hito: 'control', fecha: fecha, fechaTipo: 'Acto acreditado', verificacion: 'Reportado', documento: evidencia, respaldo: url, detalle: 'Resultado: ' + resultado + ' · Seguimiento: ' + seguimiento, obligacion: obl, origen: 'Semilla 16-11-2026 · Notion expediente' }); }
K('flota-2026-10-15','2026-10-15','Flota','Correo «DETALLE DE MOVILES» de Cosemar (estado reportado, no inspección municipal)','https://mail.google.com/mail/u/0/#all/1a13ffb32d55d93f','18 equipos: 11 en ruta, 2 en base, 5 en taller','Comprobar retorno de 922 y 939','OB-29,OB-25');
K('flota-2026-10-16','2026-10-16','Flota','Correo de Cosemar con estado de flota','https://mail.google.com/mail/u/0/#all/1a1449d375ac6d65','12 en ruta, 4 en base, 1 pendiente de retiro (978), 1 en reparación (974)','Comprobar retiro físico de 978 y fecha de retorno de 974','OB-29,OB-25');
K('garantia-oficio26','2026-10-19','Garantía','Oficio 26/2026 solicita actualizar la garantía (IT 42/2026)',D+'1kFl5ZZjbQzbin258j6NiLhiv1JPuX42d/view','Enviado; endoso recibido el 26-10-2026','Revisión formal de Jurídico y custodia en Tesorería','OB-17');
K('rc-id','2026-10-15','Seguro RC','Póliza 226102080, página 4',F.rc.u,'Observación: indica ID 3447-86-LE23 en vez de 3447-86-LR23','Proponer rectificación a la aseguradora','OB-18');
add({ clave: 'SIS|carga', modulo: 'Sistema', entidad: 'sincronizacion', hito: 'ultima_exitosa', fecha: '2026-11-16', fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', documento: 'Carga inicial del libro de control', detalle: 'Corte de datos: 2026-11-16 · registros: ' + (out.length + 1), origen: 'Semilla 16-11-2026' });
module.exports = out;
