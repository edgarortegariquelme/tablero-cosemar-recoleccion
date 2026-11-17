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

