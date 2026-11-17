/* Motor de control contractual · Cosemar Recolección (P.P. 060/2023 · ID 3447-86-LR23)
 * Funciones puras, sin dependencias. El MISMO archivo se inserta en los nodos Code de n8n
 * y en el tablero, para que estados, plazos y cifras se calculen con una sola regla.
 */
(function (root) {
  'use strict';
  var M = {};
  M.VERSION = '1.0.0';

  // ---------- Fechas y días hábiles (BA art. 7: inhábiles sábado, domingo y festivos) ----------
  M.FERIADOS = ['2026-01-01','2026-04-03','2026-04-04','2026-05-01','2026-05-21','2026-06-21','2026-06-29','2026-07-16',
    '2026-08-15','2026-09-18','2026-09-19','2026-10-12','2026-10-31','2026-11-01','2026-12-08','2026-12-25',
    '2027-01-01','2027-03-26','2027-03-27','2027-05-01','2027-05-21','2027-06-21','2027-06-28','2027-07-16',
    '2027-08-15','2027-09-17','2027-09-18','2027-09-19','2027-10-11','2027-10-31','2027-11-01','2027-12-08','2027-12-25'];
  function d(s) { var p = String(s).slice(0, 10).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function iso(dt) { return dt.toISOString().slice(0, 10); }
  M.esFecha = function (s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) && !isNaN(d(s).getTime()) && iso(d(s)) === s.slice(0, 10); };
  M.esHabil = function (s) { var w = d(s).getUTCDay(); return w !== 0 && w !== 6 && M.FERIADOS.indexOf(s.slice(0, 10)) < 0; };
  M.sumarDias = function (s, n) { var x = d(s); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
  M.sumarHabiles = function (s, n) { var x = s.slice(0, 10), c = 0; while (c < n) { x = M.sumarDias(x, 1); if (M.esHabil(x)) c++; } return x; };
  M.diasCorridos = function (a, b) { return Math.round((d(b) - d(a)) / 86400000); };
  M.diasHabilesEntre = function (a, b) { // hábiles desde a (excl.) hasta b (incl.); negativo si b<a
    if (a === b) return 0; var s = a < b ? 1 : -1, x = a, c = 0, lim = 0;
    while (x !== b && lim++ < 4000) { x = M.sumarDias(x, s); if (M.esHabil(s > 0 ? x : M.sumarDias(x, 1))) c += s; }
    return c;
  };
  M.periodoDe = function (s) { return s ? s.slice(0, 7) : null; };

  // ---------- Huella e identidad ----------
  M.hash = function (str) { var h = 5381, i; str = String(str); for (i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return ('0000000' + h.toString(16)).slice(-8); };
  M.huella = function (e) { return M.hash([e.clave, e.fecha || '', e.fechaTipo || '', e.monto == null ? '' : e.monto, e.unidadMonto || '', e.documento || '', e.respaldo || '', e.verificacion || '', String(e.detalle || '').replace(/\s*·?\s*https?:\S+/g, '').trim()].join('|')); };
  M.limpiar = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); };

  // ---------- Catálogo de hitos ----------
  // formal:true => el estado solo avanza si el hito trae respaldo (documento o enlace) y no está "Por verificar".
  M.HITOS_SAN = [
    ['manifold', 'Folio de manifold (hallazgo)', 'ITS (Hernán Gómez)', 'Comunicar el manifold foliado a Cosemar', true],
    ['comunicacion_empresa', 'Comunicación a Cosemar', 'ITS (Hernán Gómez)', 'Esperar descargos de la empresa (5 días hábiles, BA 177)', true],
    ['respuesta_empresa', 'Respuesta / descargos de Cosemar', 'ITS (Hernán Gómez)', 'Evaluar la respuesta e informar (20 días hábiles, BA 179)', true],
    ['informe_evaluacion', 'Informe que evalúa la respuesta', 'Unidad Técnica (Edgar Ortega)', 'Decidir: cierre respaldado o propuesta de multa', true],
    ['cierre_sin_multa', 'Cierre respaldado sin multa', 'Unidad Técnica (Edgar Ortega)', 'Sin acción: proceso cerrado', true],
    ['informe_tecnico', 'Informe técnico propone multa', 'ITS (Hernán Gómez)', 'Revisión de forma y fondo por Edgar', true],
    ['revision_edgar', 'Revisión y visado de Edgar', 'Unidad Técnica (Edgar Ortega)', 'Emitir memo a Secretaría Municipal proponiendo la multa', true],
    ['memo_secmun', 'Memo que solicita decretar multa', 'Unidad Técnica (Edgar Ortega)', 'Obtener visado de Alcaldía', true],
    ['visado_alcaldia', 'Visado de Alcaldía', 'Alcaldía', 'Remitir a Secretaría Municipal', true],
    ['remision_secmun', 'Remisión a Secretaría Municipal', 'Secretaría Municipal', 'Borrador de decreto', true],
    ['borrador_decreto', 'Borrador de decreto', 'Secretaría Municipal', 'Revisión de Control', true],
    ['revision_control', 'Revisión de Control', 'Control', 'Emisión del decreto', true],
    ['decreto_multa', 'Decreto alcaldicio que aplica multa', 'Secretaría Municipal', 'Publicar en Mercado Público y notificar a Cosemar', true],
    ['publicacion_mp', 'Publicación en ficha de contrato (Mercado Público)', 'Secretaría Municipal', 'Notificar por oficio y correo', true],
    ['notificacion', 'Notificación del decreto a Cosemar', 'Unidad Técnica (Edgar Ortega)', 'Esperar reposición (5 días hábiles, BA 184)', true],
    ['reposicion_recibida', 'Recurso de reposición recibido', 'Unidad Técnica (Edgar Ortega)', 'Analizar el recurso (20 días hábiles, BA 186)', true],
    ['analisis_reposicion', 'Informe de análisis de la reposición', 'Unidad Técnica (Edgar Ortega)', 'Memo con informe a visado de Jurídico', true],
    ['memo_reposicion', 'Memo que propone resolver la reposición', 'Unidad Técnica (Edgar Ortega)', 'Visado de Jurídico', true],
    ['visado_juridico', 'Visado de Jurídico', 'Jurídico', 'Visado de Alcaldía', true],
    ['visado_alcaldia_rep', 'Visado de Alcaldía (reposición)', 'Alcaldía', 'Decreto final en Secretaría Municipal', true],
    ['decreto_final', 'Decreto final del proceso', 'Secretaría Municipal', 'Comunicar a Cosemar y derivar a cobro', true],
    ['rectificacion_decreto', 'Decreto que rectifica', 'Secretaría Municipal', 'Comunicar a Cosemar y derivar a cobro', true],
    ['comunicacion_final', 'Comunicación de la decisión final', 'Unidad Técnica (Edgar Ortega)', 'Derivar a cobro en el estado de pago más próximo (BA 188)', true],
    ['sin_reposicion', 'Constancia de que no hubo reposición', 'Unidad Técnica (Edgar Ortega)', 'Derivar a cobro (multa firme, BA 187)', true],
    ['derivacion_cobro', 'Derivación a cobro (instrucción de descuento)', 'Unidad Técnica (Edgar Ortega)', 'Verificar descuento efectivo en el estado de pago', true],
    ['cobro_efectivo', 'Cobro o descuento efectivo', 'DAF', 'Sin acción: multa cobrada', true]
  ].map(function (a, i) { return { id: a[0], nombre: a[1], unidad: a[2], siguiente: a[3], formal: a[4], orden: i }; });
  M.HITOS_PAGO = [
    ['memo_oc', 'Memo correlativo solicita OC', 'Unidad Técnica (Edgar Ortega)'], ['vb_daf', 'Visto bueno y derivación a DAF', 'DAF'],
    ['oc_emitida', 'OC emitida', 'DAF'], ['oc_aceptada', 'OC recibida y aceptada por Cosemar', 'Empresa'],
    ['factura', 'Factura y carpeta de antecedentes', 'Empresa'], ['informe_gps', 'Informe GPS (Hernán)', 'ITS (Hernán Gómez)'],
    ['informe_trabajos', 'Informe de trabajos con fotografías (Hernán)', 'ITS (Hernán Gómez)'],
    ['recepcion_conforme', 'Certificado de recepción conforme', 'Unidad Técnica (Edgar Ortega)'],
    ['revision_sanciones', 'Revisión de procesos sancionatorios antes de pago', 'Unidad Técnica (Edgar Ortega)'],
    ['memo_pago', 'Memo solicita pago de factura', 'Unidad Técnica (Edgar Ortega)'], ['pago', 'Pago efectivo (comprobante)', 'DAF']
  ].map(function (a, i) { return { id: a[0], nombre: a[1], unidad: a[2], orden: i }; });
  function idx(list) { var o = {}; list.forEach(function (h) { o[h.id] = h; }); return o; }
  M.H_SAN = idx(M.HITOS_SAN); M.H_PAGO = idx(M.HITOS_PAGO);

  M.MODULOS = ['Sanción', 'Pago', 'Vencimiento', 'Hallazgo', 'Reajuste', 'Control', 'Aviso', 'Revisión', 'Error', 'Sistema'];
  M.VERIF = ['Acreditado', 'Reportado', 'Por verificar', 'En revisión'];
  M.FECHA_TIPO = ['Acto acreditado', 'Fecha de archivo', 'Declarada', 'Sin fecha'];

  // ---------- Validación ----------
  M.validar = function (e) {
    var err = [], amb = [];
    if (!e || typeof e !== 'object') return { ok: false, errores: ['registro vacío'], ambiguo: [] };
    if (!e.clave) err.push('falta clave');
    if (M.MODULOS.indexOf(e.modulo) < 0) err.push('módulo inválido: ' + e.modulo);
    if (!e.entidad) amb.push('no se pudo determinar la entidad (proceso, período o patente)');
    if (!e.hito) amb.push('no se pudo determinar el hito');
    if (e.fecha && !M.esFecha(e.fecha)) err.push('fecha inválida: ' + e.fecha);
    if (e.monto != null && (typeof e.monto !== 'number' || !isFinite(e.monto) || e.monto < 0)) err.push('monto inválido: ' + e.monto);
    if (e.monto != null && ['CLP', 'UTM', 'UF'].indexOf(e.unidadMonto) < 0) err.push('monto sin unidad (CLP/UTM/UF)');
    if (e.modulo === 'Pago' && e.entidad && !/^\d{4}-\d{2}$|^AJUSTE-/.test(e.entidad)) err.push('período de servicio inválido: ' + e.entidad);
    if (e.modulo === 'Sanción' && e.hito && !M.H_SAN[e.hito]) amb.push('hito sancionatorio desconocido: ' + e.hito);
    if (e.modulo === 'Pago' && e.hito && !M.H_PAGO[e.hito] && ['descuento_multa', 'ajuste', 'diferencia'].indexOf(e.hito) < 0) amb.push('hito de pago desconocido: ' + e.hito);
    return { ok: err.length === 0, errores: err, ambiguo: amb };
  };

  // ---------- Aplicar un candidato al libro: evita duplicados, conserva rectificaciones ----------
  // libro: registros existentes [{clave, huella, version, vigente, ...}]
  M.aplicar = function (libro, cand, ahora) {
    var v = M.validar(cand), res = { candidato: cand };
    if (!v.ok) { res.accion = 'error'; res.motivo = v.errores.join('; '); return res; }
    if (v.ambiguo.length) {
      res.accion = 'revision'; res.motivo = v.ambiguo.join('; ');
      res.registro = Object.assign({}, cand, { modulo: 'Revisión', hito: cand.hito || 'por_clasificar', entidad: cand.entidad || 'por_clasificar', verificacion: 'En revisión', vigente: true, version: 1, detalle: (cand.detalle ? cand.detalle + ' · ' : '') + 'Motivo: ' + res.motivo + (cand.modulo ? ' · Módulo sugerido: ' + cand.modulo : '') });
      res.registro.clave = 'REV|' + cand.clave; res.registro.huella = M.huella(res.registro);
      var ya = libro.filter(function (r) { return r.clave === res.registro.clave && r.vigente !== false; })[0];
      if (ya) { res.accion = 'duplicado'; res.motivo = 'ya está en la cola de revisión'; res.existente = ya; }
      return res;
    }
    var h = M.huella(cand);
    var mismos = libro.filter(function (r) { return r.clave === cand.clave; });
    var vig = mismos.filter(function (r) { return r.vigente !== false; })[0];
    if (mismos.some(function (r) { return r.huella === h && r.vigente !== false; })) { res.accion = 'duplicado'; res.motivo = 'misma clave y mismo contenido'; res.existente = vig; return res; }
    var maxV = mismos.reduce(function (m, r) { return Math.max(m, r.version || 1); }, 0);
    res.registro = Object.assign({ verificacion: 'Reportado', fechaTipo: cand.fecha ? 'Declarada' : 'Sin fecha' }, cand, { huella: h, vigente: true, version: maxV + 1 });
    // un hito formal sin respaldo no avanza estados
    if (!res.registro.respaldo && !res.registro.documento && res.registro.verificacion !== 'Por verificar') { res.registro.verificacion = 'Por verificar'; res.registro.huella = h; }
    if (vig) { res.accion = 'rectificar'; res.reemplaza = vig; res.registro.rectificaA = vig.clave + ' v' + (vig.version || 1); res.motivo = 'misma clave con contenido distinto: se conserva la versión anterior como historial'; }
    else res.accion = 'crear';
    return res;
  };

  // ---------- Clasificación de documentos detectados (Drive / Comunicaciones de Notion) ----------
  var MESES = { ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06', JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', SETIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12' };
  M.periodoEnTexto = function (t) {
    var m = M.limpiar(t).match(/(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*(?:DE\s*)?(20\d\d)?/);
    return m ? { mes: MESES[m[1]], anio: m[2] || null } : null;
  };
  M.clasificar = function (doc) { // doc: {id, nombre, ruta, fecha (modificación), enlace, origen, resumen}
    var n = M.limpiar(doc.nombre), ruta = M.limpiar(doc.ruta || ''), todo = n + ' ' + ruta + ' ' + M.limpiar(doc.resumen || '');
    var e = { documento: doc.nombre, respaldo: doc.enlace || null, origen: doc.origen || 'n8n', fecha: doc.fechaActo || doc.fecha || null,
      fechaTipo: doc.fechaActo ? 'Acto acreditado' : (doc.fecha ? 'Fecha de archivo' : 'Sin fecha'), verificacion: 'Reportado', idFuente: doc.id || null };
    if (/DISPOSICION FINAL|3447-187-LR24|SANTA INES/.test(todo)) { e.modulo = 'Revisión'; e.clave = 'DOC|' + (doc.id || M.hash(n)); e.detalle = 'Documento del contrato de disposición final (3447-187-LR24): fuera del alcance de este tablero'; e.entidad = null; return e; }
    var num = (n.match(/(?:MEMO(?:RANDUM)?|OFICIO|DECRETO(?: ALC)?|D\.?A\.?)\s*(?:N[°ºO]?\.?\s*)?(\d{1,2}\.?\d{3}|\d{1,4})/) || n.match(/^(\d{3,4})[\. ]+20\d\d/) || [])[1];
    if (num) num = num.replace('.', '');
    var per = M.periodoEnTexto(n) || M.periodoEnTexto(ruta), anio = (n.match(/20\d\d/) || ruta.match(/20\d\d/) || [(doc.fecha || '').slice(0, 4)])[0];
    var periodo = per ? ((per.anio || anio) + '-' + per.mes) : null;
    var ps = (todo.match(/PROCESO(?: SANCIONATORIO)?\s*N?[°º]?\s*(\d{1,2})\b/) || todo.match(/MULTA\s*N?[°º]?\s*(\d{1,2})\b(?! UTM)/) || ruta.match(/SANCIONATORIOS\)?[\\\/ ]+(\d{1,2})\./) || [])[1];
    var san = /SANCIONATORI|MULTA|MANIFOLD|REPOSICION|APELACION|DESCARGOS/.test(todo);
    if (san) {
      e.modulo = 'Sanción'; e.entidad = ps ? 'PS' + ('0' + ps).slice(-2) : null;
      var utm = n.match(/(\d{1,3})\s*UTM/); if (utm) { e.monto = +utm[1]; e.unidadMonto = 'UTM'; }
      if (/MANTENGASE FIRME|MANTIENE FIRME|RESUELVE REPOSICION/.test(n) && /DECRETO|D\.?A\.?/.test(n)) e.hito = 'decreto_final';
      else if (/RECTIFI/.test(n)) e.hito = 'rectificacion_decreto';
      else if (/DECRETO|^\d{4} - MULTA/.test(n)) e.hito = 'decreto_multa';
      else if (/REPOSICION|APELACION|DESCARGOS/.test(n) && !/INFORME|MEMO/.test(n)) e.hito = /REPOSICION/.test(n) ? 'reposicion_recibida' : 'respuesta_empresa';
      else if (/MEMO/.test(n) && /MANTENER FIRME|REPOSICION/.test(n)) e.hito = 'memo_reposicion';
      else if (/MEMO/.test(n) && /DECRETAR/.test(n)) e.hito = 'memo_secmun';
      else if (/INFORME/.test(n) && /MANTENER FIRME|REPOSICION/.test(n)) e.hito = 'analisis_reposicion';
      else if (/INFORME/.test(n) && /CIERRE|SIN EFECTO|CONFORMIDAD/.test(n)) e.hito = 'cierre_sin_multa';
      else if (/INFORME/.test(n) && /DESCARGOS|ACOGE/.test(n)) e.hito = 'informe_evaluacion';
      else if (/INFORME/.test(n)) e.hito = 'informe_tecnico';
      else if (/OFICIO/.test(n) && /MULTA|DECRETO/.test(n)) e.hito = 'notificacion';
      else if (/MANIFOLD/.test(n) && /DECRETO/.test(n)) e.hito = 'notificacion';
      else if (/MANIFOLD/.test(n)) e.hito = 'manifold';
      else if (/OFICIO|GMAIL|MAIL/.test(n)) e.hito = 'comunicacion_empresa';
      else e.hito = null;
    } else if (/PIDE OC|SOLICITA OC|SOLICITUD DE OC/.test(n)) { e.modulo = 'Pago'; e.hito = 'memo_oc'; e.entidad = periodo; }
    else if (/SOLICITA PAGO|PIDE PAGO|SOLICITUD DE PAGO/.test(n)) { e.modulo = 'Pago'; e.hito = 'memo_pago'; e.entidad = periodo; }
    else if (/\bOC\b.*3447-\d+-SE\d\d|ORDEN DE COMPRA/.test(n)) { e.modulo = 'Pago'; e.hito = 'oc_emitida'; e.entidad = periodo; num = (n.match(/3447-\d+-SE\d\d/) || [num])[0]; }
    else if (/FACTURA/.test(n) && !/MEMO/.test(n)) { e.modulo = 'Pago'; e.hito = 'factura'; e.entidad = periodo; num = (n.match(/FACTURA\s*(?:N[°º]?\s*)?([\d\.]+)/) || [0, num])[1]; }
    else if (/GPS/.test(n)) { e.modulo = 'Pago'; e.hito = 'informe_gps'; e.entidad = periodo; }
    else if (/RECEP(?:CION)? CONFORME/.test(n)) { e.modulo = 'Pago'; e.hito = 'recepcion_conforme'; e.entidad = periodo; }
    else if (/COMPROBANTE|DECRETO DE PAGO|EGRESO/.test(n)) { e.modulo = 'Pago'; e.hito = 'pago'; e.entidad = periodo; }
    else if (/ENDOSO|POLIZA|GARANTIA|RESPONSABILIDAD CIVIL/.test(n)) { e.modulo = 'Vencimiento'; e.hito = 'documento'; e.entidad = /RESPONSABILIDAD CIVIL|\bRC\b/.test(n) ? 'SEG-RC' : 'GAR-FC'; num = (n.match(/\b(22\d{7})\b/) || [0, num])[1]; }
    else if (/REVISION TECNICA|PERMISO DE CIRCULACION|SOAP|SEGURO OBLIGATORIO/.test(n)) { e.modulo = 'Vencimiento'; e.hito = /REVISION/.test(n) ? 'revision_tecnica' : /PERMISO/.test(n) ? 'permiso_circulacion' : 'soap'; var mv = n.match(/\bM-?\s?(\d{3})\b/) || n.match(/MOVIL\s*(\d{3})/); e.entidad = mv ? 'M-' + mv[1] : null; }
    else { e.modulo = 'Revisión'; e.entidad = null; e.hito = null; }
    e.numero = num || null;
    e.clave = (e.modulo === 'Sanción' ? 'SAN' : e.modulo === 'Pago' ? 'PAG' : e.modulo === 'Vencimiento' ? 'VEN' : 'DOC') + '|' + (e.entidad || '?') + '|' + (e.hito || '?') + '|' + (num || M.hash(n));
    e.detalle = (num ? 'N° ' + num + ' · ' : '') + (doc.ruta ? 'Ruta: ' + doc.ruta : '');
    return e;
  };

  // ---------- Lectura del libro: si quedaron dos versiones vigentes de una clave, manda la de mayor versión ----------
  M.normalizarLibro = function (evs) {
    var max = {};
    evs.forEach(function (e) { if (e.vigente !== false) max[e.clave] = Math.max(max[e.clave] || 0, e.version || 1); });
    return evs.map(function (e) { var o = Object.assign({}, e); if (o.vigente !== false && (o.version || 1) < max[o.clave]) o.vigente = false; if (!o.huella) o.huella = M.huella(o); return o; });
  };

  // ---------- Derivación: sanciones ----------
  function vig(evs, mod) { return evs.filter(function (e) { return e.modulo === mod && e.vigente !== false; }); }
  function acredita(e) { return e.verificacion === 'Acreditado' || e.verificacion === 'Reportado'; }
  function tieneRespaldo(e) { return !!(e.respaldo || e.documento); }
  function porFecha(a, b) { return (a.fecha || '9999') < (b.fecha || '9999') ? -1 : (a.fecha || '9999') > (b.fecha || '9999') ? 1 : 0; }
  M.derivarSanciones = function (eventos, hoy, meta) {
    var g = {}; meta = meta || {};
    vig(eventos, 'Sanción').forEach(function (e) { (g[e.entidad] = g[e.entidad] || []).push(e); });
    return Object.keys(g).sort().map(function (id) {
      var evs = g[id].slice().sort(function (a, b) { return porFecha(a, b) || (M.H_SAN[a.hito] ? M.H_SAN[a.hito].orden : 0) - (M.H_SAN[b.hito] ? M.H_SAN[b.hito].orden : 0); });
      var val = evs.filter(function (e) { return M.H_SAN[e.hito] && acredita(e) && tieneRespaldo(e); });
      // Último estado acreditado: el hito más reciente por fecha (a igual fecha, el de mayor orden). Un cierre o cobro es terminal.
      var ult = val.slice().sort(function (a, b) { return porFecha(a, b) || M.H_SAN[a.hito].orden - M.H_SAN[b.hito].orden; }).pop() || null;
      var term = val.filter(function (e) { return e.hito === 'cobro_efectivo' || e.hito === 'cierre_sin_multa'; }).sort(porFecha).pop(); if (term) ult = term;
      function ultimo(h) { return val.filter(function (e) { return e.hito === h; }).sort(porFecha).pop() || null; }
      function monto(hs) { var x = null; hs.forEach(function (h) { var e = val.filter(function (z) { return z.hito === h && z.monto != null; }).sort(porFecha).pop(); if (e) x = e; }); return x ? { valor: x.monto, unidad: x.unidadMonto, clave: x.clave, documento: x.documento, respaldo: x.respaldo } : null; }
      var s = { id: id, meta: meta[id] || {}, eventos: evs, ultimo: ult, pendientesDeRespaldo: evs.filter(function (e) { return !acredita(e) || !tieneRespaldo(e); }) };
      s.estado = ult ? M.H_SAN[ult.hito].nombre : 'Sin hito acreditado';
      s.cerrada = !!ult && (ult.hito === 'cierre_sin_multa' || ult.hito === 'cobro_efectivo');
      s.siguiente = ult ? M.H_SAN[ult.hito].siguiente : 'Acreditar el hallazgo (folio de manifold)';
      s.unidad = ult ? unidadSiguiente(ult.hito) : 'ITS (Hernán Gómez)';
      s.montos = { propuesto: monto(['informe_tecnico', 'memo_secmun']), decretado: monto(['decreto_multa', 'decreto_final', 'rectificacion_decreto']), cobrado: monto(['cobro_efectivo']), derivado: monto(['derivacion_cobro']) };
      var notif = ultimo('notificacion') || ultimo('publicacion_mp'); s.notificacion = notif ? { fecha: notif.fecha, fechaTipo: notif.fechaTipo, documento: notif.documento, respaldo: notif.respaldo } : null;
      s.plazo = plazoSancion(s, ult, ultimo, hoy);
      return s;
    });
  };
  function unidadSiguiente(h) {
    var o = M.H_SAN[h].orden, nx = M.HITOS_SAN[o + 1];
    if (h === 'cierre_sin_multa' || h === 'cobro_efectivo') return '—';
    if (h === 'respuesta_empresa') return 'ITS (Hernán Gómez) / Unidad Técnica';
    if (h === 'informe_evaluacion') return 'Unidad Técnica (Edgar Ortega)';
    if (h === 'notificacion') return 'Empresa (plazo de reposición) → Unidad Técnica';
    if (h === 'decreto_final' || h === 'rectificacion_decreto' || h === 'comunicacion_final' || h === 'sin_reposicion') return 'Unidad Técnica (Edgar Ortega) → DAF';
    if (h === 'derivacion_cobro') return 'DAF';
    return nx ? nx.unidad : '—';
  }
  function plazoSancion(s, ult, ultimo, hoy) {
    function p(regla, base, n, quien) {
      if (!base || !base.fecha) return { estado: 'por verificar', regla: regla, falta: 'Falta la fecha de ' + (base ? M.H_SAN[base.hito].nombre.toLowerCase() : 'inicio del cómputo') };
      if (base.fechaTipo !== 'Acto acreditado') return { estado: 'por verificar', regla: regla, falta: 'La fecha disponible (' + base.fecha + ') es ' + (base.fechaTipo || 'no acreditada').toLowerCase() + ': falta la constancia de ' + M.H_SAN[base.hito].nombre.toLowerCase() + ' con fecha cierta', referencia: base.fecha };
      var ini = M.sumarDias(base.fecha, 1); // BA 180 y 182: se entiende practicada 24 horas después
      var vence = M.sumarHabiles(ini, n), dias = M.diasHabilesEntre(hoy, vence);
      return { estado: dias < 0 ? 'vencido' : 'en plazo', regla: regla, inicio: ini, vence: vence, diasHabiles: dias, quien: quien, base: base.clave };
    }
    if (!ult) return { estado: 'por verificar', regla: '—', falta: 'No hay hito acreditado con respaldo' };
    if (s.cerrada) return { estado: 'no aplica', regla: 'Proceso cerrado' };
    switch (ult.hito) {
      case 'manifold': return { estado: 'por verificar', regla: 'BA 176–177', falta: 'Falta la constancia de comunicación del manifold a Cosemar (inicio de los 5 días hábiles de descargos)' };
      case 'comunicacion_empresa': return p('BA 177 · 5 días hábiles para descargos', ult, 5, 'Empresa');
      case 'respuesta_empresa': return p('BA 179 · 20 días hábiles para resolver los descargos', ult, 20, 'Unidad Técnica');
      case 'informe_evaluacion': case 'informe_tecnico': case 'revision_edgar': case 'memo_secmun': case 'visado_alcaldia': case 'remision_secmun': case 'borrador_decreto': case 'revision_control':
        return p('BA 179 · 20 días hábiles desde la recepción de los descargos', ultimo('respuesta_empresa') || { hito: 'respuesta_empresa' }, 20, 'Unidad Técnica / Secretaría Municipal');
      case 'decreto_multa': return { estado: 'por verificar', regla: 'BA 184', falta: 'Falta la constancia de publicación en la ficha de contrato de Mercado Público o de notificación del decreto (inicio de los 5 días hábiles de reposición)' };
      case 'publicacion_mp': case 'notificacion': return p('BA 184 · 5 días hábiles para reposición', ult, 5, 'Empresa');
      case 'reposicion_recibida': case 'analisis_reposicion': case 'memo_reposicion': case 'visado_juridico': case 'visado_alcaldia_rep':
        return p('BA 186 · 20 días hábiles para resolver la reposición', ultimo('reposicion_recibida') || { hito: 'reposicion_recibida' }, 20, 'Unidad Técnica / Secretaría Municipal');
      case 'decreto_final': case 'rectificacion_decreto': case 'comunicacion_final': case 'sin_reposicion':
        return { estado: 'por verificar', regla: 'BA 187–188 · descuento en el estado de pago más próximo', falta: 'Falta la instrucción de descuento (derivación a cobro) con el estado de pago al que se imputa' };
      case 'derivacion_cobro': return { estado: 'por verificar', regla: 'BA 188 a)', falta: 'Falta el comprobante del estado de pago que acredite el descuento efectivo' };
    }
    return { estado: 'por verificar', regla: '—', falta: 'Regla no configurada para este hito' };
  }

  // ---------- Derivación: pagos ----------
  M.precioVigente = function (precios, periodo) { // precios: [{desde:'YYYY-MM', neto, bruto, acto, ejecutado}]
    var r = null; precios.forEach(function (p) { if (p.desde <= periodo) r = p; }); return r;
  };
  M.derivarPagos = function (eventos, catalogo, hoy) {
    var g = {};
    vig(eventos, 'Pago').forEach(function (e) { (g[e.entidad] = g[e.entidad] || []).push(e); });
    return Object.keys(g).sort().map(function (per) {
      var evs = g[per].slice().sort(porFecha), val = evs.filter(function (e) { return acredita(e) && tieneRespaldo(e); });
      function h(id) { return val.filter(function (e) { return e.hito === id; }); }
      function uno(id) { return h(id).sort(porFecha).pop() || null; }
      function sumUnico(id) { var seen = {}, t = null; h(id).forEach(function (e) { if (e.monto == null || e.unidadMonto !== 'CLP') return; var k = e.numero || e.clave; if (seen[k]) return; seen[k] = 1; t = (t || 0) + e.monto; }); return t; }
      var ajuste = /^AJUSTE-/.test(per), precio = ajuste ? null : M.precioVigente(catalogo.precios, per), enEjec = ajuste ? null : M.precioVigente(catalogo.precios.filter(function (p) { return p.ejecutado; }), per);
      var p = { periodo: per, ajuste: ajuste, eventos: evs, hitos: {} };
      M.HITOS_PAGO.forEach(function (x) { p.hitos[x.id] = uno(x.id); });
      var ult = null; M.HITOS_PAGO.forEach(function (x) { if (p.hitos[x.id]) ult = x; });
      p.ultimo = ult ? { hito: ult, evento: p.hitos[ult.id] } : null;
      p.siguiente = ult ? (M.HITOS_PAGO[ult.orden + 1] || { nombre: 'Sin acción: pago acreditado', unidad: '—' }) : M.HITOS_PAGO[0];
      p.esperado = precio ? { valor: precio.bruto, acto: precio.acto, respaldo: precio.respaldo, nota: precio.nota || null } : (ajuste ? null : { valor: null, estado: 'sin antecedentes' });
      p.enEjecucion = enEjec ? enEjec.bruto : null;
      p.facturado = sumUnico('factura'); p.remitido = sumUnico('memo_pago'); p.pagado = sumUnico('pago'); p.solicitadoOC = sumUnico('memo_oc');
      p.descuentos = val.filter(function (e) { return e.hito === 'descuento_multa'; });
      p.diferencias = [];
      var ref = p.remitido != null ? p.remitido : p.facturado != null ? p.facturado : p.solicitadoOC;
      if (p.esperado && p.esperado.valor != null && ref != null && ref !== p.esperado.valor) p.diferencias.push({ tipo: 'monto', texto: 'Tramitado $' + M.fmt(ref) + ' ≠ esperado $' + M.fmt(p.esperado.valor) + ' (' + p.esperado.acto + ')', monto: p.esperado.valor - ref });
      var oc = p.hitos.oc_emitida, fa = p.hitos.factura;
      if (oc && fa && oc.fecha && fa.fecha && fa.fecha < oc.fecha) p.diferencias.push({ tipo: 'orden', texto: 'Factura (' + fa.fecha + ') anterior a la OC (' + oc.fecha + ')' });
      if (h('oc_emitida').length > 1) p.diferencias.push({ tipo: 'duplicado', texto: h('oc_emitida').length + ' OC registradas para el período: se contabiliza una sola; verificar cuál quedó vigente' });
      evs.filter(function (e) { return e.hito === 'diferencia'; }).forEach(function (e) { p.diferencias.push({ tipo: 'documental', texto: e.detalle || e.documento, clave: e.clave, respaldo: e.respaldo }); });
      p.estado = p.hitos.pago ? 'Pagado' : p.hitos.memo_pago ? 'Remitido a pago' : p.hitos.factura ? 'Facturado' : p.hitos.oc_aceptada ? 'OC aceptada' : p.hitos.oc_emitida ? 'OC emitida' : p.hitos.memo_oc ? 'OC solicitada' : 'Sin hito acreditado';
      // Montos: null = sin antecedentes (el hito existe pero el documento cargado no trae monto)
      p.pendiente = p.hitos.pago ? 0 : (p.hitos.memo_pago ? p.remitido : null);
      return p;
    });
  };

  // ---------- Derivación: vencimientos ----------
  M.derivarVencimientos = function (eventos, hoy, umbral) {
    umbral = umbral || 30;
    return vig(eventos, 'Vencimiento').map(function (e) {
      var o = { clave: e.clave, entidad: e.entidad, tipo: e.hito, documento: e.documento, vence: e.fecha, respaldo: e.respaldo, verificacion: e.verificacion, detalle: e.detalle, patente: e.patente || null, monto: e.monto, unidadMonto: e.unidadMonto, origen: e.origen };
      if (!e.fecha) { o.estado = 'sin antecedentes'; o.dias = null; }
      else { o.dias = M.diasCorridos(hoy, e.fecha); o.estado = o.dias < 0 ? 'vencido' : o.dias <= umbral ? 'por vencer' : 'vigente'; }
      return o;
    }).sort(function (a, b) { return (a.dias == null ? 99999 : a.dias) - (b.dias == null ? 99999 : b.dias); });
  };

  // ---------- Avisos: una sola vez por evento (clave determinista) ----------
  M.avisos = function (eventos, catalogo, hoy) {
    var out = [], ya = {};
    vig(eventos, 'Aviso').forEach(function (e) { ya[e.clave] = 1; });
    function add(k, tipo, texto, ref) { k = 'AVI|' + k; if (!ya[k]) { ya[k] = 1; out.push({ clave: k, modulo: 'Aviso', entidad: ref, hito: tipo, fecha: hoy, fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', documento: texto, detalle: texto, origen: 'n8n · avisos', vigente: true, version: 1 }); } }
    M.derivarVencimientos(eventos, hoy).forEach(function (v) {
      if (v.estado === 'vencido') add('VENCIDO|' + v.clave + '|' + v.vence, 'vencido', 'VENCIDO: ' + v.documento + ' (' + v.entidad + ') venció el ' + v.vence, v.entidad);
      else if (v.estado === 'por vencer') add('PORVENCER|' + v.clave + '|' + v.vence + '|' + (v.dias <= 7 ? '7' : '30'), 'por_vencer', 'Vence en ' + v.dias + ' días: ' + v.documento + ' (' + v.entidad + ') el ' + v.vence, v.entidad);
    });
    M.derivarSanciones(eventos, hoy).forEach(function (s) {
      if (s.plazo.estado === 'vencido') add('PLAZO|' + s.id + '|' + s.plazo.base + '|' + s.plazo.vence, 'plazo_vencido', s.id + ': plazo vencido el ' + s.plazo.vence + ' (' + s.plazo.regla + ')', s.id);
      else if (s.plazo.estado === 'en plazo' && s.plazo.diasHabiles <= 2) add('PLAZO2|' + s.id + '|' + s.plazo.base + '|' + s.plazo.vence, 'plazo_proximo', s.id + ': quedan ' + s.plazo.diasHabiles + ' días hábiles (' + s.plazo.regla + ')', s.id);
    });
    eventos.filter(function (e) { return e.vigente !== false && e.modulo === 'Hallazgo'; }).forEach(function (e) { add('HALLAZGO|' + e.clave, 'hallazgo_nuevo', 'Hallazgo nuevo: ' + (e.documento || e.detalle) + ' (' + e.entidad + ')', e.entidad); });
    eventos.filter(function (e) { return e.vigente !== false && e.rectificaA; }).forEach(function (e) { add('CAMBIO|' + e.clave + '|v' + e.version, 'cambio_relevante', 'Rectificación en ' + e.entidad + ' · ' + e.hito + ' (versión ' + e.version + ')', e.entidad); });
    return out;
  };

  // ---------- Portada ----------
  M.fmt = function (n) { return n == null ? '—' : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  M.portada = function (eventos, catalogo, hoy) {
    var san = M.derivarSanciones(eventos, hoy, catalogo.sanciones), pag = M.derivarPagos(eventos, catalogo, hoy), ven = M.derivarVencimientos(eventos, hoy);
    var abiertas = san.filter(function (s) { return !s.cerrada; });
    var pendPago = pag.filter(function (p) { return !p.hitos.pago && p.hitos.memo_pago; });
    var difAjuste = pag.reduce(function (t, p) { return t + p.diferencias.filter(function (x) { return x.tipo === 'monto' && x.monto > 0; }).reduce(function (a, x) { return a + x.monto; }, 0); }, 0);
    return {
      vence: ven.filter(function (v) { return v.estado === 'por vencer'; }), atrasado: ven.filter(function (v) { return v.estado === 'vencido'; })
        .concat(san.filter(function (s) { return s.plazo.estado === 'vencido'; }).map(function (s) { return { entidad: s.id, documento: s.plazo.regla, vence: s.plazo.vence, estado: 'vencido', sancion: true }; })),
      decision: abiertas, montoPendiente: { remitidoSinPago: pendPago.reduce(function (t, p) { return t + (p.pendiente || 0); }, 0), periodos: pendPago.map(function (p) { return p.periodo; }), sinMonto: pendPago.filter(function (p) { return p.pendiente == null; }).map(function (p) { return p.periodo; }), diferenciaPorAjustar: difAjuste, periodosDiferencia: pag.filter(function (p) { return p.diferencias.some(function (x) { return x.tipo === 'monto'; }); }).map(function (p) { return p.periodo; }) },
      revision: vig(eventos, 'Revisión').length, errores: vig(eventos, 'Error').filter(function (e) { return e.verificacion !== 'Acreditado'; }).length,
      sanciones: san, pagos: pag, vencimientos: ven
    };
  };

  // ---------- Cobertura de la matriz de obligaciones ----------
  M.cobertura = function (catalogo, eventos) {
    var conDato = {};
    var HO = { manifold: 'OB-35', comunicacion_empresa: 'OB-35', respuesta_empresa: 'OB-36', informe_evaluacion: 'OB-37', cierre_sin_multa: 'OB-37', decreto_multa: 'OB-37', publicacion_mp: 'OB-37', notificacion: 'OB-37',
      reposicion_recibida: 'OB-38', sin_reposicion: 'OB-38', analisis_reposicion: 'OB-39', memo_reposicion: 'OB-39', decreto_final: 'OB-39', rectificacion_decreto: 'OB-39', derivacion_cobro: 'OB-40', cobro_efectivo: 'OB-40',
      oc_aceptada: 'OB-02', revision_sanciones: 'OB-11', descuento_multa: 'OB-11' };
    eventos.forEach(function (e) {
      if (e.vigente === false) return;
      var os = e.obligacion ? String(e.obligacion).split(',').map(function (o) { return o.trim(); }) : [];
      if (HO[e.hito] && (e.modulo === 'Sanción' || e.modulo === 'Pago') && e.verificacion !== 'Por verificar' && os.indexOf(HO[e.hito]) < 0) os.push(HO[e.hito]);
      os.forEach(function (o) { conDato[o] = (conDato[o] || 0) + 1; });
    });
    return catalogo.obligaciones.map(function (o) {
      var n = conDato[o.id] || 0;
      return { id: o.id, registros: n, estado: o.cobertura === 'pendiente_configurar' ? 'Pendiente de configurar' : n > 0 ? 'Fiscalizable desde el tablero' : 'Pendiente de respaldo' };
    });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = M; else root.Motor = M;
})(typeof window !== 'undefined' ? window : this);
