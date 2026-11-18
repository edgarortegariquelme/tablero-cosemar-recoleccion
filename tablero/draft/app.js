/* Tablero Cosemar Recolección · análisis visual. Cálculos idénticos a los del tablero (mismos ids y funciones). */
(function () {
  var M = window.Motor;
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { var v = attrs[k]; if (v == null || v === false) return; if (k === 'text') e.textContent = v; else if (k === 'cls') e.className = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); });
    (kids || []).forEach(function (k) { if (k == null) return; e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return e;
  }
  function clp(v) { return v == null ? null : '$' + M.fmt(v); }
  function fechaCL(s) { if (!s) return null; var p = s.slice(0, 10).split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function filas(id) { var d = dash.data(id); return d.status === 'ok' && Array.isArray(d.data) ? d.data : []; }
  function listo(el, ids) {
    for (var i = 0; i < ids.length; i++) { var st = dash.data(ids[i]).status; if (st !== 'ok') { el.classList.toggle('dash-skeleton', st === 'loading'); if (st !== 'loading') el.replaceChildren(h('span', { cls: 'va-muted', text: st === 'error' ? 'No se pudo cargar' : '—' })); return false; } }
    el.classList.remove('dash-skeleton'); return true;
  }
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function mesTxt(p) { var x = p.split('-'); return MES[+x[1] - 1] + ' ' + x[0].slice(2); }
  function tip(box) { return box.append('div').attr('class', 'va-tip').attr('hidden', ''); }
  function showTip(t, el, ev, txt) { var r = el.getBoundingClientRect(); t.attr('hidden', null).text(txt).style('left', Math.max(0, Math.min(ev.clientX - r.left + 10, r.width - 240)) + 'px').style('top', (ev.clientY - r.top + 12) + 'px'); }
  // ---------- loaders: Notion devuelve filas con escapes de Markdown ----------
  ['libro_san', 'libro_pag', 'libro_ven', 'libro_sis'].forEach(function (id) {
    dash.loader(id, {
      description: 'Quita los escapes de Markdown que agrega Notion y nombra las columnas como las usa el motor. No cambia valores.',
      fn: function (x) {
        var a = x.answer; if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { throw new Error(a.slice(0, 300)); } }
        if (a && a.error) throw new Error(a.error.message || String(a.error));
        var u = function (s) { return typeof s === 'string' ? s.replace(/\\([\\`*_{}\[\]()#+\-.!|$~<>])/g, '$1') : s; };
        var rows = ((a && a.results) || []).map(function (r) {
          var o = { clave: u(r['Clave']), modulo: u(r['Módulo']), entidad: u(r['Entidad']) || null, hito: u(r['Hito']) || null, fecha: r['date:Fecha:start'] ? String(r['date:Fecha:start']).slice(0, 10) : null,
            fechaTipo: u(r['Tipo de fecha']) || null, monto: r['Monto'] == null || r['Monto'] === '' ? null : Number(r['Monto']), unidadMonto: u(r['Unidad']) || null, verificacion: u(r['Verificación']) || null,
            documento: u(r['Documento']) || null, respaldo: r['Respaldo'] || null, obligacion: u(r['Obligación']) || null, detalle: u(r['Detalle']) || '', origen: u(r['Origen']) || null, numero: u(r['N°']) || null,
            patente: u(r['Patente']) || null, sector: u(r['Sector']) || null, vigente: r['Vigente'] === '__YES__' || r['Vigente'] === true, version: Number(r['Versión']) || 1, rectificaA: u(r['Rectifica a']) || null,
            registrado: r['Registrado'] || null, url: r.url || null };
          if (o.monto != null && !isFinite(o.monto)) o.monto = null;
          return o;
        });
        return { rows: rows, columns: ['clave', 'modulo', 'entidad', 'hito', 'fecha', 'fechaTipo', 'monto', 'unidadMonto', 'verificacion', 'documento', 'respaldo', 'obligacion', 'detalle', 'origen', 'numero', 'patente', 'sector', 'vigente', 'version', 'rectificaA', 'registrado', 'url'], truncated: !!(a && a.has_more) };
      }
    });
  });

  // ---------- cálculos (visibles en Fuentes) ----------
  dash.calc('c_eventos', {
    inputs: ['libro_san', 'libro_pag', 'libro_ven', 'libro_sis'], title: 'Libro de control unificado',
    description: 'Une los cuatro tramos del libro y, si una clave tiene dos versiones vigentes, deja vigente solo la de mayor versión.',
    fn: function (sanciones, pagos, vencimientos, sistema) { return window.Motor.normalizarLibro([].concat(sanciones, pagos, vencimientos, sistema)); }
  });
  function hoyCL() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()); }
  dash.calc('c_sanciones', {
    inputs: ['c_eventos', 'catalogo'], title: 'Estado de cada proceso sancionatorio',
    description: 'Último hito acreditado con respaldo, plazo según las bases (BA 177, 179, 184, 186) en días hábiles, siguiente acción y montos propuesto, decretado y cobrado.',
    fn: function (eventos, catalogo) {
      var hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
      return window.Motor.derivarSanciones(eventos, hoy, catalogo.sanciones).map(function (s) {
        var m = s.meta || {};
        return { id: s.id, titulo: m.titulo || s.id, obligacion: m.obligacion || null, sector: m.sector || null, patente: m.patente || null, estado: s.estado, cerrada: s.cerrada,
          ultimaFecha: s.ultimo ? s.ultimo.fecha : null, ultimoDocumento: s.ultimo ? s.ultimo.documento : null, ultimoRespaldo: s.ultimo ? s.ultimo.respaldo : null, ultimaFechaTipo: s.ultimo ? s.ultimo.fechaTipo : null,
          notificacion: s.notificacion ? s.notificacion.fecha : null, notificacionTipo: s.notificacion ? s.notificacion.fechaTipo : null,
          plazoEstado: s.plazo.estado, plazoRegla: s.plazo.regla, vence: s.plazo.vence || null, diasHabiles: s.plazo.diasHabiles == null ? null : s.plazo.diasHabiles, falta: s.plazo.falta || null,
          siguiente: s.siguiente, unidad: s.unidad,
          propuesto: s.montos.propuesto ? s.montos.propuesto.valor : null, propuestoUnidad: s.montos.propuesto ? s.montos.propuesto.unidad : null,
          decretado: s.montos.decretado ? s.montos.decretado.valor : null, decretadoUnidad: s.montos.decretado ? s.montos.decretado.unidad : null,
          derivado: s.montos.derivado ? s.montos.derivado.valor : null, cobrado: s.montos.cobrado ? s.montos.cobrado.valor : null, cobradoUnidad: s.montos.cobrado ? s.montos.cobrado.unidad : null,
          cobradoRespaldo: s.montos.cobrado ? s.montos.cobrado.respaldo : null, hitos: s.eventos.length, sinRespaldo: s.pendientesDeRespaldo.length };
      }).sort(function (a, b) { var r = function (x) { return x.cerrada ? 3 : x.plazoEstado === 'vencido' ? 0 : x.plazoEstado === 'en plazo' ? 1 : 2; }; return (r(a) - r(b)) || ((a.vence || '9') < (b.vence || '9') ? -1 : (a.vence || '9') > (b.vence || '9') ? 1 : 0); });
    }
  });
  dash.calc('c_pagos', {
    inputs: ['c_eventos', 'catalogo'], title: 'Pago por mes de servicio',
    description: 'Monto esperado según el decreto vigente en el mes, y montos solicitado en OC, facturado, remitido a pago y pagado, cada documento contado una sola vez por su número.',
    fn: function (eventos, catalogo) {
      var hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
      return window.Motor.derivarPagos(eventos, catalogo, hoy).map(function (p) {
        return { periodo: p.periodo, ajuste: p.ajuste, estado: p.estado, esperado: p.esperado ? p.esperado.valor : null, actoEsperado: p.esperado ? p.esperado.acto || null : null, enEjecucion: p.enEjecucion,
          solicitadoOC: p.solicitadoOC, facturado: p.facturado, remitido: p.remitido, pagado: p.pagado, pendiente: p.pendiente,
          diferencia: p.diferencias.filter(function (d) { return d.tipo === 'monto'; }).reduce(function (t, d) { return t + d.monto; }, 0) || null,
          observaciones: p.diferencias.map(function (d) { return d.texto; }).join(' · ') || null,
          ultimoHito: p.ultimo ? p.ultimo.hito.nombre : null, ultimoFecha: p.ultimo ? p.ultimo.evento.fecha : null, ultimoRespaldo: p.ultimo ? p.ultimo.evento.respaldo : null,
          siguiente: p.siguiente ? p.siguiente.nombre : null, siguienteUnidad: p.siguiente ? p.siguiente.unidad : null };
      });
    }
  });
  dash.calc('c_vencimientos', {
    inputs: ['c_eventos'], title: 'Vencimientos de garantías, seguros y flota',
    description: 'Días corridos hasta el vencimiento de cada documento vigente; «por vencer» dentro de 30 días.',
    fn: function (eventos) {
      var hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
      return window.Motor.derivarVencimientos(eventos, hoy, 30).map(function (v) {
        return { clave: v.clave, entidad: v.entidad, grupo: /^M-/.test(v.entidad) ? 'Flota' : v.entidad === 'GAR-FC' ? 'Garantía' : v.entidad === 'SEG-RC' ? 'Seguro' : 'Otro', tipo: v.tipo, documento: v.documento, patente: v.patente, vence: v.vence, dias: v.dias, estado: v.estado,
          capital: v.monto, unidad: v.unidadMonto, verificacion: v.verificacion, respaldo: v.respaldo, detalle: v.detalle, origen: v.origen };
      });
    }
  });
  dash.calc('c_portada', {
    inputs: ['c_eventos', 'c_sanciones', 'c_pagos', 'c_vencimientos'], title: 'Indicadores de la portada',
    description: 'Cuenta lo que vence en 30 días, lo atrasado, las sanciones abiertas y suma lo remitido a pago sin pago acreditado.',
    fn: function (eventos, sanciones, pagos, vencimientos) {
      var sis = eventos.filter(function (e) { return e.modulo === 'Sistema' && e.vigente; })[0] || {};
      var abiertas = sanciones.filter(function (s) { return !s.cerrada; });
      var rem = pagos.filter(function (p) { return p.estado === 'Remitido a pago'; });
      return [{ vencen30: vencimientos.filter(function (v) { return v.estado === 'por vencer'; }).length,
        atrasados: vencimientos.filter(function (v) { return v.estado === 'vencido'; }).length + sanciones.filter(function (s) { return s.plazoEstado === 'vencido'; }).length,
        decision: abiertas.length, plazoPorVerificar: abiertas.filter(function (s) { return s.plazoEstado === 'por verificar'; }).length,
        remitidoSinPago: rem.reduce(function (t, p) { return t + (p.remitido || 0); }, 0), mesesRemitidos: rem.length, mesesSinMonto: rem.filter(function (p) { return p.remitido == null; }).length,
        diferenciaDecreto: pagos.reduce(function (t, p) { return t + (p.diferencia > 0 ? p.diferencia : 0); }, 0),
        revision: eventos.filter(function (e) { return e.vigente && e.modulo === 'Revisión'; }).length, errores: eventos.filter(function (e) { return e.vigente && e.modulo === 'Error'; }).length,
        ultimaSync: sis.fecha || null, ultimaSyncDetalle: sis.detalle || null, registros: eventos.length }];
    }
  });
  dash.calc('c_obligaciones', {
    inputs: ['catalogo', 'c_eventos'], title: 'Matriz de obligaciones y cobertura',
    description: 'Cada obligación de las bases con su cláusula, página y exigencia vigente hoy; cuenta los registros del libro que la respaldan.',
    fn: function (catalogo, eventos) {
      var hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
      var cob = {}; window.Motor.cobertura(catalogo, eventos).forEach(function (c) { cob[c.id] = c; });
      return catalogo.obligaciones.map(function (o) {
        var v = (o.vigencias || []).filter(function (x) { return x.desde <= hoy && (!x.hasta || x.hasta >= hoy); }).pop() || (o.vigencias || [])[0] || {};
        return { id: o.id, titulo: o.titulo, clausula: o.clausula, pagina: o.pagina, modulo: o.modulo, frecuencia: o.frecuencia, plazo: o.plazo, evidencia: o.evidencia, criterio: o.criterio, accion: o.accion,
          exigenciaVigente: v.exigencia || null, actoVigente: v.acto || null, registros: cob[o.id].registros, cobertura: cob[o.id].estado, nota: o.nota || null };
      });
    }
  });
  dash.calc('c_pendientes', {
    inputs: ['c_sanciones', 'c_pagos', 'c_vencimientos', 'c_eventos'], title: 'Pendientes y diferencias',
    description: 'Lista exportable de lo que requiere acción: plazos, antecedentes faltantes, diferencias de monto, vencimientos, revisión y errores, cada uno con su enlace.',
    fn: function (sanciones, pagos, vencimientos, eventos) {
      var out = [];
      sanciones.filter(function (s) { return !s.cerrada; }).forEach(function (s) { out.push({ clave: 'SAN-' + s.id, tipo: 'Sanción', entidad: s.id, descripcion: s.titulo + ' · ' + s.estado + ' · siguiente: ' + s.siguiente, plazo: s.vence, estado: s.plazoEstado, falta: s.falta, unidad: s.unidad, enlace: s.ultimoRespaldo }); });
      pagos.filter(function (p) { return p.observaciones || (p.estado !== 'Pagado'); }).forEach(function (p) { out.push({ clave: 'PAG-' + p.periodo, tipo: 'Pago', entidad: p.periodo, descripcion: p.estado + (p.observaciones ? ' · ' + p.observaciones : '') + ' · siguiente: ' + p.siguiente, plazo: null, estado: p.observaciones ? 'diferencia' : 'en curso', falta: p.diferencia ? 'Diferencia $' + window.Motor.fmt(p.diferencia) + ' frente a ' + p.actoEsperado : null, unidad: p.siguienteUnidad, enlace: p.ultimoRespaldo }); });
      vencimientos.filter(function (v) { return v.estado === 'vencido' || v.estado === 'por vencer'; }).forEach(function (v) { out.push({ clave: 'VEN-' + v.clave, tipo: 'Vencimiento', entidad: v.entidad, descripcion: v.documento + (v.patente ? ' · ' + v.patente : ''), plazo: v.vence, estado: v.estado, falta: 'Renovación respaldada', unidad: 'ITS (Hernán Gómez)', enlace: v.respaldo }); });
      eventos.filter(function (e) { return e.vigente && (e.modulo === 'Revisión' || e.modulo === 'Error' || (e.verificacion === 'Por verificar' && e.modulo !== 'Aviso')); }).forEach(function (e) { out.push({ clave: 'REG-' + e.clave, tipo: e.modulo === 'Error' ? 'Error' : e.modulo === 'Revisión' ? 'Revisión' : 'Antecedente por verificar', entidad: e.entidad, descripcion: e.documento, plazo: e.fecha, estado: e.verificacion, falta: e.detalle, unidad: 'Unidad Técnica (Edgar Ortega)', enlace: e.respaldo || e.url }); });
      return out;
    }
  });


  // ---------- titular y frase de apertura ----------
  dash.draw('va_titular', function (el) {
    if (!listo(el, ['c_portada', 'c_pagos'])) return; var r = filas('c_portada')[0];
    var meses = filas('c_pagos').filter(function (p) { return p.diferencia > 0; }).length;
    var sinPago = r.mesesRemitidos ? (r.mesesRemitidos === 1 ? 'el mes remitido a pago no tiene' : 'ninguno de los ' + r.mesesRemitidos + ' meses remitidos a pago tiene') + ' pago acreditado' : 'no hay meses remitidos a pago pendientes';
    el.textContent = r.diferenciaDecreto > 0 ? 'En ' + meses + (meses === 1 ? ' mes se tramitaron $' : ' meses se tramitaron $') + M.fmt(r.diferenciaDecreto) + ' menos de lo que fija el decreto vigente, y ' + sinPago
      : 'Lo tramitado coincide con el valor decretado, y ' + sinPago;
  });
  dash.draw('va_dif', function (el) { if (!listo(el, ['c_portada'])) return; el.textContent = clp(filas('c_portada')[0].diferenciaDecreto); });
  dash.draw('va_rem', function (el) { if (!listo(el, ['c_portada'])) return; el.textContent = clp(filas('c_portada')[0].remitidoSinPago); });
  dash.draw('va_meses', function (el) { if (!listo(el, ['c_portada'])) return; el.textContent = String(filas('c_portada')[0].mesesRemitidos); });
  dash.draw('va_sinmonto', function (el) { if (!listo(el, ['c_portada'])) return; el.textContent = String(filas('c_portada')[0].mesesSinMonto); });
  dash.draw('va_abiertas', function (el) { if (!listo(el, ['c_portada'])) return; el.textContent = String(filas('c_portada')[0].decision); });
  dash.draw('va_porver', function (el) { if (!listo(el, ['c_portada'])) return; el.textContent = String(filas('c_portada')[0].plazoPorVerificar); });
  dash.draw('va_vence', function (el) { if (!listo(el, ['c_portada'])) return; el.textContent = String(filas('c_portada')[0].vencen30); });
  dash.draw('va_atraso', function (el) { if (!listo(el, ['c_portada'])) return; el.textContent = String(filas('c_portada')[0].atrasados); });
  dash.draw('va_sync', function (el) { if (!listo(el, ['c_portada'])) return; var v = filas('c_portada')[0].ultimaSync; el.textContent = v ? fechaCL(v) : 'sin registro'; });
  dash.draw('va_hoy', function (el) { el.textContent = fechaCL(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())); });

  // ---------- alzas y deuda con Cosemar (pagos_contrato + alzas) ----------
  dash.calc('c_deuda_mes', {
    inputs: ['pagos_contrato', 'alzas'], title: 'Debido y tramitado por mes de servicio',
    description: 'Para cada mes toma el valor bruto del último acto que rige (contrato y decretos; y aparte, contrato, decretos y bases sin decreto), lo compara con lo tramitado más el retroactivo asignado a ese mes y acumula lo que falta, descontando el retroactivo en el mes en que se remitió a pago.',
    fn: function (pagos, alzas) {
      function rige(p, capas) {
        var a = alzas.filter(function (x) { return capas.indexOf(x.capa) >= 0 && x.rigeDesde && x.rigeDesde <= p && x.bruto != null; })
          .sort(function (x, y) { return x.rigeDesde < y.rigeDesde ? -1 : x.rigeDesde > y.rigeDesde ? 1 : 0; });
        return a[a.length - 1] || null;
      }
      var ps = pagos.slice().sort(function (x, y) { return x.periodo < y.periodo ? -1 : 1; });
      var retroPagos = {}; ps.forEach(function (p) { if (p.ajusteRetro && p.ajusteRetroPagadoEn) retroPagos[p.ajusteRetroPagadoEn] = (retroPagos[p.ajusteRetroPagadoEn] || 0) + Number(p.ajusteRetro); });
      var accD = 0, accB = 0;
      return ps.map(function (p) {
        var d = rige(p.periodo, ['Contrato', 'Decreto']), b = rige(p.periodo, ['Contrato', 'Decreto', 'Bases sin decreto']);
        var tram = Number(p.tramitado) || 0, retro = Number(p.ajusteRetro) || 0, multa = Number(p.multa) || 0;
        var dD = d ? d.bruto : null, dB = b ? b.bruto : null;
        accD += (dD || 0) - tram; accD -= retroPagos[p.periodo] || 0; accB += (dB || 0) - (dD || 0);
        return { periodo: p.periodo, anio: p.anio, estado: p.estado, debidoDecreto: dD, actoDecreto: d ? d.acto : null, debidoBases: dB, actoBases: b ? b.acto : null,
          tramitado: tram, ajusteRetro: retro, multa: multa, pagoNeto: tram - multa,
          deltaDecreto: (dD || 0) - tram - retro, deltaBases: (dB || 0) - (dD || 0),
          deudaVivaDecreto: accD, deudaVivaBases: accB, memo: p.memo, factura: p.factura, oc: p.oc, respaldo: p.respaldo, nota: p.nota };
      });
    }
  });
  dash.calc('c_deuda_anual', {
    inputs: ['c_deuda_mes'], title: 'Resumen de deuda por año',
    description: 'Suma por año de servicio lo debido según decretos, lo tramitado con el retroactivo asignado, las multas descontadas y lo adeudado por decretos y adicional según bases; agrega una fila Total.',
    fn: function (meses) {
      var by = {}, orden = [];
      function fila(k) { return { clave: k, meses: 0, debidoDecreto: 0, tramitado: 0, multa: 0, deudaDecreto: 0, deudaBases: 0, deudaTotal: 0 }; }
      var tot = fila('Total');
      meses.forEach(function (m) {
        var k = String(m.anio); if (!by[k]) { by[k] = fila(k); orden.push(k); }
        [by[k], tot].forEach(function (r) { r.meses++; r.debidoDecreto += m.debidoDecreto || 0; r.tramitado += m.tramitado + m.ajusteRetro; r.multa += m.multa; r.deudaDecreto += m.deltaDecreto; r.deudaBases += m.deltaBases; r.deudaTotal += m.deltaDecreto + m.deltaBases; });
      });
      return orden.map(function (k) { return by[k]; }).concat([tot]);
    }
  });
  dash.calc('c_proyeccion', {
    inputs: ['c_deuda_mes'], title: 'Proyección de la deuda a junio de 2027',
    description: 'Si nada se regulariza, repite cada mes desde el último registrado hasta junio de 2027 (cierre del segundo año del contrato) la diferencia mensual vigente por decretos y según bases, y acumula sobre la deuda actual. No incluye el reajuste IPC del tercer año (desde julio de 2027), aún sin calcular.',
    fn: function (meses) {
      if (!meses.length) return [];
      var HASTA = '2027-06', u = meses[meses.length - 1], dD = (u.debidoDecreto || 0) - u.tramitado, dB = u.deltaBases, accD = u.deudaVivaDecreto, accB = u.deudaVivaBases, out = [];
      var y = +u.periodo.slice(0, 4), m = +u.periodo.slice(5, 7);
      while (true) { m++; if (m > 12) { m = 1; y++; } var p = y + '-' + (m < 10 ? '0' : '') + m; if (p > HASTA) break; accD += dD; accB += dB; out.push({ periodo: p, deltaDecreto: dD, deltaBases: dB, deudaVivaDecreto: accD, deudaVivaBases: accB }); }
      return out;
    }
  });
  dash.calc('c_deuda_resumen', {
    inputs: ['c_deuda_mes', 'c_proyeccion'], title: 'Deuda con Cosemar a la fecha',
    description: 'Último mes de servicio registrado, total tramitado, lo adeudado por decretos y según bases, lo que se suma cada mes sin regularizar y el retroactivo remitido a pago.',
    fn: function (meses, proy) {
      if (!meses.length) return [];
      var u = meses[meses.length - 1], f = proy[proy.length - 1], s = function (f) { return meses.reduce(function (t, m) { return t + (m[f] || 0); }, 0); };
      var dD = s('deltaDecreto'), dB = s('deltaBases');
      return [{ ultimoMes: u.periodo, tramitadoTotal: s('tramitado') + s('ajusteRetro'), deudaDecreto: dD, deudaBases: dB, deudaTotal: dD + dB,
        mensualDecreto: (u.debidoDecreto || 0) - u.tramitado, mensualBases: u.deltaBases, retroTramitado: s('ajusteRetro'), multas: s('multa'),
        proyHasta: f ? f.periodo : u.periodo, proyMeses: proy.length, proyDecreto: f ? f.deudaVivaDecreto : dD, proyBases: f ? f.deudaVivaBases : dB, proyTotal: f ? f.deudaVivaDecreto + f.deudaVivaBases : dD + dB }];
    }
  });

  var MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function mesLargo(p) { var x = String(p).split('-'); return MESL[+x[1] - 1] + ' de ' + x[0]; }
  function R(id, f, fmt) { dash.draw(id, function (el) { if (!listo(el, ['c_deuda_resumen'])) return; var r = filas('c_deuda_resumen')[0]; el.textContent = r ? fmt(r[f]) : '—'; }); }
  R('vd_ultimo', 'ultimoMes', mesLargo); R('vd_tram', 'tramitadoTotal', clp); R('vd_dec', 'deudaDecreto', clp); R('vd_bases', 'deudaBases', clp);
  R('vd_mesdec', 'mensualDecreto', clp); R('vd_mesbases', 'mensualBases', clp); R('vd_dec2', 'deudaDecreto', clp); R('vd_bases2', 'deudaBases', clp);
  R('vd_total', 'deudaTotal', clp); R('vd_proyhasta', 'proyHasta', mesLargo); R('vd_proymeses', 'proyMeses', String); R('vd_proydec', 'proyDecreto', clp); R('vd_proybases', 'proyBases', clp); R('vd_proytotal', 'proyTotal', clp); R('vd_retro', 'retroTramitado', clp);
  dash.draw('vd_k1', function (el) { el.style.background = dash.colors[0]; });
  function mill(v) { return Math.abs(v) >= 1e9 ? '$' + M.fmt(Math.round(v / 1e6)) + ' M' : '$' + (v / 1e6).toFixed(1).replace('.', ',') + ' M'; }

  // Escalera de precios: debido por decreto, según bases y tramitado.
  dash.draw('vd_escalera', function (el) {
    if (!listo(el, ['c_deuda_mes', 'alzas'])) return;
    var ms = filas('c_deuda_mes'), al = filas('alzas');
    el.replaceChildren(); if (!ms.length) { el.textContent = 'Sin meses de servicio'; return; }
    var w = Math.max(320, el.clientWidth || 720), H = w < 520 ? 300 : 340, m = { l: 62, r: 14, t: 40, b: 30 };
    var x = d3.scaleBand().domain(ms.map(function (p) { return p.periodo; })).range([m.l, w - m.r]).paddingInner(0);
    var vals = []; ms.forEach(function (p) { vals.push(p.debidoDecreto, p.debidoBases, p.tramitado); });
    var y = d3.scaleLinear().domain([d3.min(vals) * 0.985, d3.max(vals) * 1.012]).range([H - m.b, m.t]);
    var box = d3.select(el).append('div').attr('class', 'va-box');
    var svg = box.append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img')
      .attr('aria-label', 'Valor mensual bruto debido según decretos y según bases, y monto tramitado, por mes de servicio desde julio de 2024');
    svg.append('g').attr('class', 'va-grid').attr('transform', 'translate(' + m.l + ',0)').call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat(function (v) { return '$' + (v / 1e6).toFixed(0) + ' M'; }));
    var step = Math.max(1, Math.ceil(ms.length / Math.floor((w - m.l) / 46)));
    svg.append('g').attr('class', 'va-axis').attr('transform', 'translate(0,' + (H - m.b) + ')')
      .call(d3.axisBottom(x).tickValues(ms.map(function (p) { return p.periodo; }).filter(function (p, i) { return i % step === 0; })).tickFormat(mesTxt));
    var x0 = function (p) { return x(p.periodo); }, x1 = function (p) { return x(p.periodo) + x.bandwidth(); };
    // Franjas de diferencia
    svg.append('g').selectAll('rect').data(ms.filter(function (p) { return p.debidoDecreto > p.tramitado; })).join('rect')
      .attr('x', x0).attr('width', x.bandwidth()).attr('y', function (p) { return y(p.debidoDecreto); }).attr('height', function (p) { return y(p.tramitado) - y(p.debidoDecreto); })
      .style('fill', function (p) { return p.deltaDecreto > 1000 ? 'var(--color-bad)' : 'var(--cds-chart-muted)'; }).style('opacity', 0.28);
    svg.append('g').selectAll('rect').data(ms.filter(function (p) { return p.deltaBases > 0; })).join('rect')
      .attr('x', x0).attr('width', x.bandwidth()).attr('y', function (p) { return y(p.debidoBases); }).attr('height', function (p) { return y(p.debidoDecreto) - y(p.debidoBases); })
      .style('fill', 'var(--color-warn)').style('opacity', 0.3);
    // Escalones
    function escalon(f) { var pts = []; ms.forEach(function (p) { pts.push([x0(p), y(p[f])], [x1(p), y(p[f])]); }); return d3.line()(pts); }
    svg.append('path').attr('d', escalon('debidoBases')).style('fill', 'none').style('stroke', 'var(--color-warn)').style('stroke-width', 2).style('stroke-dasharray', '5 4');
    svg.append('path').attr('d', escalon('debidoDecreto')).style('fill', 'none').style('stroke', 'var(--cds-chart-reference)').style('stroke-width', 2.5);
    // Tramitado
    var cx = function (p) { return x(p.periodo) + x.bandwidth() / 2; };
    svg.append('path').attr('d', d3.line().x(cx).y(function (p) { return y(p.tramitado); })(ms)).style('fill', 'none').style('stroke', dash.colors[0]).style('stroke-width', 1.5);
    svg.append('g').selectAll('circle.r').data(ms.filter(function (p) { return p.ajusteRetro > 0; })).join('circle').attr('cx', cx).attr('cy', function (p) { return y(p.tramitado + p.ajusteRetro); }).attr('r', 4)
      .style('fill', 'none').style('stroke', 'var(--cds-chart-reference)').style('stroke-width', 1.5);
    svg.append('g').selectAll('circle.t').data(ms).join('circle').attr('cx', cx).attr('cy', function (p) { return y(p.tramitado); }).attr('r', 3.5)
      .style('fill', function (p) { return p.estado === 'OC solicitada' ? 'var(--color-bg)' : dash.colors[0]; }).style('stroke', dash.colors[0]).style('stroke-width', 1.5);
    // Rótulos de cada alza (donde cambia un escalón)
    var marcas = [];
    ms.forEach(function (p, i) {
      var prev = ms[i - 1];
      if (prev && p.debidoDecreto !== prev.debidoDecreto) marcas.push({ p: p, v: p.debidoDecreto, d: p.debidoDecreto - prev.debidoDecreto, acto: p.actoDecreto, tono: 'var(--color-fg)' });
      if (prev && p.debidoBases !== prev.debidoBases && p.debidoBases !== p.debidoDecreto) marcas.push({ p: p, v: p.debidoBases, d: p.debidoBases - p.debidoDecreto, acto: 'IPC 4,3% sin decreto', tono: 'var(--color-warn)' });
    });
    var lab = svg.append('g').selectAll('g').data(marcas).join('g');
    lab.append('line').attr('x1', function (k) { return x0(k.p); }).attr('x2', function (k) { return x0(k.p); }).attr('y1', function (k) { return y(k.v); }).attr('y2', function (k, i) { return 12 + (i % 3) * 12; })
      .style('stroke', 'var(--cds-chart-grid)');
    lab.append('text').attr('class', 'va-lab').attr('x', function (k) { return x0(k.p) + 3; }).attr('y', function (k, i) { return 12 + (i % 3) * 12; }).style('fill', function (k) { return k.tono; })
      .attr('text-anchor', function (k) { return x0(k.p) > w * 0.62 ? 'end' : 'start'; }).attr('dx', function (k) { return x0(k.p) > w * 0.62 ? -6 : 0; })
      .text(function (k) { return k.acto.replace('/2026', '') + ' +' + mill(k.d); });
    // Tooltip
    var t = tip(box);
    svg.append('g').selectAll('rect').data(ms).join('rect').attr('x', x0).attr('width', x.bandwidth()).attr('y', m.t).attr('height', H - m.b - m.t).style('fill', 'transparent')
      .on('pointerenter pointermove', function (ev, p) {
        showTip(t, el, ev, mesLargo(p.periodo) + ' · tramitado ' + clp(p.tramitado) + (p.estado === 'OC solicitada' ? ' (OC pedida)' : '') + (p.ajusteRetro ? ' + retroactivo ' + clp(p.ajusteRetro) : '') +
          ' · debido ' + clp(p.debidoDecreto) + ' (' + p.actoDecreto + ')' + (p.deltaBases ? ' · según bases ' + clp(p.debidoBases) : '') +
          (p.deltaDecreto > 0 ? ' · adeudado ' + clp(p.deltaDecreto) : '') + (p.multa ? ' · multa descontada ' + clp(p.multa) : '') + ' · ' + p.memo + (p.nota ? ' · ' + p.nota : ''));
      })
      .on('pointerleave', function () { t.attr('hidden', ''); });
  });

  // Deuda viva acumulada.
  dash.draw('vd_acum', function (el) {
    if (!listo(el, ['c_deuda_mes', 'c_proyeccion'])) return;
    var ms = filas('c_deuda_mes').map(function (p) { return Object.assign({ proy: false }, p); }).concat(filas('c_proyeccion').map(function (p) { return Object.assign({ proy: true }, p); }));
    el.replaceChildren(); if (!ms.length) { el.textContent = 'Sin meses de servicio'; return; }
    var w = Math.max(320, el.clientWidth || 720), H = 220, m = { l: 62, r: 14, t: 14, b: 30 };
    var x = d3.scaleBand().domain(ms.map(function (p) { return p.periodo; })).range([m.l, w - m.r]).padding(0.15);
    var y = d3.scaleLinear().domain([0, d3.max(ms, function (p) { return Math.max(0, p.deudaVivaDecreto) + p.deudaVivaBases; }) * 1.1 || 1]).nice().range([H - m.b, m.t]);
    var box = d3.select(el).append('div').attr('class', 'va-box');
    var svg = box.append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img').attr('aria-label', 'Deuda acumulada con Cosemar por decretos y adicional según bases, a cada mes');
    svg.append('g').attr('class', 'va-grid').attr('transform', 'translate(' + m.l + ',0)').call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat(function (v) { return '$' + (v / 1e6).toFixed(0) + ' M'; }));
    var step = Math.max(1, Math.ceil(ms.length / Math.floor((w - m.l) / 46)));
    svg.append('g').attr('class', 'va-axis').attr('transform', 'translate(0,' + (H - m.b) + ')').call(d3.axisBottom(x).tickValues(ms.map(function (p) { return p.periodo; }).filter(function (p, i) { return i % step === 0; })).tickFormat(mesTxt));
    var dv = function (p) { return Math.max(0, p.deudaVivaDecreto); };
    svg.append('g').selectAll('rect').data(ms).join('rect').attr('x', function (p) { return x(p.periodo); }).attr('width', x.bandwidth())
      .attr('y', function (p) { return y(dv(p)); }).attr('height', function (p) { return H - m.b - y(dv(p)); }).style('fill', 'var(--color-bad)').style('opacity', function (p) { return p.proy ? 0.22 : 0.6; });
    svg.append('g').selectAll('rect').data(ms).join('rect').attr('x', function (p) { return x(p.periodo); }).attr('width', x.bandwidth())
      .attr('y', function (p) { return y(dv(p) + p.deudaVivaBases); }).attr('height', function (p) { return y(dv(p)) - y(dv(p) + p.deudaVivaBases); }).style('fill', 'var(--color-warn)').style('opacity', function (p) { return p.proy ? 0.22 : 0.6; });
    var p0 = ms.filter(function (p) { return p.proy; })[0];
    if (p0) { svg.append('line').attr('x1', x(p0.periodo) - x.step() * 0.08).attr('x2', x(p0.periodo) - x.step() * 0.08).attr('y1', m.t).attr('y2', H - m.b).style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '4 3');
      svg.append('text').attr('class', 'va-axlab').attr('x', x(p0.periodo) + 2).attr('y', m.t + 10).text('proyección'); }
    var reales = ms.filter(function (p) { return !p.proy; });
    var pico = reales.reduce(function (a, p) { return dv(p) > dv(a) ? p : a; }, reales[0]), hoyM = reales[reales.length - 1], ult = ms[ms.length - 1];
    [pico, hoyM, ult].filter(function (p, i, a) { return dv(p) + p.deudaVivaBases > 0 && a.indexOf(p) === i; }).forEach(function (p) {
      var v = dv(p) + p.deudaVivaBases, xx = x(p.periodo) + x.bandwidth() / 2;
      svg.append('text').attr('class', 'va-lab').attr('x', xx).attr('y', y(v) - 4).attr('text-anchor', xx > w * 0.8 ? 'end' : 'middle').text(mill(v));
    });
    var t = tip(box);
    svg.append('g').selectAll('rect').data(ms).join('rect').attr('x', function (p) { return x(p.periodo); }).attr('width', x.step()).attr('y', m.t).attr('height', H - m.b - m.t).style('fill', 'transparent')
      .on('pointerenter pointermove', function (ev, p) { showTip(t, el, ev, mesLargo(p.periodo) + (p.proy ? ' (proyección)' : '') + ' · por decretos ' + clp(dv(p)) + (p.deudaVivaBases ? ' · adicional según bases ' + clp(p.deudaVivaBases) : '')); })
      .on('pointerleave', function () { t.attr('hidden', ''); });
  });

  dash.draw('vd_anual', function (el) {
    if (!listo(el, ['c_deuda_anual'])) return;
    el.replaceChildren.apply(el, filas('c_deuda_anual').map(function (r) {
      var tot = r.clave === 'Total', c = function (v, cls) { return h('td', { cls: 'va-num va-r' + (cls ? ' ' + cls : ''), text: clp(v) }); };
      return h('tr', { 'data-key': encodeURIComponent(r.clave), style: tot ? 'font-weight:600' : null }, [h('td', { text: r.clave === 'Total' ? 'Total a la fecha' : r.clave }), h('td', { cls: 'va-num va-r', text: String(r.meses) }),
        c(r.debidoDecreto), c(r.tramitado), c(r.multa), c(r.deudaDecreto, r.deudaDecreto > 1000 ? 'va-deuda' : ''), c(r.deudaBases, r.deudaBases > 0 ? 'va-ipc' : ''), c(r.deudaTotal)]);
    }));
  });

  // ---------- plan de pago vigente (plan_pago, Notion 17-11-2026) ----------
  var PLAZO_MESES = 2; // factura a mediados del mes siguiente + 30 días contra recepción conforme (OC)
  function difMeses(a, b) { return (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7)); }
  function sigMes(p) { var y = +p.slice(0, 4), m = +p.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return y + '-' + (m < 10 ? '0' : '') + m; }
  dash.calc('c_plan_mes', {
    inputs: ['plan_pago'], title: 'Plan de pago por mes de desembolso',
    description: 'Suma lo que el plan paga cada mes por componente y calcula el saldo adeudado al cierre: servicios ya prestados (mes de servicio hasta ese mes) que el plan paga en un mes posterior.',
    fn: function (plan) {
      if (!plan.length) return [];
      var meses = plan.map(function (r) { return r.mesPago; }).concat(plan.map(function (r) { return r.servicio; })).filter(function (p) { return p >= '2026-11'; }).sort();
      var out = [], p = meses[0], fin = meses[meses.length - 1];
      while (p <= fin) {
        var de = plan.filter(function (r) { return r.mesPago === p; }), sum = function (t) { return de.filter(function (r) { return r.tipo === t; }).reduce(function (a, r) { return a + Number(r.monto); }, 0); };
        var saldo = plan.filter(function (r) { return r.servicio <= p && r.mesPago > p; }).reduce(function (a, r) { return a + Number(r.monto); }, 0);
        out.push({ mesPago: p, base: sum('base'), pob: sum('pob'), ipc: sum('ipc'), total: sum('base') + sum('pob') + sum('ipc'), saldo: saldo });
        p = sigMes(p);
      }
      return out;
    }
  });
  dash.calc('c_plan_servicio', {
    inputs: ['plan_pago', 'alzas'], title: 'Plan de pago por mes de servicio',
    description: 'Para cada mes de servicio suma lo programado, lo compara con el valor que corresponde según bases (contrato, decretos y bases sin decreto) y mide el atraso de la mensualidad frente a un plazo estimado de dos meses.',
    fn: function (plan, alzas) {
      function rige(p) { var a = alzas.filter(function (x) { return ['Contrato', 'Decreto', 'Bases sin decreto'].indexOf(x.capa) >= 0 && x.rigeDesde && x.rigeDesde <= p && x.bruto != null; }).sort(function (x, y) { return x.rigeDesde < y.rigeDesde ? -1 : 1; }); return a.length ? a[a.length - 1].bruto : null; }
      var ss = plan.map(function (r) { return r.servicio; }).filter(function (s, i, a) { return a.indexOf(s) === i; }).sort();
      return ss.map(function (s) {
        var rs = plan.filter(function (r) { return r.servicio === s; }), base = rs.filter(function (r) { return r.tipo === 'base'; })[0];
        var partes = rs.map(function (r) { return r.componente + ' $' + window.Motor.fmt(r.monto) + ' en ' + r.mesPago; });
        var atraso = base ? Math.max(0, difMeses(s, base.mesPago) - PLAZO_MESES) : null;
        return { servicio: s, programado: rs.reduce(function (a, r) { return a + Number(r.monto); }, 0), debidoBases: rige(s), mesPago: base ? base.mesPago : null,
          atraso: atraso, detalle: (base ? '' : 'Mensualidad ya tramitada en 2026. ') + partes.join(' · ') };
      });
    }
  });
  dash.calc('c_plan_resumen', {
    inputs: ['plan_pago', 'c_plan_mes', 'c_plan_servicio'], title: 'Resumen del plan de pago',
    description: 'Total programado, parte que depende del IPC sin decreto, meses de servicio pagados después del plazo estimado y saldo adeudado máximo.',
    fn: function (plan, meses, servicios) {
      if (!plan.length) return [];
      var tot = plan.reduce(function (a, r) { return a + Number(r.monto); }, 0), ipc = plan.filter(function (r) { return !r.decretado; }).reduce(function (a, r) { return a + Number(r.monto); }, 0);
      var pagos = plan.map(function (r) { return r.mesPago; }).sort(), at = servicios.filter(function (s) { return s.atraso > 0; });
      var mx = meses.reduce(function (a, m) { return m.saldo > a.saldo ? m : a; }, meses[0] || { saldo: 0, mesPago: null });
      return [{ total: tot, sinDecreto: ipc, decretado: tot - ipc, primerMes: pagos[0], ultimoMes: pagos[pagos.length - 1], mesesAtrasados: at.length,
        maxAtraso: at.reduce(function (a, s) { return Math.max(a, s.atraso); }, 0), saldoMax: mx.saldo, saldoMaxMes: mx.mesPago }];
    }
  });
  function RP(id, f, fmt) { dash.draw(id, function (el) { if (!listo(el, ['c_plan_resumen'])) return; var r = filas('c_plan_resumen')[0]; el.textContent = r ? fmt(r[f]) : '—'; }); }
  RP('vp_total', 'total', clp); RP('vp_desde', 'primerMes', mesLargo); RP('vp_hasta', 'ultimoMes', mesLargo); RP('vp_ipc', 'sinDecreto', clp); RP('vp_dec', 'decretado', clp);
  RP('vp_atrasados', 'mesesAtrasados', String); RP('vp_maxatraso', 'maxAtraso', String); RP('vp_saldomax', 'saldoMax', clp); RP('vp_saldomes', 'saldoMaxMes', mesLargo);
  dash.draw('vp_plazo', function (el) { el.textContent = PLAZO_MESES === 2 ? 'dos' : String(PLAZO_MESES); });
  dash.draw('vp_k0', function (el) { el.style.background = dash.colors[0]; });
  dash.draw('vp_k1', function (el) { el.style.background = dash.colors[1] || dash.colors[0]; });

  dash.draw('vp_caja', function (el) {
    if (!listo(el, ['c_plan_mes'])) return;
    var ms = filas('c_plan_mes'); el.replaceChildren(); if (!ms.length) { el.textContent = 'Sin plan cargado'; return; }
    var w = Math.max(320, el.clientWidth || 720), H = w < 520 ? 280 : 320, m = { l: 66, r: 14, t: 22, b: 30 };
    var x = d3.scaleBand().domain(ms.map(function (p) { return p.mesPago; })).range([m.l, w - m.r]).padding(0.22);
    var y = d3.scaleLinear().domain([0, d3.max(ms, function (p) { return Math.max(p.total, p.saldo); }) * 1.12]).nice().range([H - m.b, m.t]);
    var box = d3.select(el).append('div').attr('class', 'va-box');
    var svg = box.append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img').attr('aria-label', 'Desembolso programado por mes y saldo adeudado a Cosemar al cierre de cada mes, de noviembre de 2026 a diciembre de 2027');
    svg.append('g').attr('class', 'va-grid').attr('transform', 'translate(' + m.l + ',0)').call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat(function (v) { return '$' + (v / 1e6).toFixed(0) + ' M'; }));
    var step = Math.max(1, Math.ceil(ms.length / Math.floor((w - m.l) / 46)));
    svg.append('g').attr('class', 'va-axis').attr('transform', 'translate(0,' + (H - m.b) + ')').call(d3.axisBottom(x).tickValues(ms.map(function (p) { return p.mesPago; }).filter(function (p, i) { return i % step === 0; })).tickFormat(mesTxt));
    var capas = [['base', dash.colors[0], 0.85], ['pob', dash.colors[1] || dash.colors[0], 0.85], ['ipc', 'var(--color-warn)', 0.8]];
    ms.forEach(function (p) {
      var acc = 0;
      capas.forEach(function (c) { var v = p[c[0]]; if (!v) return; svg.append('rect').attr('x', x(p.mesPago)).attr('width', x.bandwidth()).attr('y', y(acc + v)).attr('height', y(acc) - y(acc + v)).style('fill', c[1]).style('opacity', c[2]); acc += v; });
    });
    svg.append('g').selectAll('text').data(ms.filter(function (p) { return p.total > 0 && x.bandwidth() > 26; })).join('text').attr('class', 'va-lab').attr('text-anchor', 'middle')
      .attr('x', function (p) { return x(p.mesPago) + x.bandwidth() / 2; }).attr('y', function (p) { return y(p.total) - 4; }).text(function (p) { return (p.total / 1e6).toFixed(0) + ' M'; });
    var cx = function (p) { return x(p.mesPago) + x.bandwidth() / 2; };
    svg.append('path').attr('d', d3.line().x(cx).y(function (p) { return y(p.saldo); })(ms)).style('fill', 'none').style('stroke', 'var(--cds-chart-reference)').style('stroke-width', 2.5);
    svg.append('g').selectAll('circle').data(ms).join('circle').attr('cx', cx).attr('cy', function (p) { return y(p.saldo); }).attr('r', 3).style('fill', 'var(--cds-chart-reference)');
    var mx = ms.reduce(function (a, p) { return p.saldo > a.saldo ? p : a; }, ms[0]);
    svg.append('text').attr('class', 'va-lab va-strong').attr('x', cx(mx) + 6).attr('y', y(mx.saldo) - 6).attr('text-anchor', cx(mx) > w * 0.7 ? 'end' : 'start').text('Saldo ' + mill(mx.saldo));
    var t = tip(box);
    svg.append('g').selectAll('rect').data(ms).join('rect').attr('x', function (p) { return x(p.mesPago); }).attr('width', x.step()).attr('y', m.t).attr('height', H - m.b - m.t).style('fill', 'transparent')
      .on('pointerenter pointermove', function (ev, p) { showTip(t, el, ev, mesLargo(p.mesPago) + ' · paga ' + clp(p.total) + (p.total ? ' (mensualidad ' + clp(p.base) + ', viviendas ' + clp(p.pob) + ', IPC ' + clp(p.ipc) + ')' : '') + ' · adeudado al cierre ' + clp(p.saldo)); })
      .on('pointerleave', function () { t.attr('hidden', ''); });
  });

  dash.draw('vp_servicios', function (el) {
    if (!listo(el, ['c_plan_servicio'])) return;
    el.replaceChildren.apply(el, filas('c_plan_servicio').map(function (r) {
      var at = r.atraso == null ? h('span', { cls: 'va-muted', text: '—' }) : r.atraso > 0 ? h('span', { cls: 'va-chip va-chip-bad', text: r.atraso + (r.atraso === 1 ? ' mes' : ' meses') }) : h('span', { cls: 'va-chip va-chip-ok', text: 'en plazo' });
      return h('tr', { 'data-key': encodeURIComponent(r.servicio) }, [h('td', { cls: 'va-num', text: mesTxt(r.servicio) }), h('td', { cls: 'va-num va-r', text: clp(r.programado) }),
        h('td', { cls: 'va-num va-r', text: r.debidoBases == null ? '—' : clp(r.debidoBases) }), h('td', { cls: 'va-num', text: r.mesPago ? mesTxt(r.mesPago) : 'tramitada en 2026' }), h('td', null, [at]), h('td', { cls: 'va-muted', text: r.detalle })]);
    }));
  });

  // ---------- contrato de disposición final (df_pagos, df_alzas) ----------
  dash.calc('c_df_mes', {
    inputs: ['df_pagos'], title: 'Disposición final por mes de servicio',
    description: 'Toneladas, tarifa, debido (toneladas × tarifa × 1,19), tramitado, diferencia y meses entre el servicio y el memo de pago de cada mes.',
    fn: function (pagos) {
      return pagos.slice().sort(function (a, b) { return a.periodo < b.periodo ? -1 : 1; }).map(function (p) {
        var lag = p.fechaMemoPago ? (+p.fechaMemoPago.slice(0, 4) - +p.periodo.slice(0, 4)) * 12 + (+p.fechaMemoPago.slice(5, 7) - +p.periodo.slice(5, 7)) : null;
        return { periodo: p.periodo, anio: p.anio, toneladas: Number(p.toneladas), tarifaNeta: p.tarifaNeta, debido: p.debido, tramitado: p.tramitado, diferencia: p.tramitado - p.debido,
          estado: p.estado, memoPago: p.memoPago, factura: p.factura, oc: p.oc, atraso: lag, sinMemo: !p.pagado, respaldo: p.respaldo, nota: p.nota };
      });
    }
  });
  dash.calc('c_df_anual', {
    inputs: ['c_df_mes', 'df_alzas'], title: 'Disposición final por año',
    description: 'Suma por año toneladas, tramitado, diferencia y montos pendientes de pago; promedio de toneladas por mes, promedio usado para proyectar en el acto de ese año y atraso medio del memo de pago. Agrega una fila Total.',
    fn: function (meses, actos) {
      var by = {}, orden = [], f = function (k) { return { clave: k, meses: 0, toneladas: 0, tramitado: 0, diferencia: 0, sinMemo: 0, _lag: 0, _nlag: 0 }; }, tot = f('Total');
      meses.forEach(function (m) { var k = String(m.anio); if (!by[k]) { by[k] = f(k); orden.push(k); }
        [by[k], tot].forEach(function (r) { r.meses++; r.toneladas += m.toneladas; r.tramitado += m.tramitado; r.diferencia += m.diferencia; if (m.sinMemo) r.sinMemo += m.tramitado; if (m.atraso != null) { r._lag += m.atraso; r._nlag++; } }); });
      return orden.map(function (k) { return by[k]; }).concat([tot]).map(function (r) {
        var pr = actos.filter(function (a) { return a.tonProyeccion && String(a.anioBaseProyeccion) === r.clave; })[0];
        return { clave: r.clave, meses: r.meses, toneladas: Math.round(r.toneladas * 100) / 100, promedio: Math.round(r.toneladas / r.meses * 100) / 100, proyeccion: pr ? pr.tonProyeccion : null, actoProyeccion: pr ? pr.acto : null,
          tramitado: r.tramitado, diferencia: r.diferencia, sinMemo: r.sinMemo, atrasoMedio: r._nlag ? Math.round(r._lag / r._nlag * 10) / 10 : null };
      });
    }
  });
  dash.calc('c_df_resumen', {
    inputs: ['c_df_mes', 'df_alzas'], title: 'Disposición final: resumen',
    description: 'Último mes registrado, total tramitado y toneladas, diferencia con toneladas × tarifa, meses y monto pendientes de pago, atraso máximo del memo de pago y tarifa vigente del último decreto.',
    fn: function (meses, actos) {
      if (!meses.length) return [];
      var s = function (f) { return meses.reduce(function (t, m) { return t + (m[f] || 0); }, 0); }, sm = meses.filter(function (m) { return m.sinMemo; });
      var t = actos.filter(function (a) { return (a.capa === 'Decreto' || a.capa === 'Contrato') && a.tarifaNeta && a.rigeDesde; }).sort(function (a, b) { return a.rigeDesde < b.rigeDesde ? -1 : 1; }).pop();
      return [{ ultimoMes: meses[meses.length - 1].periodo, tramitado: s('tramitado'), toneladas: Math.round(s('toneladas') * 100) / 100, diferencia: s('diferencia'), mesesSinMemo: sm.length,
        sinMemo: sm.reduce(function (a, m) { return a + m.tramitado; }, 0), maxAtraso: meses.reduce(function (a, m) { return Math.max(a, m.atraso || 0); }, 0), tarifaVigente: t ? t.tarifaNeta : null }];
    }
  });
  function RF(id, f, fmt) { dash.draw(id, function (el) { if (!listo(el, ['c_df_resumen'])) return; var r = filas('c_df_resumen')[0]; el.textContent = r ? fmt(r[f]) : '—'; }); }
  RF('vf_ultimo', 'ultimoMes', mesLargo); RF('vf_tram', 'tramitado', clp); RF('vf_ton', 'toneladas', function (v) { return v.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); });
  RF('vf_dif', 'diferencia', clp); RF('vf_sinmemo', 'mesesSinMemo', String); RF('vf_sinmemomonto', 'sinMemo', clp); RF('vf_maxlag', 'maxAtraso', String); RF('vf_tarifa', 'tarifaVigente', clp);
  dash.draw('vf_k0', function (el) { el.style.background = dash.colors[0]; });
  dash.draw('vf_k1', function (el) { el.style.background = dash.colors[1] || dash.colors[0]; });

  dash.draw('vf_pagos', function (el) {
    if (!listo(el, ['c_df_mes'])) return;
    var ms = filas('c_df_mes'); el.replaceChildren(); if (!ms.length) { el.textContent = 'Sin meses'; return; }
    var w = Math.max(320, el.clientWidth || 720), H = 240, m = { l: 58, r: 10, t: 20, b: 30 };
    var x = d3.scaleBand().domain(ms.map(function (p) { return p.periodo; })).range([m.l, w - m.r]).padding(0.2);
    var y = d3.scaleLinear().domain([0, d3.max(ms, function (p) { return p.tramitado; }) * 1.12]).nice().range([H - m.b, m.t]);
    var box = d3.select(el).append('div').attr('class', 'va-box');
    var svg = box.append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img').attr('aria-label', 'Monto bruto tramitado por mes de servicio de disposición final y meses hasta el memo de pago');
    svg.append('g').attr('class', 'va-grid').attr('transform', 'translate(' + m.l + ',0)').call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat(function (v) { return '$' + (v / 1e6).toFixed(0) + ' M'; }));
    var step = Math.max(1, Math.ceil(ms.length / Math.floor((w - m.l) / 46)));
    svg.append('g').attr('class', 'va-axis').attr('transform', 'translate(0,' + (H - m.b) + ')').call(d3.axisBottom(x).tickValues(ms.map(function (p) { return p.periodo; }).filter(function (p, i) { return i % step === 0; })).tickFormat(mesTxt));
    svg.append('g').selectAll('rect').data(ms).join('rect').attr('x', function (p) { return x(p.periodo); }).attr('width', x.bandwidth()).attr('y', function (p) { return y(p.tramitado); }).attr('height', function (p) { return H - m.b - y(p.tramitado); })
      .style('fill', function (p) { return p.sinMemo ? 'var(--color-bad)' : dash.colors[0]; }).style('opacity', function (p) { return p.sinMemo ? 0.75 : 0.85; });
    if (x.bandwidth() > 12) svg.append('g').selectAll('text').data(ms).join('text').attr('class', function (p) { return 'va-lab' + (p.atraso > 2 ? ' va-bad' : ''); }).attr('text-anchor', 'middle')
      .attr('x', function (p) { return x(p.periodo) + x.bandwidth() / 2; }).attr('y', function (p) { return y(p.tramitado) - 4; }).text(function (p) { return p.sinMemo ? 'pendiente' : p.atraso == null ? 'pagado' : p.atraso + ' m'; })
      .style('font-size', x.bandwidth() < 26 ? '9px' : null);
    var t = tip(box);
    svg.append('g').selectAll('rect.h').data(ms).join('rect').attr('x', function (p) { return x(p.periodo); }).attr('width', x.step()).attr('y', m.t).attr('height', H - m.b - m.t).style('fill', 'transparent')
      .on('pointerenter pointermove', function (ev, p) { showTip(t, el, ev, mesLargo(p.periodo) + ' · ' + p.toneladas.toLocaleString('es-CL') + ' t × $' + M.fmt(p.tarifaNeta) + ' · tramitado ' + clp(p.tramitado) + (p.diferencia ? ' (dif. ' + clp(p.diferencia) + ')' : '') + ' · ' + (p.memoPago ? p.memoPago + ', ' + p.atraso + ' meses después' : 'memo de pago no hallado') + ' · ' + p.estado + (p.nota ? ' · ' + p.nota : '')); })
      .on('pointerleave', function () { t.attr('hidden', ''); });
  });

  dash.draw('vf_ton_graf', function (el) {
    if (!listo(el, ['c_df_mes', 'c_df_anual'])) return;
    var ms = filas('c_df_mes'), an = filas('c_df_anual'); el.replaceChildren(); if (!ms.length) { el.textContent = 'Sin meses'; return; }
    var w = Math.max(320, el.clientWidth || 720), H = 220, m = { l: 58, r: 10, t: 14, b: 30 };
    var x = d3.scaleBand().domain(ms.map(function (p) { return p.periodo; })).range([m.l, w - m.r]).padding(0.2);
    var vals = ms.map(function (p) { return p.toneladas; }).concat(an.map(function (a) { return a.proyeccion || 0; }));
    var y = d3.scaleLinear().domain([Math.min.apply(null, vals.filter(Boolean)) * 0.9, d3.max(vals) * 1.04]).nice().range([H - m.b, m.t]);
    var box = d3.select(el).append('div').attr('class', 'va-box');
    var svg = box.append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img').attr('aria-label', 'Toneladas mensuales dispuestas frente al promedio real y al promedio usado en los actos para proyectar');
    svg.append('g').attr('class', 'va-grid').attr('transform', 'translate(' + m.l + ',0)').call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat(function (v) { return M.fmt(v) + ' t'; }));
    var step = Math.max(1, Math.ceil(ms.length / Math.floor((w - m.l) / 46)));
    svg.append('g').attr('class', 'va-axis').attr('transform', 'translate(0,' + (H - m.b) + ')').call(d3.axisBottom(x).tickValues(ms.map(function (p) { return p.periodo; }).filter(function (p, i) { return i % step === 0; })).tickFormat(mesTxt));
    svg.append('g').selectAll('circle').data(ms).join('circle').attr('cx', function (p) { return x(p.periodo) + x.bandwidth() / 2; }).attr('cy', function (p) { return y(p.toneladas); }).attr('r', 4).style('fill', dash.colors[1] || dash.colors[0]);
    svg.append('path').attr('d', d3.line().x(function (p) { return x(p.periodo) + x.bandwidth() / 2; }).y(function (p) { return y(p.toneladas); })(ms)).style('fill', 'none').style('stroke', dash.colors[1] || dash.colors[0]).style('stroke-width', 1.2).style('opacity', 0.6);
    an.filter(function (a) { return a.clave !== 'Total'; }).forEach(function (a) {
      var mm = ms.filter(function (p) { return String(p.anio) === a.clave; }); if (!mm.length) return;
      var x0 = x(mm[0].periodo), x1 = x(mm[mm.length - 1].periodo) + x.bandwidth();
      svg.append('line').attr('x1', x0).attr('x2', x1).attr('y1', y(a.promedio)).attr('y2', y(a.promedio)).style('stroke', 'var(--cds-chart-reference)').style('stroke-width', 2);
      svg.append('text').attr('class', 'va-lab').attr('x', x0 + 2).attr('y', y(a.promedio) + 13).text('real ' + M.fmt(Math.round(a.promedio)) + ' t');
      if (a.proyeccion) { svg.append('line').attr('x1', x0).attr('x2', x1).attr('y1', y(a.proyeccion)).attr('y2', y(a.proyeccion)).style('stroke', 'var(--color-warn)').style('stroke-width', 2).style('stroke-dasharray', '5 4');
        svg.append('text').attr('class', 'va-lab').style('fill', 'var(--color-warn)').attr('x', x1 - 2).attr('y', y(a.proyeccion) - 4).attr('text-anchor', 'end').text('acto ' + M.fmt(Math.round(a.proyeccion)) + ' t'); }
    });
    var t = tip(box);
    svg.append('g').selectAll('rect').data(ms).join('rect').attr('x', function (p) { return x(p.periodo); }).attr('width', x.step()).attr('y', m.t).attr('height', H - m.b - m.t).style('fill', 'transparent')
      .on('pointerenter pointermove', function (ev, p) { showTip(t, el, ev, mesLargo(p.periodo) + ' · ' + p.toneladas.toLocaleString('es-CL') + ' t'); }).on('pointerleave', function () { t.attr('hidden', ''); });
  });

  dash.draw('vf_anual', function (el) {
    if (!listo(el, ['c_df_anual'])) return;
    var ton = function (v) { return v == null ? '—' : v.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    el.replaceChildren.apply(el, filas('c_df_anual').map(function (r) {
      var c = function (txt, cls) { return h('td', { cls: 'va-num va-r' + (cls ? ' ' + cls : ''), text: txt }); };
      return h('tr', { 'data-key': encodeURIComponent(r.clave), style: r.clave === 'Total' ? 'font-weight:600' : null }, [h('td', { text: r.clave === 'Total' ? 'Total a la fecha' : r.clave }), c(String(r.meses)), c(ton(r.toneladas)), c(ton(r.promedio)),
        c(r.proyeccion ? ton(r.proyeccion) : '—', r.proyeccion && Math.abs(r.proyeccion - r.promedio) > 10 ? 'va-ipc' : ''), c(clp(r.tramitado)), c(clp(r.diferencia)), c(clp(r.sinMemo), r.sinMemo > 0 ? 'va-deuda' : ''), c(r.atrasoMedio == null ? '—' : String(r.atrasoMedio).replace('.', ','))]);
    }));
  });

  dash.draw('vf_actos', function (el) {
    if (!listo(el, ['df_alzas'])) return;
    var tono = function (e) { return /Ejecutado|Vigente/.test(e) ? 'ok' : /no aplicado|Borrador/i.test(e) ? 'warn' : ''; };
    el.replaceChildren.apply(el, filas('df_alzas').map(function (a) {
      return h('tr', { 'data-key': encodeURIComponent(a.id) }, [h('td', { cls: 'va-num', text: fechaCL(a.fecha) }), h('td', { text: a.tipo }), h('td', null, [h('b', { text: a.acto })]), h('td', { text: a.efecto }),
        h('td', { cls: 'va-num va-r', text: a.tarifaNeta == null ? '—' : clp(a.tarifaNeta) }), h('td', { cls: 'va-num', text: a.rigeDesde ? mesTxt(a.rigeDesde) : '—' }),
        h('td', null, [h('span', { cls: 'va-chip' + (tono(a.estado) ? ' va-chip-' + tono(a.estado) : ''), text: a.estado })]),
        h('td', null, [a.respaldo ? h('a', { href: a.respaldo, target: '_blank', rel: 'noopener', text: 'Abrir' }) : h('span', { cls: 'va-muted', text: 'Sin respaldo' })])]);
    }));
  });

  dash.draw('vd_alzas', function (el) {
    if (!listo(el, ['alzas'])) return;
    var tono = function (e) { return /Ejecutado|Vigente/.test(e) ? 'ok' : /no aplicado|sin decreto|Sin decreto|suspendido|Sin firmas|Sin respuesta/i.test(e) ? 'bad' : /Concordada|Devengado|Remitido/.test(e) ? 'warn' : ''; };
    el.replaceChildren.apply(el, filas('alzas').map(function (a) {
      return h('tr', { 'data-key': encodeURIComponent(a.id) }, [h('td', { cls: 'va-num', text: fechaCL(a.fecha) }), h('td', { text: a.tipo }), h('td', null, [h('b', { text: a.acto })]), h('td', { text: a.efecto }),
        h('td', { cls: 'va-num va-r', text: a.bruto == null ? '—' : clp(a.bruto) }), h('td', { cls: 'va-num', text: a.rigeDesde ? mesTxt(a.rigeDesde) : '—' }),
        h('td', null, [h('span', { cls: 'va-chip' + (tono(a.estado) ? ' va-chip-' + tono(a.estado) : ''), text: a.estado })]),
        h('td', null, [a.respaldo ? h('a', { href: a.respaldo, target: '_blank', rel: 'noopener', text: 'Abrir' }) : h('span', { cls: 'va-muted', text: 'Sin respaldo' })])]);
    }));
  });

  // ---------- 2 · dónde está detenido cada pago ----------
  dash.draw('va_cadena', function (el) {
    if (!listo(el, ['c_pagos', 'c_eventos'])) return;
    var ps = filas('c_pagos').filter(function (p) { return !p.ajuste && p.periodo >= '2026-01'; }).map(function (p) { return p.periodo; });
    var ev = filas('c_eventos').filter(function (e) { return e.vigente && e.modulo === 'Pago'; });
    var hs = M.HITOS_PAGO;
    function estado(per, hid) { var es = ev.filter(function (e) { return e.entidad === per && e.hito === hid; }); if (!es.length) return 0; return es.some(function (e) { return e.verificacion !== 'Por verificar' && (e.respaldo || e.documento); }) ? 2 : 1; }
    el.replaceChildren();
    var w = Math.max(560, el.clientWidth || 640), lw = 190, cw = (w - lw - 8) / ps.length, rh = 22, H = hs.length * rh + 30;
    var box = d3.select(el).append('div').attr('class', 'va-box va-scroll');
    var svg = box.append('svg').attr('width', w).attr('height', H).attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img').attr('aria-label', 'Hitos del pago acreditados, por verificar o sin antecedentes, por mes de servicio');
    svg.append('g').selectAll('text').data(ps).join('text').attr('class', 'va-axlab').attr('x', function (p, i) { return lw + i * cw + cw / 2; }).attr('y', 14).attr('text-anchor', 'middle').text(mesTxt);
    svg.append('g').selectAll('text').data(hs).join('text').attr('class', 'va-axlab').attr('x', lw - 8).attr('y', function (d, i) { return 24 + i * rh + rh / 2 + 4; }).attr('text-anchor', 'end').text(function (d) { return d.nombre.length > 30 ? d.nombre.slice(0, 29) + '…' : d.nombre; });
    var t = tip(box), cells = [];
    hs.forEach(function (hh, i) { ps.forEach(function (p, j) { cells.push({ i: i, j: j, per: p, hito: hh, s: estado(p, hh.id) }); }); });
    var fill = ['var(--color-panel)', 'var(--color-warn)', 'var(--color-ok)'];
    svg.append('g').selectAll('rect').data(cells).join('rect').attr('x', function (c) { return lw + c.j * cw + 2; }).attr('y', function (c) { return 24 + c.i * rh + 2; }).attr('width', cw - 4).attr('height', rh - 4).attr('rx', 3)
      .style('fill', function (c) { return fill[c.s]; }).style('opacity', function (c) { return c.s === 1 ? 0.55 : c.s === 2 ? 0.8 : 1; }).style('stroke', 'var(--color-border-line)')
      .on('pointerenter pointermove', function (e2, c) { showTip(t, el, e2, mesTxt(c.per) + ' · ' + c.hito.nombre + ' · ' + ['sin antecedentes', 'por verificar', 'acreditado'][c.s]); })
      .on('pointerleave', function () { t.attr('hidden', ''); });
  });

  // ---------- 3 · sanciones: hasta dónde llega cada proceso ----------
  var ETAPAS = [['Hallazgo', ['manifold']], ['Comunicación', ['comunicacion_empresa']], ['Descargos', ['respuesta_empresa']], ['Evaluación o informe', ['informe_evaluacion', 'informe_tecnico', 'revision_edgar']],
    ['Memo y visados', ['memo_secmun', 'visado_alcaldia', 'remision_secmun', 'borrador_decreto', 'revision_control']], ['Decreto', ['decreto_multa', 'publicacion_mp']], ['Notificación', ['notificacion']],
    ['Reposición', ['reposicion_recibida', 'analisis_reposicion', 'memo_reposicion', 'visado_juridico', 'visado_alcaldia_rep', 'sin_reposicion']], ['Decreto final', ['decreto_final', 'rectificacion_decreto', 'comunicacion_final']], ['Cobro', ['derivacion_cobro', 'cobro_efectivo']]];
  dash.draw('va_sanciones', function (el) {
    if (!listo(el, ['c_sanciones', 'c_eventos'])) return;
    var S = filas('c_sanciones'), ev = filas('c_eventos').filter(function (e) { return e.vigente && e.modulo === 'Sanción' && e.verificacion !== 'Por verificar' && (e.respaldo || e.documento); });
    function etapa(id) { var mx = -1; ev.forEach(function (e) { if (e.entidad !== id) return; ETAPAS.forEach(function (st, k) { if (st[1].indexOf(e.hito) >= 0 && k > mx) mx = k; }); }); return mx; }
    el.replaceChildren();
    var w = Math.max(560, el.clientWidth || 640), lw = 72, H = S.length * 34 + 56, x = d3.scalePoint().domain(ETAPAS.map(function (e) { return e[0]; })).range([lw + 10, w - 30]);
    var box = d3.select(el).append('div').attr('class', 'va-box va-scroll');
    var svg = box.append('svg').attr('width', w).attr('height', H).attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img').attr('aria-label', 'Etapa acreditada más avanzada de cada proceso sancionatorio');
    svg.append('g').selectAll('text').data(ETAPAS).join('text').attr('class', 'va-axlab').attr('transform', function (e) { return 'translate(' + x(e[0]) + ',' + (H - 6) + ') rotate(-28)'; }).attr('text-anchor', 'end').text(function (e) { return e[0]; });
    var t = tip(box);
    var g = svg.append('g').selectAll('g').data(S).join('g').attr('transform', function (s, i) { return 'translate(0,' + (18 + i * 34) + ')'; });
    g.append('text').attr('class', 'va-axlab va-strong').attr('x', 0).attr('y', 4).text(function (s) { return s.id; });
    g.append('line').attr('x1', x(ETAPAS[0][0])).attr('x2', x(ETAPAS[ETAPAS.length - 1][0])).style('stroke', 'var(--cds-chart-grid)').style('stroke-width', 6).style('stroke-linecap', 'round');
    g.append('line').attr('x1', x(ETAPAS[0][0])).attr('x2', function (s) { var k = etapa(s.id); return k < 0 ? x(ETAPAS[0][0]) : x(ETAPAS[k][0]); }).style('stroke', function (s) { return s.cerrada ? 'var(--cds-chart-muted)' : dash.colors[0]; }).style('stroke-width', 6).style('stroke-linecap', 'round');
    g.append('circle').attr('cx', function (s) { var k = etapa(s.id); return x(ETAPAS[Math.max(0, k)][0]); }).attr('r', 7)
      .style('fill', function (s) { return s.cerrada ? 'var(--cds-chart-muted)' : s.plazoEstado === 'vencido' ? 'var(--cds-chart-status-critical)' : s.plazoEstado === 'por verificar' ? 'var(--color-warn)' : 'var(--color-ok)'; })
      .on('pointerenter pointermove', function (e2, s) { showTip(t, el, e2, s.id + ' · ' + s.estado + ' · plazo ' + s.plazoEstado + (s.falta ? ' · ' + s.falta : s.vence ? ' · vence ' + fechaCL(s.vence) : '')); })
      .on('pointerleave', function () { t.attr('hidden', ''); });
  });
  dash.draw('va_faltas', function (el) {
    if (!listo(el, ['c_sanciones'])) return;
    el.replaceChildren.apply(el, filas('c_sanciones').filter(function (s) { return !s.cerrada; }).map(function (s) {
      return h('li', null, [h('b', { text: s.id + ' · ' }), s.titulo + '. ', h('span', { cls: 'va-muted', text: (s.falta || ('Vence ' + fechaCL(s.vence))) + ' Siguiente: ' + s.siguiente + '.' })]);
    }));
  });

  // ---------- 4 · vencimientos de los próximos 120 días ----------
  dash.draw('va_venc', function (el) {
    if (!listo(el, ['c_vencimientos'])) return;
    var vs = filas('c_vencimientos').filter(function (v) { return v.dias != null && v.dias <= 120; });
    el.replaceChildren(); if (!vs.length) { el.textContent = 'Nada vence en los próximos 120 días'; return; }
    var w = Math.max(320, el.clientWidth || 640), H = 150, m = { l: 14, r: 14 };
    var hoy = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()) + 'T12:00:00Z');
    var x = d3.scaleUtc().domain([d3.utcDay.offset(hoy, -10), d3.utcDay.offset(hoy, 120)]).range([m.l, w - m.r]);
    var box = d3.select(el).append('div').attr('class', 'va-box');
    var svg = box.append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img').attr('aria-label', vs.length + ' documentos que vencen en los próximos 120 días');
    svg.append('g').attr('class', 'va-axis').attr('transform', 'translate(0,' + (H - 24) + ')').call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(w / 120))).tickFormat(function (d) { return d.getUTCDate() + ' ' + MES[d.getUTCMonth()]; }));
    svg.append('line').attr('x1', x(hoy)).attr('x2', x(hoy)).attr('y1', 8).attr('y2', H - 24).style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '4 3');
    svg.append('text').attr('class', 'va-axlab').attr('x', x(hoy) + 4).attr('y', 16).text('hoy');
    var t = tip(box), lane = {};
    var pts = vs.map(function (v) { var d = new Date(v.vence + 'T12:00:00Z'), k = d3.utcWeek.floor(d).toISOString(); lane[k] = (lane[k] || 0) + 1; return { v: v, d: d, n: lane[k] - 1 }; });
    svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', function (p) { return x(p.d); }).attr('cy', function (p) { return H - 36 - p.n * 14; }).attr('r', 6)
      .style('fill', function (p) { return p.v.estado === 'vencido' ? 'var(--cds-chart-status-critical)' : p.v.estado === 'por vencer' ? 'var(--color-warn)' : dash.colors[0]; })
      .on('pointerenter pointermove', function (e2, p) { showTip(t, el, e2, p.v.entidad + (p.v.patente ? ' ' + p.v.patente : '') + ' · ' + p.v.documento + ' · ' + fechaCL(p.v.vence) + ' · ' + p.v.estado); })
      .on('pointerleave', function () { t.attr('hidden', ''); });
    svg.append('g').selectAll('text').data(pts.filter(function (p) { return p.v.dias <= 30; })).join('text').attr('class', 'va-lab').attr('x', function (p) { return x(p.d) + 9; }).attr('y', function (p) { return H - 32 - p.n * 14; }).text(function (p) { return p.v.entidad; });
  });

  dash.draw('va_causa', function (el) {
    if (!listo(el, ['c_pagos'])) return;
    var ps = filas('c_pagos').filter(function (p) { return p.diferencia > 0; });
    if (!ps.length) { el.textContent = ''; return; }
    var actos = ps.map(function (p) { return p.actoEsperado; }).filter(function (a, i, x) { return a && x.indexOf(a) === i; });
    el.textContent = ' Corresponde a ' + ps.map(function (p) { return mesTxt(p.periodo); }).join(', ') + ', meses en que rige el ' + actos.join(' y ') + ' pero se tramitó un valor menor.';
  });

  // ---------- al pie: pendientes ----------
  dash.draw('va_pend', function (el) {
    if (!listo(el, ['c_pendientes'])) return;
    el.replaceChildren.apply(el, filas('c_pendientes').map(function (r) {
      return h('tr', { 'data-key': encodeURIComponent(r.clave) }, [h('td', { text: r.tipo }), h('td', { text: r.entidad || '—' }), h('td', null, [h('div', { text: r.descripcion || '' }), r.falta ? h('div', { cls: 'va-muted', text: r.falta }) : null]), h('td', { cls: 'va-num', text: fechaCL(r.plazo) || '—' }), h('td', { text: r.unidad || 'No consta' }), h('td', null, [r.enlace ? h('a', { href: r.enlace, target: '_blank', rel: 'noopener', text: 'Abrir' }) : h('span', { cls: 'va-muted', text: 'Sin respaldo' })])]);
    }));
  });
})();
