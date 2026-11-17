/* Tablero Cosemar Recolección · lógica de página. El cálculo de estados, plazos y montos lo hace window.Motor (motor.js),
   el mismo código que corre en los nodos de n8n. */
(function () {
  var M = window.Motor;
  var SECCIONES = ['portada', 'sanciones', 'pagos', 'vencimientos', 'obligaciones', 'flujos', 'pendientes'];
  window.CosemarUI = window.CosemarUI || {};
  var UI = window.CosemarUI;

  // ---------- utilidades de dibujo (solo se usan dentro de drawings) ----------
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { var v = attrs[k]; if (v == null || v === false) return; if (k === 'text') e.textContent = v; else if (k === 'cls') e.className = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); });
    (kids || []).forEach(function (k) { if (k == null) return; e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return e;
  }
  function enlace(url, texto) { return url ? h('a', { href: url, target: '_blank', rel: 'noopener', cls: 'cz-link', text: texto || 'Abrir respaldo' }) : h('span', { cls: 'cz-muted', text: 'Sin respaldo' }); }
  function chip(t, tipo) { return h('span', { cls: 'cz-chip cz-' + (tipo || 'n'), text: t }); }
  function clp(v) { return v == null ? null : '$' + M.fmt(v); }
  function monto(v, u) { if (v == null) return null; return u === 'CLP' ? clp(v) : (u === 'UF' ? 'UF ' + String(v).replace('.', ',') : v + ' ' + (u || '')); }
  function vacio(el, texto) { el.replaceChildren(h('span', { cls: 'cz-muted', text: texto || '—' })); }
  function fechaCL(s) { if (!s) return null; var p = s.slice(0, 10).split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function estadoDe(id) { var d = dash.data(id); return d.status; }
  function listo(el, ids) {
    for (var i = 0; i < ids.length; i++) { var st = estadoDe(ids[i]); if (st !== 'ok') { el.classList.toggle('dash-skeleton', st === 'loading'); if (st !== 'loading') vacio(el, st === 'error' ? 'No se pudo cargar' : '—'); return false; } }
    el.classList.remove('dash-skeleton'); return true;
  }
  function filas(id) { var d = dash.data(id); return d.status === 'ok' && Array.isArray(d.data) ? d.data : []; }
  function P() { return dash.params() || {}; }
  function tonoPlazo(e) { return e === 'vencido' ? 'bad' : e === 'en plazo' ? 'ok' : e === 'por verificar' ? 'warn' : 'n'; }
  function tonoVenc(e) { return e === 'vencido' ? 'bad' : e === 'por vencer' ? 'warn' : e === 'vigente' ? 'ok' : 'n'; }
  function tonoVerif(v) { return v === 'Acreditado' ? 'ok' : v === 'Reportado' ? 'info' : v === 'Por verificar' ? 'warn' : 'bad'; }
  UI.ir = function (sec, params) {
    if (params) dash.setParams(params);
    document.querySelectorAll('[data-seccion]').forEach(function (s) { s.hidden = s.getAttribute('data-seccion') !== sec; });
    document.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === sec ? 'true' : 'false'); });
    dash.setLink(sec);
    var top = document.getElementById('cz-top'); if (top && top.scrollIntoView) top.scrollIntoView({ block: 'start' });
  };

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

  // ---------- navegación ----------
  document.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { UI.ir(b.getAttribute('data-tab')); }); });
  document.querySelectorAll('[data-ir]').forEach(function (b) { b.addEventListener('click', function () { var p = b.getAttribute('data-params'); UI.ir(b.getAttribute('data-ir'), p ? JSON.parse(p) : null); }); });
  var hash = (location.hash || '').slice(1); UI.ir(SECCIONES.indexOf(hash) >= 0 ? hash : 'portada');

  // ---------- portada ----------
  function kpi(campo, fmt) { return function (el) { if (!listo(el, ['c_portada'])) return; var r = filas('c_portada')[0]; el.textContent = fmt ? fmt(r[campo], r) : String(r[campo]); }; }
  dash.draw('k_vence', kpi('vencen30')); dash.draw('k_atraso', kpi('atrasados')); dash.draw('k_decision', kpi('decision'));
  dash.draw('k_porverificar', kpi('plazoPorVerificar')); dash.draw('k_monto', kpi('remitidoSinPago', function (v) { return clp(v); }));
  dash.draw('k_meses', kpi('mesesRemitidos')); dash.draw('k_sinmonto', kpi('mesesSinMonto')); dash.draw('k_dif', kpi('diferenciaDecreto', function (v) { return clp(v); }));
  dash.draw('k_revision', kpi('revision')); dash.draw('k_errores', kpi('errores')); dash.draw('k_registros', kpi('registros'));
  dash.draw('k_sync', kpi('ultimaSync', function (v) { return v ? fechaCL(v) : 'sin registro'; }));
  dash.draw('k_syncdet', kpi('ultimaSyncDetalle', function (v) { return v || 'Sin detalle'; }));
  dash.draw('k_hoy', function (el) { el.textContent = fechaCL(hoyCL()); });
  dash.draw('resumen', function (el) {
    if (!listo(el, ['c_portada', 'c_sanciones'])) return; var r = filas('c_portada')[0], s = filas('c_sanciones').filter(function (x) { return !x.cerrada; });
    var t = s.length + ' procesos sancionatorios abiertos' + (r.plazoPorVerificar ? ', ' + r.plazoPorVerificar + ' con plazo por verificar por falta de notificación acreditada' : '') + '; ' +
      r.mesesRemitidos + ' meses remitidos a pago sin pago acreditado' + (r.diferenciaDecreto ? ' y $' + M.fmt(r.diferenciaDecreto) + ' de diferencia entre lo tramitado y el valor decretado' : '') + '.';
    el.textContent = t;
  });
  function filaSancion(s, conFicha) {
    return h('tr', { 'data-key': encodeURIComponent(s.id), cls: 'cz-click', onclick: function () { UI.ir('sanciones', { sancion: s.id }); } }, [
      h('td', null, [h('b', { text: s.id }), h('div', { cls: 'cz-muted', text: s.titulo })]),
      h('td', { text: s.estado }),
      h('td', null, [chip(s.plazoEstado, tonoPlazo(s.plazoEstado)), s.vence ? h('div', { cls: 'cz-num', text: fechaCL(s.vence) + (s.diasHabiles != null ? ' · ' + (s.diasHabiles >= 0 ? s.diasHabiles + ' días hábiles' : Math.abs(s.diasHabiles) + ' días hábiles de atraso') : '') }) : (s.falta ? h('div', { cls: 'cz-muted cz-small', text: s.falta }) : null)]),
      h('td', { text: s.siguiente }), h('td', { text: s.unidad || 'No consta' })
    ]);
  }
  dash.draw('tbl_san_plazo', function (el) { if (!listo(el, ['c_sanciones'])) return; el.replaceChildren.apply(el, filas('c_sanciones').filter(function (s) { return !s.cerrada; }).map(function (s) { return filaSancion(s); })); });

  // ---------- línea de tiempo general con filtros ----------
  function opciones(sel, base, lista, param) { var v = P()[param] || ''; sel.replaceChildren.apply(sel, [new Option(base, '')].concat(lista.map(function (x) { return new Option(x[1] || x[0], x[0]); }))); sel.value = v; sel.onchange = function () { var o = {}; o[param] = sel.value || null; dash.setParams(o); }; }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }).sort(); }
  dash.draw('f_periodo', function (sel) { var ev = filas('c_eventos'); opciones(sel, 'Todos los meses', uniq(ev.map(function (e) { return e.fecha && e.fecha.slice(0, 7); })).reverse().map(function (p) { return [p]; }), 'periodo'); });
  dash.draw('f_modulo', function (sel) { opciones(sel, 'Todos los módulos', ['Sanción', 'Hallazgo', 'Pago', 'Reajuste', 'Vencimiento', 'Control', 'Aviso', 'Revisión', 'Error'].map(function (m) { return [m]; }), 'modulo'); });
  dash.draw('f_entidad', function (sel) { var ev = filas('c_eventos'); opciones(sel, 'Todas las entidades', uniq(ev.map(function (e) { return e.entidad; })).map(function (x) { return [x]; }), 'entidad'); });
  dash.draw('f_obligacion', function (sel) { var c = dash.data('catalogo'); opciones(sel, 'Todas las obligaciones', c.status === 'ok' ? c.data.obligaciones.map(function (o) { return [o.id, o.id + ' · ' + o.titulo.slice(0, 48)]; }) : [], 'obligacion'); });
  dash.draw('f_verif', function (sel) { opciones(sel, 'Toda verificación', ['Acreditado', 'Reportado', 'Por verificar', 'En revisión'].map(function (x) { return [x]; }), 'verif'); });
  dash.draw('f_sector', function (sel) { var c = dash.data('catalogo'); var s = c.status === 'ok' ? uniq(Object.keys(c.data.sanciones).map(function (k) { return c.data.sanciones[k].sector; })) : []; opciones(sel, 'Todos los sectores', s.map(function (x) { return [x]; }), 'sector'); });
  dash.draw('f_patente', function (sel) { var ev = filas('c_eventos'); opciones(sel, 'Todas las patentes', uniq(ev.map(function (e) { return e.patente; })).map(function (x) { return [x]; }), 'patente'); });
  function filtrados() {
    var p = P(), ev = filas('c_eventos'), c = dash.data('catalogo'), sec = c.status === 'ok' ? c.data.sanciones : {};
    return ev.filter(function (e) {
      if (e.modulo === 'Sistema') return false;
      if (p.periodo && !(e.fecha && e.fecha.slice(0, 7) === p.periodo) && e.entidad !== p.periodo) return false;
      if (p.modulo && e.modulo !== p.modulo) return false;
      if (p.entidad && e.entidad !== p.entidad) return false;
      if (p.obligacion && (e.obligacion || '').split(',').map(function (s) { return s.trim(); }).indexOf(p.obligacion) < 0) return false;
      if (p.verif && e.verificacion !== p.verif) return false;
      if (p.patente && e.patente !== p.patente) return false;
      if (p.sector && (e.sector || (sec[e.entidad] && sec[e.entidad].sector)) !== p.sector) return false;
      if (p.historial !== 'si' && !e.vigente) return false;
      if (e.modulo === 'Vencimiento' && p.modulo !== 'Vencimiento' && e.fecha && e.fecha > hoyCL()) return false;
      return true;
    }).sort(function (a, b) { return (b.fecha || '') < (a.fecha || '') ? -1 : 1; });
  }
  dash.draw('tl_contador', function (el) { if (!listo(el, ['c_eventos'])) return; el.textContent = String(filtrados().length); });
  dash.draw('timeline', function (el) {
    if (!listo(el, ['c_eventos', 'catalogo'])) return;
    var ev = filtrados().filter(function (e) { return e.fecha; }), w = Math.max(320, el.clientWidth || 600), mods = ['Sanción', 'Pago', 'Vencimiento', 'Reajuste', 'Control', 'Revisión', 'Error', 'Aviso'].filter(function (m) { return ev.some(function (e) { return e.modulo === m; }); });
    el.replaceChildren(); if (!ev.length) { vacio(el, 'Sin registros con fecha para estos filtros'); return; }
    var lm = 92, rH = 26, H = mods.length * rH + 34, dom = d3.extent(ev, function (e) { return new Date(e.fecha + 'T12:00:00Z'); });
    if (+dom[0] === +dom[1]) dom = [d3.utcDay.offset(dom[0], -15), d3.utcDay.offset(dom[1], 15)];
    var x = d3.scaleUtc().domain(dom).range([lm, w - 14]).nice(), y = function (m) { return 10 + mods.indexOf(m) * rH + rH / 2; };
    var box = d3.select(el).append('div').attr('class', 'cz-chartbox');
    var svg = box.append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img').attr('aria-label', 'Línea de tiempo de ' + ev.length + ' registros por módulo');
    svg.append('g').attr('transform', 'translate(0,' + (H - 22) + ')').attr('class', 'cz-axis').call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(w / 110))).tickFormat(function (d) { return ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2); }));
    svg.append('g').selectAll('line').data(mods).join('line').attr('x1', lm).attr('x2', w - 14).attr('y1', y).attr('y2', y).style('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(mods).join('text').attr('x', 0).attr('y', function (m) { return y(m) + 4; }).text(function (m) { return m; }).attr('class', 'cz-axlab');
    var tip = box.append('div').attr('class', 'cz-tip').attr('hidden', '');
    var col = { 'Sanción': 0, 'Pago': 1, 'Vencimiento': 2, 'Reajuste': 3, 'Control': 4, 'Revisión': 5, 'Error': 6, 'Aviso': 7 };
    svg.append('g').selectAll('circle').data(ev).join('circle').attr('cx', function (e) { return x(new Date(e.fecha + 'T12:00:00Z')); }).attr('cy', function (e) { return y(e.modulo); }).attr('r', 5)
      .style('fill', function (e) { return dash.colors[col[e.modulo] % dash.colors.length]; }).style('opacity', function (e) { return e.verificacion === 'Por verificar' ? 0.45 : 0.9; }).style('cursor', 'pointer')
      .on('pointerenter', function (event, e) { var r = el.getBoundingClientRect(); tip.attr('hidden', null).style('left', Math.min(event.clientX - r.left + 8, w - 230) + 'px').style('top', (event.clientY - r.top + 10) + 'px').text(fechaCL(e.fecha) + ' · ' + e.entidad + ' · ' + (e.documento || e.hito)); })
      .on('pointerleave', function () { tip.attr('hidden', ''); })
      .on('click', function (event, e) { dash.setParams({ entidad: e.entidad }); });
  });
  dash.draw('tl_lista', function (el) {
    if (!listo(el, ['c_eventos'])) return; var ev = filtrados().slice(0, 150);
    if (!ev.length) { el.replaceChildren(h('tr', null, [h('td', { colspan: '6', cls: 'cz-muted', text: 'Sin registros para estos filtros' })])); return; }
    el.replaceChildren.apply(el, ev.map(function (e) {
      return h('tr', { cls: e.vigente ? '' : 'cz-hist' }, [h('td', { cls: 'cz-num', text: fechaCL(e.fecha) || 'Sin fecha' }), h('td', null, [chip(e.modulo, 'n')]),
        h('td', null, [h('button', { cls: 'cz-linkbtn', text: e.entidad || '—', onclick: function () { dash.setParams({ entidad: e.entidad }); } })]),
        h('td', null, [h('div', { text: e.documento || e.hito }), h('div', { cls: 'cz-muted cz-small', text: (M.H_SAN[e.hito] ? M.H_SAN[e.hito].nombre : M.H_PAGO[e.hito] ? M.H_PAGO[e.hito].nombre : e.hito) + (e.vigente ? '' : ' · versión ' + e.version + ' reemplazada') + (e.monto != null ? ' · ' + monto(e.monto, e.unidadMonto) : '') })]),
        h('td', null, [chip(e.verificacion, tonoVerif(e.verificacion)), h('div', { cls: 'cz-muted cz-small', text: e.fechaTipo })]), h('td', null, [enlace(e.respaldo), ' ', enlace(e.url, 'Fila en Notion')])]);
    }));
  });
  dash.draw('tl_activos', function (el) {
    var p = P(), keys = ['periodo', 'modulo', 'entidad', 'obligacion', 'verif', 'sector', 'patente'].filter(function (k) { return p[k]; });
    el.replaceChildren.apply(el, keys.map(function (k) { return h('button', { cls: 'cz-chip cz-info cz-x', text: p[k] + ' ×', onclick: function () { var o = {}; o[k] = null; dash.setParams(o); } }); }));
  });

  // ---------- sanciones: lista y ficha ----------
  dash.draw('san_lista', function (el) { if (!listo(el, ['c_sanciones'])) return; el.replaceChildren.apply(el, filas('c_sanciones').map(function (s) { var tr = filaSancion(s); if (P().sancion === s.id) tr.classList.add('cz-sel'); return tr; })); });
  dash.draw('san_ficha', function (el) {
    if (!listo(el, ['c_sanciones', 'c_eventos', 'catalogo'])) return;
    var S = filas('c_sanciones'), id = P().sancion || (S.filter(function (s) { return !s.cerrada; })[0] || S[0] || {}).id, s = S.filter(function (x) { return x.id === id; })[0];
    if (!s) { vacio(el, 'Elija un proceso en la lista'); return; }
    var c = dash.data('catalogo').data, ob = c.obligaciones.filter(function (o) { return o.id === s.obligacion; })[0] || {};
    var evs = filas('c_eventos').filter(function (e) { return e.modulo === 'Sanción' && e.entidad === s.id; }).sort(function (a, b) { return (a.fecha || '9') < (b.fecha || '9') ? -1 : 1; });
    function dato(et, val, extra) { return h('div', { cls: 'cz-dato' }, [h('div', { cls: 'cz-et', text: et }), h('div', { cls: 'cz-val', text: val == null ? 'Sin antecedentes' : val }), extra || null]); }
    var mU = function (v, u) { return v == null ? null : monto(v, u); };
    el.replaceChildren(
      h('div', { cls: 'cz-fhead' }, [h('h3', { text: s.id + ' · ' + s.titulo }), h('div', { cls: 'cz-row' }, [chip(s.cerrada ? 'Cerrado' : 'Abierto', s.cerrada ? 'n' : 'warn'), chip('Plazo ' + s.plazoEstado, tonoPlazo(s.plazoEstado)), s.patente ? chip('Patente ' + s.patente, 'n') : null, s.sector ? chip(s.sector, 'n') : null])]),
      h('div', { cls: 'cz-grid4' }, [
        dato('Último estado acreditado', s.estado, h('div', { cls: 'cz-small' }, [fechaCL(s.ultimaFecha) ? (fechaCL(s.ultimaFecha) + ' · ' + (s.ultimaFechaTipo || '')) + ' · ' : '', enlace(s.ultimoRespaldo, 'Evidencia')])),
        dato('Notificación', s.notificacion ? fechaCL(s.notificacion) : (s.cerrada ? 'No aplica' : 'Sin antecedentes'), s.notificacionTipo ? h('div', { cls: 'cz-small cz-muted', text: s.notificacionTipo }) : null),
        dato('Plazo', s.vence ? fechaCL(s.vence) + ' · ' + (s.diasHabiles >= 0 ? s.diasHabiles + ' días hábiles restantes' : Math.abs(s.diasHabiles) + ' días hábiles de atraso') : (s.plazoEstado === 'no aplica' ? 'No aplica' : 'Plazo por verificar'), h('div', { cls: 'cz-small cz-muted', text: s.plazoRegla + (s.falta ? ' · ' + s.falta : '') })),
        dato('Siguiente acción', s.siguiente, h('div', { cls: 'cz-small cz-muted', text: 'A cargo: ' + (s.unidad || 'No consta') }))
      ]),
      h('div', { cls: 'cz-grid4' }, [dato('Propuesto', mU(s.propuesto, s.propuestoUnidad)), dato('Decretado', mU(s.decretado, s.decretadoUnidad)), dato('Derivado a cobro', mU(s.derivado, 'CLP')),
        dato('Cobrado o descontado', s.cobrado != null ? mU(s.cobrado, s.cobradoUnidad) : (s.cerrada && s.decretado == null ? 'No aplica' : 'Sin antecedentes'), s.cobradoRespaldo ? h('div', { cls: 'cz-small' }, [enlace(s.cobradoRespaldo, 'Estado de pago')]) : null)]),
      h('p', { cls: 'cz-small' }, [h('b', { text: 'Obligación: ' }), h('button', { cls: 'cz-linkbtn', text: (ob.id || '—') + ' · ' + (ob.titulo || ''), onclick: function () { UI.ir('obligaciones', { obligacion: ob.id }); } }), ' · ' + (ob.clausula || '') + (ob.pagina ? ', p. ' + ob.pagina : '')]),
      h('h4', { text: 'Línea de tiempo del proceso (' + evs.length + ' hitos)' }),
      h('ol', { cls: 'cz-tl' }, evs.map(function (e) {
        var hn = M.H_SAN[e.hito] ? M.H_SAN[e.hito].nombre : e.hito, sinR = !(e.respaldo || e.documento) || e.verificacion === 'Por verificar';
        return h('li', { cls: (e.vigente ? '' : 'cz-hist ') + (sinR ? 'cz-pend' : '') }, [h('div', { cls: 'cz-num cz-small', text: (fechaCL(e.fecha) || 'Sin fecha') + ' · ' + (e.fechaTipo || '') }), h('div', null, [h('b', { text: hn }), e.monto != null ? ' · ' + monto(e.monto, e.unidadMonto) : '', sinR ? ' · ' : '', sinR ? chip('no avanza el estado', 'warn') : null]),
          h('div', { cls: 'cz-small' }, [e.documento || '', ' · ', enlace(e.respaldo), ' · ', enlace(e.url, 'Fila en Notion')]), e.detalle ? h('div', { cls: 'cz-small cz-muted', text: e.detalle }) : null]);
      }))
    );
  });

  // ---------- pagos ----------
  dash.draw('pag_sel', function (sel) { var ps = filas('c_pagos').map(function (p) { return p.periodo; }).reverse(); var v = P().pago || ps.filter(function (x) { return !/AJUSTE/.test(x); })[0] || ''; sel.replaceChildren.apply(sel, ps.map(function (x) { return new Option(/AJUSTE/.test(x) ? 'Ajuste retroactivo D.A. 2.459' : x, x); })); sel.value = v; sel.onchange = function () { dash.setParams({ pago: sel.value }); }; });
  function pagoSel() { var ps = filas('c_pagos'); var id = P().pago || (ps.filter(function (x) { return !x.ajuste; }).slice(-1)[0] || {}).periodo; return ps.filter(function (p) { return p.periodo === id; })[0]; }
  dash.draw('pag_cadena', function (el) {
    if (!listo(el, ['c_pagos', 'c_eventos'])) return; var p = pagoSel(); if (!p) { vacio(el, 'Sin antecedentes'); return; }
    var evs = filas('c_eventos').filter(function (e) { return e.modulo === 'Pago' && e.entidad === p.periodo; });
    var sanAbiertas = filas('c_sanciones').filter(function (s) { return !s.cerrada; }).length;
    el.replaceChildren(h('ol', { cls: 'cz-chain' }, M.HITOS_PAGO.map(function (hp) {
      var es = evs.filter(function (e) { return e.hito === hp.id; }), vig = es.filter(function (e) { return e.vigente; }), ok = vig.some(function (e) { return e.verificacion !== 'Por verificar' && (e.respaldo || e.documento); });
      return h('li', { cls: ok ? 'cz-okstep' : vig.length ? 'cz-warnstep' : 'cz-nostep' }, [h('div', null, [h('b', { text: hp.nombre }), ' ', chip(ok ? 'acreditado' : vig.length ? 'por verificar' : 'sin antecedentes', ok ? 'ok' : vig.length ? 'warn' : 'n')]),
        h('div', { cls: 'cz-small cz-muted', text: 'A cargo: ' + hp.unidad + (hp.id === 'revision_sanciones' && !vig.length ? ' · hay ' + sanAbiertas + ' procesos abiertos que revisar antes de derivar' : '') })].concat(es.map(function (e) {
          return h('div', { cls: 'cz-small' + (e.vigente ? '' : ' cz-hist') }, [(fechaCL(e.fecha) || 'Sin fecha') + ' (' + (e.fechaTipo || '') + ') · ' + (e.numero ? 'N° ' + e.numero + ' · ' : '') + (e.documento || '') + (e.monto != null ? ' · ' + monto(e.monto, e.unidadMonto) : '') + (e.vigente ? '' : ' · versión ' + e.version + ' reemplazada') + ' · ', enlace(e.respaldo), e.detalle ? h('div', { cls: 'cz-muted', text: e.detalle }) : null]);
        })));
    })), h('div', { cls: 'cz-small' }, evs.filter(function (e) { return e.hito === 'diferencia' && e.vigente; }).map(function (e) { return h('div', { cls: 'cz-alert' }, ['Diferencia documental: ' + e.detalle + ' · ', enlace(e.respaldo)]); })));
  });
  function pm(campo, nulo) { return function (el) { if (!listo(el, ['c_pagos'])) return; var p = pagoSel(); el.textContent = !p ? '—' : p[campo] == null ? (nulo || 'Sin antecedentes') : clp(p[campo]); if (p) { el.setAttribute('data-where', 'periodo=' + encodeURIComponent(p.periodo)); } }; }
  dash.draw('pm_esperado', pm('esperado', 'Sin precio vigente cargado')); dash.draw('pm_oc', pm('solicitadoOC')); dash.draw('pm_fact', pm('facturado')); dash.draw('pm_rem', pm('remitido')); dash.draw('pm_pag', pm('pagado', 'Sin pago acreditado'));
  dash.draw('pm_acto', function (el) { var p = pagoSel(); el.textContent = p ? (p.actoEsperado ? 'Valor del ' + p.actoEsperado + (p.enEjecucion != null && p.enEjecucion !== p.esperado ? '; en ejecución: $' + M.fmt(p.enEjecucion) : '') : (p.ajuste ? 'Ajuste: se controla aparte de las mensualidades' : 'Sin decreto de precio cargado para el mes')) : '—'; });
  dash.draw('pm_obs', function (el) { var p = pagoSel(); el.textContent = p ? (p.observaciones || 'Sin diferencias registradas') + ' · Último hito: ' + (p.ultimoHito || 'ninguno') + ' · Siguiente: ' + (p.siguiente || '—') + ' (' + (p.siguienteUnidad || 'No consta') + ')' : '—'; });
  dash.draw('pag_tabla', function (el) {
    if (!listo(el, ['c_pagos'])) return;
    el.replaceChildren.apply(el, filas('c_pagos').slice().reverse().map(function (p) {
      var c = function (v) { return h('td', { cls: 'cz-num', text: v == null ? 'Sin antecedentes' : clp(v) }); };
      return h('tr', { 'data-key': encodeURIComponent(p.periodo), cls: 'cz-click' + (P().pago === p.periodo ? ' cz-sel' : ''), onclick: function () { dash.setParams({ pago: p.periodo }); } }, [h('td', { text: p.ajuste ? 'Ajuste D.A. 2.459' : p.periodo }), h('td', { text: p.estado }), c(p.esperado), c(p.solicitadoOC), c(p.facturado), c(p.remitido), c(p.pagado), h('td', { cls: 'cz-num ' + (p.diferencia ? 'cz-badtext' : ''), text: p.diferencia ? clp(p.diferencia) : '0' })]);
    }));
  });
  dash.draw('rea_tabla', function (el) {
    if (!listo(el, ['c_eventos'])) return;
    el.replaceChildren.apply(el, filas('c_eventos').filter(function (e) { return e.modulo === 'Reajuste' && e.vigente; }).map(function (e) { return h('tr', null, [h('td', { text: e.documento }), h('td', { cls: 'cz-num', text: e.monto != null ? monto(e.monto, e.unidadMonto) + '/mes' : 'Sin monto' }), h('td', { cls: 'cz-small', text: e.detalle }), h('td', null, [enlace(e.respaldo, 'Trámite en Notion')])]); }));
  });

  // ---------- vencimientos ----------
  dash.draw('v_patente', function (sel) { var vs = filas('c_vencimientos'); opciones(sel, 'Todas las patentes', uniq(vs.map(function (v) { return v.patente; })).map(function (x) { return [x]; }), 'patente'); });
  document.querySelectorAll('[data-vgrupo]').forEach(function (s) { s.addEventListener('change', function () { dash.setParams({ vgrupo: s.value || null }); }); });
  dash.draw('ven_tabla', function (el) {
    if (!listo(el, ['c_vencimientos'])) return; var p = P();
    var vs = filas('c_vencimientos').filter(function (v) { return (!p.vgrupo || v.grupo === p.vgrupo) && (!p.patente || v.patente === p.patente); });
    el.replaceChildren.apply(el, vs.map(function (v) {
      return h('tr', { 'data-key': encodeURIComponent(v.clave) }, [h('td', null, [h('b', { text: v.entidad }), v.patente ? h('div', { cls: 'cz-muted cz-small', text: v.patente }) : null]), h('td', { text: v.documento }),
        h('td', { cls: 'cz-num', text: fechaCL(v.vence) || 'Sin antecedentes' }), h('td', null, [chip(v.estado + (v.dias == null ? '' : v.dias < 0 ? ' · ' + Math.abs(v.dias) + (v.dias === -1 ? ' día' : ' días') + ' de atraso' : v.dias === 0 ? ' · vence hoy' : ' · faltan ' + v.dias + (v.dias === 1 ? ' día' : ' días')), tonoVenc(v.estado))]),
        h('td', { cls: 'cz-num', text: v.capital != null ? monto(v.capital, v.unidad) : '' }), h('td', null, [chip(v.verificacion, tonoVerif(v.verificacion)), v.detalle ? h('div', { cls: 'cz-small cz-muted', text: v.detalle }) : null]), h('td', null, [enlace(v.respaldo)])]);
    }));
  });

  // ---------- obligaciones ----------
  document.querySelectorAll('[data-ocob]').forEach(function (s) { s.addEventListener('change', function () { dash.setParams({ ocob: s.value || null }); }); });
  dash.draw('obl_tabla', function (el) {
    if (!listo(el, ['c_obligaciones'])) return; var p = P();
    el.replaceChildren.apply(el, filas('c_obligaciones').filter(function (o) { return !p.ocob || o.cobertura === p.ocob; }).map(function (o) {
      return h('tr', { 'data-key': o.id, cls: 'cz-click' + (p.obligacion === o.id ? ' cz-sel' : ''), onclick: function () { dash.setParams({ obligacion: o.id }); var f = document.getElementById('obl-ficha'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'start' }); } }, [
        h('td', null, [h('b', { text: o.id }), h('div', { text: o.titulo })]), h('td', { text: o.clausula + ' · p. ' + o.pagina }), h('td', { text: o.frecuencia + ' · ' + o.plazo }),
        h('td', { cls: 'cz-small', text: o.exigenciaVigente ? o.exigenciaVigente + (o.actoVigente ? ' (' + o.actoVigente + ')' : '') : o.criterio }), h('td', { cls: 'cz-num', text: String(o.registros) }),
        h('td', null, [chip(o.cobertura, o.cobertura === 'Fiscalizable desde el tablero' ? 'ok' : o.cobertura === 'Pendiente de respaldo' ? 'warn' : 'bad')])]);
    }));
  });
  dash.draw('obl_ficha', function (el) {
    if (!listo(el, ['catalogo', 'c_eventos', 'c_sanciones'])) return; var id = P().obligacion, c = dash.data('catalogo').data, o = c.obligaciones.filter(function (x) { return x.id === id; })[0];
    if (!o) { vacio(el, 'Elija una obligación en la matriz para ver sus controles, hallazgos y sanciones'); return; }
    var evs = filas('c_eventos').filter(function (e) { return (e.obligacion || '').split(',').map(function (s) { return s.trim(); }).indexOf(id) >= 0 && e.vigente; });
    var g = function (mods) { return evs.filter(function (e) { return mods.indexOf(e.modulo) >= 0; }); };
    var sans = filas('c_sanciones').filter(function (s) { return s.obligacion === id; });
    var lista = function (t, xs, fn) { return h('div', { cls: 'cz-col' }, [h('h4', { text: t + ' (' + xs.length + ')' }), xs.length ? h('ul', { cls: 'cz-ul' }, xs.slice(0, 40).map(fn)) : h('p', { cls: 'cz-muted', text: 'Sin antecedentes' })]); };
    var item = function (e) { return h('li', null, [(fechaCL(e.fecha) || 'Sin fecha') + ' · ' + (e.entidad || '') + ' · ' + (e.documento || e.hito) + ' · ', enlace(e.respaldo)]); };
    el.replaceChildren(h('h3', { text: o.id + ' · ' + o.titulo }),
      h('dl', { cls: 'cz-dl' }, [['Cláusula y página', o.clausula + ', p. ' + o.pagina + ' · ' + (c.fuentes[o.fuente] || {}).n], ['Frecuencia', o.frecuencia], ['Plazo', o.plazo], ['Evidencia exigida', o.evidencia], ['Criterio de cumplimiento', o.criterio], ['Acción ante una observación', o.accion], ['Nota', o.nota || '—']].reduce(function (a, kv) { return a.concat([h('dt', { text: kv[0] }), h('dd', { text: kv[1] })]); }, [])),
      h('p', null, [enlace((c.fuentes[o.fuente] || {}).u, 'Abrir ' + ((c.fuentes[o.fuente] || {}).n || 'fuente'))]),
      h('h4', { text: 'Exigencia aplicable por período' }),
      h('table', { cls: 'cz-tbl' }, [h('thead', null, [h('tr', null, [h('th', { text: 'Desde' }), h('th', { text: 'Hasta' }), h('th', { text: 'Exigencia' }), h('th', { text: 'Acto' })])]), h('tbody', null, (o.vigencias || []).map(function (v) { return h('tr', null, [h('td', { text: fechaCL(v.desde) || v.desde }), h('td', { text: v.hasta ? fechaCL(v.hasta) : 'vigente' }), h('td', { text: v.exigencia }), h('td', { text: v.acto || '—' })]); }))]),
      h('div', { cls: 'cz-cols' }, [lista('Controles', g(['Control', 'Vencimiento', 'Pago', 'Reajuste']), item), lista('Hallazgos', g(['Hallazgo']), item),
        lista('Sanciones', sans, function (s) { return h('li', null, [h('button', { cls: 'cz-linkbtn', text: s.id + ' · ' + s.estado, onclick: function () { UI.ir('sanciones', { sancion: s.id }); } })]); })]),
      h('p', null, [h('button', { cls: 'cz-btn', text: 'Ver en la línea de tiempo', onclick: function () { UI.ir('portada', { obligacion: id }); } })]));
  });

  // ---------- flujogramas ----------
  dash.draw('flujos', function (el) {
    if (!listo(el, ['catalogo', 'c_eventos', 'c_sanciones', 'c_pagos'])) return;
    var c = dash.data('catalogo').data, ev = filas('c_eventos').filter(function (e) { return e.vigente; }), S = filas('c_sanciones'), Pg = filas('c_pagos'), p = P();
    var pago = Pg.filter(function (x) { return x.periodo === p.pago; })[0] || Pg.filter(function (x) { return !x.ajuste; }).slice(-1)[0], san = S.filter(function (x) { return x.id === p.sancion; })[0];
    function cuenta(fl, paso) {
      if (fl === 'sancion') { var ids = S.filter(function (s) { return !s.cerrada && ev.some(function (e) { return e.modulo === 'Sanción' && e.entidad === s.id && e.hito === paso.hito; }) && M.H_SAN[paso.hito] && s.estado === M.H_SAN[paso.hito].nombre; }); return ids; }
      return [];
    }
    function hecho(fl, paso) {
      if (fl === 'pago' && pago) return ev.some(function (e) { return e.modulo === 'Pago' && e.entidad === pago.periodo && e.hito === paso.hito && e.verificacion !== 'Por verificar'; });
      if (fl === 'sancion' && san) return ev.some(function (e) { return e.modulo === 'Sanción' && e.entidad === san.id && e.hito === paso.hito && e.verificacion !== 'Por verificar'; });
      return false;
    }
    el.replaceChildren.apply(el, c.flujos.map(function (f) {
      var ctx = f.id === 'pago' ? (pago ? 'Mes de servicio: ' + pago.periodo + ' · ' + pago.estado : '') : f.id === 'sancion' ? (san ? 'Proceso: ' + san.id + ' · ' + san.estado : 'Elija un proceso para marcar su recorrido; los números indican cuántos procesos abiertos están en cada paso') : 'Cada paso abre su módulo filtrado';
      return h('section', { cls: 'cz-flow', id: 'flujo-' + f.id }, [h('h3', { text: f.titulo }), h('p', { cls: 'cz-small cz-muted', text: ctx }),
        h('div', { cls: 'cz-ramas' }, f.ramas.map(function (r) {
          return h('div', { cls: 'cz-rama' }, [h('div', { cls: 'cz-et', text: r.nombre }), h('ol', { cls: 'cz-pasos' }, r.pasos.map(function (paso) {
            var n = cuenta(f.id, paso), ok = hecho(f.id, paso);
            return h('li', null, [h('button', { cls: 'cz-paso' + (ok ? ' cz-hecho' : '') + (n.length ? ' cz-activo' : ''), onclick: function () {
              if (f.id === 'pago') UI.ir('pagos', pago ? { pago: pago.periodo } : null);
              else if (f.id === 'sancion') { if (n.length) UI.ir('sanciones', { sancion: n[0].id }); else UI.ir('portada', { modulo: 'Sanción', entidad: san ? san.id : null }); }
              else if (paso.vista === 'vencimientos') UI.ir('vencimientos', { vgrupo: paso.filtro.entidad === 'GAR-FC' ? 'Garantía' : paso.filtro.entidad === 'SEG-RC' ? 'Seguro' : paso.filtro.grupo === 'flota' ? 'Flota' : null });
              else if (paso.vista === 'obligaciones') UI.ir('obligaciones', { obligacion: paso.obl || null });
              else if (paso.vista === 'sanciones') UI.ir('sanciones');
              else UI.ir('portada', { modulo: 'Control' });
            } }, [h('span', { cls: 'cz-pt', text: paso.t }), paso.d ? h('span', { cls: 'cz-pd', text: paso.d }) : null, n.length ? h('span', { cls: 'cz-badge', text: n.map(function (x) { return x.id; }).join(', ') }) : null, ok ? h('span', { cls: 'cz-badge cz-okb', text: 'acreditado' }) : null])]);
          }))]);
        }))]);
    }));
  });
  dash.draw('flujo_sel', function (sel) { var S = filas('c_sanciones'); sel.replaceChildren.apply(sel, [new Option('Proceso sancionatorio: ninguno', '')].concat(S.map(function (s) { return new Option(s.id + ' · ' + s.estado, s.id); }))); sel.value = P().sancion || ''; sel.onchange = function () { dash.setParams({ sancion: sel.value || null }); }; });
  dash.draw('flujo_pago', function (sel) { var ps = filas('c_pagos'); sel.replaceChildren.apply(sel, ps.slice().reverse().map(function (x) { return new Option('Pago · ' + (x.ajuste ? 'Ajuste D.A. 2.459' : x.periodo), x.periodo); })); sel.value = P().pago || (ps.filter(function (x) { return !x.ajuste; }).slice(-1)[0] || {}).periodo || ''; sel.onchange = function () { dash.setParams({ pago: sel.value }); }; });

  // ---------- pendientes ----------
  document.querySelectorAll('[data-ptipo]').forEach(function (s) { s.addEventListener('change', function () { dash.setParams({ ptipo: s.value || null }); }); });
  dash.draw('pend_tabla', function (el) {
    if (!listo(el, ['c_pendientes'])) return; var t = P().ptipo;
    el.replaceChildren.apply(el, filas('c_pendientes').filter(function (r) { return !t || r.tipo === t; }).map(function (r) {
      return h('tr', { 'data-key': encodeURIComponent(r.clave) }, [h('td', null, [chip(r.tipo, r.tipo === 'Error' ? 'bad' : r.tipo === 'Sanción' ? 'warn' : 'n')]), h('td', { text: r.entidad || '—' }), h('td', null, [h('div', { text: r.descripcion || '' }), r.falta ? h('div', { cls: 'cz-small cz-muted', text: r.falta }) : null]), h('td', { cls: 'cz-num', text: fechaCL(r.plazo) || '—' }), h('td', { text: r.estado || '' }), h('td', { text: r.unidad || 'No consta' }), h('td', null, [enlace(r.enlace)])]);
    }));
  });
})();
