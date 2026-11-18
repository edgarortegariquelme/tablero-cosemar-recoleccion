/* Tablero Cosemar · pestañas Operación, Multas, Manifolds, Correos, Flota, Personal y Bono SUBDERE.
   Regla de un solo escritor: cada función escribe solo dentro de su elemento data-draw. */
(function () {
  var M = window.Motor;
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { var v = attrs[k]; if (v == null || v === false) return; if (k === 'text') e.textContent = v; else if (k === 'cls') e.className = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); });
    (kids || []).forEach(function (k) { if (k == null || k === false) return; e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return e;
  }
  function clp(v) { return v == null ? '—' : '$' + M.fmt(v); }
  function mill(v) { return v == null ? '—' : '$' + (Math.abs(v) >= 1e9 ? M.fmt(Math.round(v / 1e6)) : (v / 1e6).toFixed(1).replace('.', ',')) + ' M'; }
  function fCL(s) { if (!s) return '—'; var p = s.slice(0, 10).split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function filas(id) { var d = dash.data(id); return d.status === 'ok' && Array.isArray(d.data) ? d.data : []; }
  function listo(el, ids) {
    for (var i = 0; i < ids.length; i++) { var st = dash.data(ids[i]).status; if (st !== 'ok') { el.classList.toggle('dash-skeleton', st === 'loading'); if (st !== 'loading') el.replaceChildren(h('span', { cls: 'va-muted', text: st === 'error' ? 'No se pudo cargar' : '—' })); return false; } }
    el.classList.remove('dash-skeleton'); return true;
  }
  function hoyCL() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()); }
  var MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function mesL(p) { return MESL[+p.slice(5, 7) - 1] + ' de ' + p.slice(0, 4); }
  function sig(p, n) { var y = +p.slice(0, 4), m = +p.slice(5, 7) + (n == null ? 1 : n); while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y + '-' + (m < 10 ? '0' : '') + m; }
  function dc(a, b) { return M.diasCorridos(a, b); }
  function pct(v) { return (Math.round(v * 1000) / 10).toLocaleString('es-CL') + '%'; }
  function chip(txt, k) { return h('span', { cls: 'va-chip' + (k ? ' va-chip-' + k : ''), text: txt }); }
  var NOMBRE = { rec: 'Recolección', df: 'Disposición final' };
  // Reglas del ciclo mensual (Edgar, 18-11-2026): Cosemar informa del 1 al 5; la OC se genera en 7 días como máximo; factura del 15 al 20; pago a 30 días de la factura.
  var R = { infoHasta: 5, ocDias: 7, facDesde: 15, facHasta: 20, pagoDias: 30 };
  var BASES = { rec: { ref: 260000000 * 60, refMin: 250000000 * 60, meses: 60, inicio: '2024-07', txt: 'Bases art. 36: entre $250 y $260 millones al mes como referencia, por 5 años (art. 82).' },
    df: { ref: 5200000000, meses: 60, inicio: '2025-01', txt: 'Bases art. 37: $5.200 millones por 5 años.' } };

  // ---------- cálculos ----------
  dash.calc('c_ciclo', {
    inputs: ['c_eventos', 'pagos_contrato', 'df_pagos', 'ciclo_fechas'], title: 'Ciclo de pago de cada mes de servicio',
    description: 'Para cada contrato y mes de servicio desde enero de 2026: documentos de los 11 pasos con su fecha, y las ventanas del ciclo (informe de Cosemar del 1 al 5, OC hasta 7 días después del memo, factura del 15 al 20, pago a 30 días de la factura) con su estado frente a hoy.',
    fn: function (eventos, rec, df, extra) {
      var hoy = hoyCL(), out = [];
      function base(k, p, monto, estado, pagado) {
        var m1 = sig(p.periodo); return { clave: k + '|' + p.periodo, contrato: k, periodo: p.periodo, monto: monto, estado: estado, pagado: !!pagado, pasos: {}, infoDesde: m1 + '-01', infoHasta: m1 + '-0' + R.infoHasta, facDesde: m1 + '-' + R.facDesde, facHasta: m1 + '-' + R.facHasta };
      }
      function poner(o, hito, fecha, doc, resp) { if (!doc && !fecha) return; var a = o.pasos[hito]; if (!a || (fecha && (!a.fecha || fecha > a.fecha))) o.pasos[hito] = { fecha: fecha || (a && a.fecha) || null, documento: doc || (a && a.documento) || null, respaldo: resp || (a && a.respaldo) || null }; }
      rec.filter(function (p) { return p.periodo >= '2026-01'; }).forEach(function (p) {
        var o = base('rec', p, p.tramitado, p.estado, p.pagado);
        eventos.filter(function (e) { return e.vigente && e.modulo === 'Pago' && e.entidad === p.periodo && M.H_PAGO[e.hito]; }).forEach(function (e) { poner(o, e.hito, e.verificacion === 'Por verificar' || (e.hito === 'pago' && e.fechaTipo === 'Declarada') ? null : e.fecha, e.documento, e.respaldo); });
        if (p.oc) poner(o, 'oc_emitida', null, 'OC ' + p.oc, null); if (p.factura) poner(o, 'factura', null, 'Factura ' + p.factura, null);
        if (p.memo && /pide OC/.test(p.memo)) poner(o, 'memo_oc', null, p.memo, p.respaldo); else if (p.memo) poner(o, 'memo_pago', null, p.memo, p.respaldo);
        if (p.pagado && !o.pasos.pago) poner(o, 'pago', null, 'Pago confirmado por el encargado (constancia 18-11-2026)', null);
        out.push(o);
      });
      df.filter(function (p) { return p.periodo >= '2026-01'; }).forEach(function (p) {
        var o = base('df', p, p.tramitado, p.estado, p.pagado);
        if (p.memoOC) poner(o, 'memo_oc', null, p.memoOC, null); if (p.oc) poner(o, 'oc_emitida', null, 'OC ' + p.oc, null); if (p.factura) poner(o, 'factura', null, 'Factura ' + p.factura, null);
        if (p.memoPago) poner(o, 'memo_pago', p.fechaMemoPago, p.memoPago, p.respaldo); if (p.pagado) poner(o, 'pago', null, 'Pago confirmado por el encargado (18-11-2026)', null);
        out.push(o);
      });
      extra.forEach(function (x) { var o = out.filter(function (r) { return r.contrato === x.contrato && r.periodo === x.periodo; })[0]; if (o) poner(o, x.hito, x.fecha, x.documento, x.respaldo || null); });
      return out.map(function (o) {
        var P = o.pasos, memo = P.memo_oc && P.memo_oc.fecha, oc = P.oc_emitida, fac = P.factura, pago = P.pago;
        o.memoOC = memo || null; o.ocLimite = M.sumarDias(memo || o.infoHasta, R.ocDias);
        o.pagoLimite = M.sumarDias((fac && fac.fecha) || o.facHasta, R.pagoDias);
        o.ocEstado = oc ? 'listo' : o.pagado ? 'listo' : hoy > o.ocLimite ? 'atrasado' : 'en plazo';
        o.facEstado = fac ? 'listo' : o.pagado ? 'listo' : hoy > o.facHasta ? 'atrasado' : 'en plazo';
        o.pagoEstado = pago || o.pagado ? 'listo' : hoy > o.pagoLimite ? 'atrasado' : 'en plazo';
        o.pasosListos = M.HITOS_PAGO.filter(function (hh) { return P[hh.id]; }).length;
        o.ultimoPaso = M.HITOS_PAGO.filter(function (hh) { return P[hh.id]; }).map(function (hh) { return hh.nombre; }).pop() || null;
        return o;
      }).sort(function (a, b) { return a.clave < b.clave ? -1 : 1; });
    }
  });

  dash.calc('c_presupuesto', {
    inputs: ['pagos_contrato', 'df_pagos', 'c_deuda_mes'], title: 'Gasto acumulado y presupuesto 2026 estimado',
    description: 'Acumulado pagado de cada contrato frente al monto de las bases; pagado con cargo a 2026 (meses cuyo memo de pago es de 2026, más el retroactivo); deuda de octubre a diciembre de 2026 que pasa a 2027 (mensualidades más diferencias por decreto y bases; noviembre y diciembre estimados). Cuenta compartida 215.22.08.001.001. Estimación hasta que DAF entregue la cifra oficial.',
    fn: function (rec, df, deuda) {
      function anioPago(p, fecha) { return +((fecha || sig(p.periodo) + '-01').slice(0, 4)); }
      var r = { contrato: 'rec' }, d = { contrato: 'df' };
      r.acumulado = rec.filter(function (p) { return p.pagado; }).reduce(function (t, p) { return t + p.tramitado - (p.multa || 0); }, 0) + rec.reduce(function (t, p) { return t + (p.ajusteRetroPagadoEn ? p.ajusteRetro || 0 : 0); }, 0);
      r.pagado2026 = rec.filter(function (p) { return p.pagado && anioPago(p) === 2026; }).reduce(function (t, p) { return t + p.tramitado - (p.multa || 0); }, 0) + rec.reduce(function (t, p) { return t + (p.ajusteRetroPagadoEn && p.ajusteRetroPagadoEn.slice(0, 4) === '2026' ? p.ajusteRetro || 0 : 0); }, 0);
      r.retro2026 = rec.reduce(function (t, p) { return t + (p.ajusteRetroPagadoEn && p.ajusteRetroPagadoEn.slice(0, 4) === '2026' ? p.ajusteRetro || 0 : 0); }, 0);
      var ult = rec.slice().sort(function (a, b) { return a.periodo < b.periodo ? -1 : 1; }).pop();
      var impago = rec.filter(function (p) { return !p.pagado && p.periodo >= '2026-10' && p.periodo <= '2026-12'; });
      var faltan = []; for (var p = sig(ult.periodo); p <= '2026-12'; p = sig(p)) faltan.push(p);
      var dm = deuda.filter(function (m) { return m.anio === 2026; }), um = deuda[deuda.length - 1] || {};
      r.mensualidades = impago.reduce(function (t, p) { return t + p.tramitado; }, 0) + faltan.length * ult.tramitado;
      r.diferencias = dm.reduce(function (t, m) { return t + m.deltaDecreto + m.deltaBases; }, 0) + faltan.length * (((um.debidoDecreto || 0) - (um.tramitado || 0)) + (um.deltaBases || 0));
      r.deficit = r.mensualidades + r.diferencias; r.mesesEstimados = faltan.length;
      r.mesesTranscurridos = rec.length; r.bases = BASES.rec.ref;
      d.acumulado = df.filter(function (p) { return p.pagado; }).reduce(function (t, p) { return t + p.tramitado; }, 0);
      d.pagado2026 = df.filter(function (p) { return p.pagado && anioPago(p, p.fechaMemoPago) === 2026; }).reduce(function (t, p) { return t + p.tramitado; }, 0);
      var u26 = df.filter(function (p) { return p.anio === 2026; }), uDf = df.slice().sort(function (a, b) { return a.periodo < b.periodo ? -1 : 1; }).pop();
      var prom = u26.reduce(function (t, p) { return t + Number(p.toneladas); }, 0) / (u26.length || 1), estMes = Math.round(Math.round(prom * uDf.tarifaNeta) * 1.19);
      var fd = []; for (var q = sig(uDf.periodo); q <= '2026-12'; q = sig(q)) fd.push(q);
      d.mensualidades = df.filter(function (p) { return !p.pagado && p.periodo <= '2026-12'; }).reduce(function (t, p) { return t + p.tramitado; }, 0) + fd.length * estMes;
      d.diferencias = 0; d.deficit = d.mensualidades; d.mesesEstimados = fd.length; d.estMensual = estMes; d.tonPromedio = Math.round(prom * 100) / 100;
      d.mesesTranscurridos = df.length; d.bases = BASES.df.ref; r.retro2026 = r.retro2026 || 0; d.retro2026 = 0;
      [r, d].forEach(function (x) { x.necesario2026 = x.pagado2026 + x.deficit; x.pctBases = x.acumulado / x.bases; x.pctPlazo = x.mesesTranscurridos / 60; });
      var t = { contrato: 'total' }; ['acumulado', 'pagado2026', 'mensualidades', 'diferencias', 'deficit', 'necesario2026'].forEach(function (k) { t[k] = r[k] + d[k]; });
      t.restante = 0; t.nota = 'DAF informó saldo negativo (13-11-2026): lo pagado en 2026 equivale al presupuesto disponible estimado de la cuenta.';
      return [r, d, t];
    }
  });

  dash.calc('c_decretos', {
    inputs: ['alzas', 'df_alzas', 'c_eventos'], title: 'Decretos y actos vigentes por contrato',
    description: 'Bases, adjudicación, contrato, decretos de precio y anexos vigentes de cada contrato, más los decretos de multa del libro de control, del más reciente al más antiguo, con lo que respaldan.',
    fn: function (alzas, dfa, ev) {
      var out = [];
      function act(k, a, precio) { if (['Mecanismo', 'Contrato', 'Decreto'].indexOf(a.capa) < 0 && !(a.tipo === 'Anexo' && a.estado === 'Vigente')) return;
        out.push({ contrato: k, fecha: a.fecha, acto: a.acto, tipo: a.tipo, respalda: a.efecto, valor: precio, rige: a.rigeDesde, estado: a.estado, enlace: a.respaldo }); }
      alzas.forEach(function (a) { act('rec', a, a.bruto != null ? 'Mensual bruto ' + clp(a.bruto) : null); });
      dfa.forEach(function (a) { act('df', a, a.tarifaNeta != null ? clp(a.tarifaNeta) + ' neto por tonelada' : null); });
      ev.filter(function (e) { return e.vigente && e.modulo === 'Sanción' && /^(decreto_multa|decreto_final|rectificacion_decreto)$/.test(e.hito); }).forEach(function (e) {
        out.push({ contrato: 'rec', fecha: e.fecha, acto: 'D.A. ' + (e.numero ? M.fmt(+e.numero) : '') + '/' + (e.fecha || '').slice(0, 4), tipo: 'Decreto de multa', respalda: M.H_SAN[e.hito].nombre + ' · proceso ' + e.entidad + (e.monto ? ' · ' + e.monto + ' ' + (e.unidadMonto || '') : ''), valor: null, rige: null, estado: 'Firme', enlace: e.respaldo });
      });
      return out.sort(function (a, b) { return (b.fecha || '') < (a.fecha || '') ? -1 : 1; });
    }
  });

  dash.calc('c_alertas', {
    inputs: ['c_ciclo', 'flota', 'manifolds', 'correos'], title: 'Alertas de hoy',
    description: 'OC que superan los 7 días desde el memo que la pide, facturas y pagos fuera de plazo, ventanas que vienen, revisiones técnicas vencidas o por vencer en 30 días, manifolds abiertos con plazo vencido y correos urgentes sin responder.',
    fn: function (ciclo, flota, mf, cor) {
      var hoy = hoyCL(), out = [];
      function a(nivel, k, txt, fecha) { out.push({ nivel: nivel, contrato: k, texto: txt, fecha: fecha || null }); }
      ['rec', 'df'].forEach(function (k) {
        var cs = ciclo.filter(function (c) { return c.contrato === k && !c.pagado; });
        cs.forEach(function (c) {
          var n = mesL(c.periodo);
          if (c.ocEstado === 'atrasado') a('alta', k, 'Pregunta a DAF por la OC de ' + n + ': ' + (c.memoOC ? 'el memo es del ' + fCL(c.memoOC) + ' y' : 'no hay memo con fecha y') + ' los 7 días vencieron el ' + fCL(c.ocLimite) + '.', c.ocLimite);
          else if (c.ocEstado === 'en plazo') a('media', k, 'La OC de ' + n + ' debe estar lista a más tardar el ' + fCL(c.ocLimite) + '.', c.ocLimite);
          if (c.facEstado === 'atrasado') a('media', k, 'Falta la factura de ' + n + ' (ventana del ' + fCL(c.facDesde) + ' al ' + fCL(c.facHasta) + ').', c.facHasta);
          if (c.pagoEstado === 'atrasado') a('media', k, 'El pago de ' + n + ' superó los 30 días desde la factura (' + fCL(c.pagoLimite) + ').', c.pagoLimite);
        });
        var u = ciclo.filter(function (c) { return c.contrato === k; }).map(function (c) { return c.periodo; }).sort().pop();
        if (u) { var prox = sig(u), m1 = sig(prox); a('info', k, 'Del ' + fCL(m1 + '-01') + ' al ' + fCL(m1 + '-05') + ' Cosemar debe entregar el informe de ' + mesL(prox) + ' para pedir la OC.', m1 + '-05'); }
      });
      flota.forEach(function (f) { if (!f.rt) return; var d = dc(hoy, f.rt);
        if (d < 0) a('alta', 'rec', 'Móvil ' + f.movil + ' (' + f.patente + '): la revisión técnica de la planilla venció el ' + fCL(f.rt) + '.' + (f.nota ? ' ' + f.nota : ''), f.rt);
        else if (d <= 30) a('media', 'rec', 'Móvil ' + f.movil + ' (' + f.patente + '): la revisión técnica vence el ' + fCL(f.rt) + (d === 0 ? ' (hoy).' : d === 1 ? ' (mañana).' : ' (en ' + d + ' días).'), f.rt); });
      mf.filter(function (m) { return m.estado === 'Abierto' && m.vence && m.vence < hoy; }).forEach(function (m) { a('alta', 'rec', 'Manifold ' + m.pagina + ' del ' + fCL(m.fecha) + ' sigue abierto con el plazo vencido el ' + fCL(m.vence) + ': ' + m.motivo + '.', m.vence); });
      cor.filter(function (c) { return c.urgencia === 'Alta' && c.estado === 'Responder'; }).forEach(function (c) { a('alta', c.contrato === 'Disposición final' ? 'df' : 'rec', 'Correo de ' + c.contacto + ' del ' + fCL(c.fecha) + ' sin responder: ' + c.tema + '.', c.fecha); });
      var ord = { alta: 0, media: 1, info: 2 };
      return out.sort(function (x, y) { return ord[x.nivel] - ord[y.nivel] || ((x.fecha || '') < (y.fecha || '') ? -1 : 1); });
    }
  });

  // ---------- dibujos de Operación (uno por contrato) ----------
  ['rec', 'df'].forEach(function (k) {
    dash.draw('op_alertas_' + k, function (el) {
      if (!listo(el, ['c_alertas'])) return;
      var al = filas('c_alertas').filter(function (a) { return a.contrato === k; });
      el.replaceChildren.apply(el, al.length ? al.map(function (a) { return h('li', { cls: 'op-al op-al-' + a.nivel }, [chip(a.nivel === 'alta' ? 'Preguntar ya' : a.nivel === 'media' ? 'Atento' : 'Próximo', a.nivel === 'alta' ? 'bad' : a.nivel === 'media' ? 'warn' : null), ' ', a.texto]); }) : [h('li', { text: 'Sin alertas.' })]);
    });

    dash.draw('op_ultimo_' + k, function (el) {
      if (!listo(el, ['c_ciclo'])) return;
      var cs = filas('c_ciclo').filter(function (c) { return c.contrato === k; });
      if (!cs.length) { el.replaceChildren(h('p', { cls: 'va-muted', text: 'Sin meses registrados.' })); return; }
      var pagados = cs.filter(function (c) { return c.pagado; }), up = pagados[pagados.length - 1];
      var sel = h('select', { cls: 'op-sel', 'aria-label': 'Mes de servicio' }, cs.slice().reverse().map(function (c) { return h('option', { value: c.periodo, text: mesL(c.periodo) + (c.pagado ? ' · pagado' : ' · ' + c.estado.toLowerCase()) }); }));
      var cuerpo = h('div');
      function pintar(per) {
        var c = cs.filter(function (x) { return x.periodo === per; })[0];
        var pasos = M.HITOS_PAGO.map(function (hh, i) {
          var p = c.pasos[hh.id], ok = !!p, sigue = !ok && M.HITOS_PAGO.slice(0, i).every(function (z) { return c.pasos[z.id] || z.id === 'vb_daf' || z.id === 'oc_aceptada' || z.id === 'informe_gps' || z.id === 'revision_sanciones'; });
          return h('li', { cls: 'op-paso' + (ok ? ' op-ok' : sigue ? ' op-sig' : '') }, [h('span', { cls: 'op-pt', 'aria-hidden': 'true' }), h('div', null, [h('b', { text: hh.nombre }), h('div', { cls: 'va-muted' }, [ok ? (p.documento || 'Consta') + (p.fecha ? ' · ' + fCL(p.fecha) : '') : sigue ? 'Pendiente · a cargo de ' + hh.unidad : 'Sin antecedente', ok && p.respaldo ? h('span', null, [' · ', h('a', { href: p.respaldo, target: '_blank', rel: 'noopener', text: 'abrir' })]) : null])])]);
        });
        cuerpo.replaceChildren(h('div', { cls: 'op-mon' }, [h('span', { cls: 'va-big', text: clp(c.monto) }), ' ', chip(c.pagado ? 'Pagado' : c.estado, c.pagado ? 'ok' : 'warn')]),
          h('p', { cls: 'va-muted', text: c.pasosListos + ' de 11 pasos con antecedente. Último: ' + (c.ultimoPaso || 'ninguno') + '.' }), h('ol', { cls: 'op-pasos' }, pasos));
      }
      sel.addEventListener('change', function () { pintar(sel.value); });
      el.replaceChildren(h('p', null, ['Último pago: ', h('b', { text: up ? mesL(up.periodo) : 'sin pagos' }), up && up.pasos.memo_pago ? ' · ' + (up.pasos.memo_pago.documento || '') + (up.pasos.memo_pago.fecha ? ' del ' + fCL(up.pasos.memo_pago.fecha) : '') : '', '. La fecha efectiva del pago no tiene comprobante de DAF.']),
        h('label', { cls: 'va-muted' }, ['Ver mes ', sel]), cuerpo);
      sel.value = cs[cs.length - 1].periodo; pintar(sel.value);
    });

    dash.draw('op_cal_' + k, function (el) {
      if (!listo(el, ['c_ciclo'])) return;
      var cs = filas('c_ciclo').filter(function (c) { return c.contrato === k; }), hoy = hoyCL();
      var marcas = {}; function m(f, tipo, txt) { if (!f) return; (marcas[f] = marcas[f] || []).push({ tipo: tipo, txt: txt }); }
      cs.forEach(function (c) {
        var n = MESL[+c.periodo.slice(5, 7) - 1];
        for (var d = 1; d <= R.infoHasta; d++) m(c.infoDesde.slice(0, 8) + '0' + d, 'info', 'Cosemar informa ' + n);
        for (var e = R.facDesde; e <= R.facHasta; e++) m(c.facDesde.slice(0, 8) + e, 'fac', 'Ventana de factura de ' + n);
        if (c.ocEstado !== 'listo') m(c.ocLimite, c.ocEstado === 'atrasado' ? 'alerta' : 'oc', 'Límite OC de ' + n + (c.ocEstado === 'atrasado' ? ' (vencido)' : ''));
        if (c.pagoEstado !== 'listo') m(c.pagoLimite, c.pagoEstado === 'atrasado' ? 'alerta' : 'pago', 'Pago a 30 días de ' + n);
        ['memo_oc', 'oc_emitida', 'factura', 'memo_pago', 'pago'].forEach(function (hid) { var p = c.pasos[hid]; if (p && p.fecha) m(p.fecha, 'doc', (M.H_PAGO[hid].nombre) + ' · ' + n + ': ' + (p.documento || '')); });
      });
      var vista = 'mes', cur = hoy.slice(0, 7), caja = h('div');
      function celda(f, chica) {
        var ms = marcas[f] || [], cls = 'op-dia' + (f === hoy ? ' op-hoy' : '') + ms.map(function (x) { return ' op-' + x.tipo; }).join('');
        return h('div', { cls: cls, title: ms.map(function (x) { return x.txt; }).join('\n') || null }, [h('span', { cls: 'op-num', text: String(+f.slice(8)) }), chica ? null : h('div', { cls: 'op-mk' }, ms.filter(function (x) { return x.tipo === 'doc' || x.tipo === 'alerta' || x.tipo === 'oc' || x.tipo === 'pago'; }).slice(0, 2).map(function (x) { return h('div', { text: x.txt }); }))]);
      }
      function grilla(p, chica) {
        var y = +p.slice(0, 4), mo = +p.slice(5, 7), ini = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7, dias = new Date(Date.UTC(y, mo, 0)).getUTCDate(), cs2 = [];
        ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(function (x) { cs2.push(h('div', { cls: 'op-dow', text: x })); });
        for (var i = 0; i < ini; i++) cs2.push(h('div'));
        for (var d = 1; d <= dias; d++) cs2.push(celda(p + '-' + (d < 10 ? '0' : '') + d, chica));
        return h('div', { cls: 'op-grid' + (chica ? ' op-mini' : '') }, cs2);
      }
      function pintar() {
        var nav = h('div', { cls: 'op-nav' }, [h('button', { type: 'button', text: '‹', 'aria-label': 'Anterior', onclick: function () { cur = vista === 'mes' ? sig(cur, -1) : (+cur.slice(0, 4) - 1) + cur.slice(4); pintar(); } }),
          h('b', { text: vista === 'mes' ? mesL(cur) : cur.slice(0, 4) }),
          h('button', { type: 'button', text: '›', 'aria-label': 'Siguiente', onclick: function () { cur = vista === 'mes' ? sig(cur) : (+cur.slice(0, 4) + 1) + cur.slice(4); pintar(); } }),
          h('button', { type: 'button', cls: 'op-vista', text: vista === 'mes' ? 'Ver año' : 'Ver mes', onclick: function () { vista = vista === 'mes' ? 'anio' : 'mes'; pintar(); } })]);
        var cuerpo;
        if (vista === 'mes') {
          var lst = Object.keys(marcas).filter(function (f) { return f.slice(0, 7) === cur; }).sort().map(function (f) { return marcas[f].filter(function (x) { return x.tipo !== 'info' && x.tipo !== 'fac'; }).map(function (x) { return h('li', { cls: 'op-li-' + x.tipo }, [h('b', { text: fCL(f) + ' ' }), x.txt]); }); }).reduce(function (a, b) { return a.concat(b); }, []);
          var atr = cs.filter(function (c) { return sig(c.periodo) === cur; })[0];
          cuerpo = [grilla(cur, false), atr ? h('p', { cls: 'va-muted' }, ['Servicio de ' + mesL(atr.periodo) + ': OC ', chip(atr.ocEstado, atr.ocEstado === 'atrasado' ? 'bad' : atr.ocEstado === 'listo' ? 'ok' : 'warn'), ' · factura ', chip(atr.facEstado, atr.facEstado === 'atrasado' ? 'bad' : atr.facEstado === 'listo' ? 'ok' : 'warn'), ' · pago ', chip(atr.pagoEstado, atr.pagoEstado === 'atrasado' ? 'bad' : atr.pagoEstado === 'listo' ? 'ok' : 'warn')]) : null, h('ul', { cls: 'va-ul' }, lst)];
        } else {
          var y = cur.slice(0, 4), meses = [];
          for (var i = 1; i <= 12; i++) { var p = y + '-' + (i < 10 ? '0' : '') + i; meses.push(h('div', { cls: 'op-mes' }, [h('div', { cls: 'op-mes-t', text: MESL[i - 1] }), grilla(p, true)])); }
          cuerpo = [h('div', { cls: 'op-anio' }, meses)];
        }
        caja.replaceChildren.apply(caja, [nav].concat(cuerpo));
      }
      el.replaceChildren(caja, h('div', { cls: 'va-legend' }, [h('span', null, [h('span', { cls: 'va-key op-k-info' }), 'Días 1 a 5: Cosemar informa']), h('span', null, [h('span', { cls: 'va-key op-k-fac' }), 'Días 15 a 20: factura']), h('span', null, [h('span', { cls: 'va-key op-k-oc' }), 'Límite OC (7 días) o pago (30 días)']), h('span', null, [h('span', { cls: 'va-key op-k-doc' }), 'Documento con fecha']), h('span', null, [h('span', { cls: 'va-key op-k-alerta' }), 'Plazo vencido'])]));
      pintar();
    });

    dash.draw('op_cifras_' + k, function (el) {
      if (!listo(el, ['c_presupuesto'])) return;
      var ps = filas('c_presupuesto'), r = ps.filter(function (x) { return x.contrato === k; })[0], t = ps.filter(function (x) { return x.contrato === 'total'; })[0];
      function card(eb, big, txt, cls) { return h('div', { cls: 'va-card' }, [h('div', { cls: 'va-eyebrow', text: eb }), h('div', { cls: 'va-big' + (cls ? ' ' + cls : ''), text: big }), h('div', { cls: 'va-muted', text: txt })]); }
      el.replaceChildren(h('div', { cls: 'va-cards' }, [
        card('Acumulado pagado del contrato', mill(r.acumulado), pct(r.pctBases) + ' del monto de las bases (' + mill(r.bases) + '), con ' + r.mesesTranscurridos + ' de 60 meses transcurridos (' + pct(r.pctPlazo) + '). ' + BASES[k].txt),
        card('Pagado con cargo a 2026', mill(r.pagado2026), k === 'rec' ? 'Diciembre de 2025 a septiembre de 2026 (neto de multas) más el retroactivo del D.A. 2.459 (' + mill(r.retro2026) + ').' : 'Septiembre de 2025 a septiembre de 2026, por la fecha de cada memo de pago.'),
        card('Deuda 2026 que pasa a 2027', mill(r.deficit), 'Mensualidades de octubre a diciembre (' + mill(r.mensualidades) + (r.mesesEstimados ? ', ' + r.mesesEstimados + ' estimadas' : '') + ')' + (r.diferencias ? ' más diferencias por decreto y bases (' + mill(r.diferencias) + ')' : '') + '.', 'va-deuda'),
        card('Presupuesto 2026 de la cuenta', mill(t.pagado2026) + ' usado', 'Estimado como lo pagado en 2026 por ambos contratos; restante $0 (DAF informó saldo negativo). Para cerrar 2026 habrían faltado ' + mill(t.deficit) + '; en total habrían hecho falta ' + mill(t.necesario2026) + '.')
      ]));
    });

    dash.draw('op_ant_' + k, function (el) {
      if (!listo(el, ['antecedentes'])) return;
      var a = filas('antecedentes').filter(function (x) { return x.contrato === k; }).sort(function (x, y) { return (x.estado === 'Abierto' ? 0 : 1) - (y.estado === 'Abierto' ? 0 : 1) || (x.fecha < y.fecha ? 1 : -1); });
      el.replaceChildren.apply(el, a.map(function (x) { return h('li', null, [chip(x.tipo, x.tipo === 'Hecho por subsanar' ? 'bad' : x.tipo === 'Comentario' ? 'warn' : null), ' ', h('span', { cls: 'va-muted', text: fCL(x.fecha) + ' · ' }), x.texto, x.estado === 'Cerrado' ? h('span', { cls: 'va-muted', text: ' (cerrado)' }) : null]); }));
    });

    dash.draw('op_dec_' + k, function (el) {
      if (!listo(el, ['c_decretos'])) return;
      var ds = filas('c_decretos').filter(function (x) { return x.contrato === k; });
      el.replaceChildren.apply(el, ds.map(function (d) { return h('tr', null, [h('td', { text: fCL(d.fecha) }), h('td', null, [d.enlace ? h('a', { href: d.enlace, target: '_blank', rel: 'noopener', text: d.acto }) : d.acto, h('div', { cls: 'va-muted', text: d.tipo })]), h('td', { text: d.respalda + (d.valor ? ' · ' + d.valor : '') + (d.rige ? ' · rige desde ' + mesL(d.rige) : '') }), h('td', { text: d.estado })]); }));
    });
  });

  // ---------- Multas: línea de tiempo, del proceso más nuevo al más antiguo ----------
  dash.draw('vm_multas', function (el) {
    if (!listo(el, ['c_sanciones', 'c_eventos'])) return;
    var S = filas('c_sanciones'), ev = filas('c_eventos').filter(function (e) { return e.vigente && e.modulo === 'Sanción'; });
    var inicio = function (id) { return ev.filter(function (e) { return e.entidad === id && e.fecha; }).map(function (e) { return e.fecha; }).sort()[0] || ''; };
    S = S.slice().sort(function (a, b) { return inicio(b.id) < inicio(a.id) ? -1 : 1; });
    el.replaceChildren.apply(el, S.map(function (s) {
      var es = ev.filter(function (e) { return e.entidad === s.id; }).sort(function (a, b) { return (b.fecha || '9') < (a.fecha || '9') ? -1 : 1; });
      var dec = es.filter(function (e) { return /decreto/.test(e.hito); }), cobro = es.filter(function (e) { return /cobro/.test(e.hito); })[0];
      var monto = s.decretado != null ? 'Multa decretada: ' + M.fmt(s.decretado) + ' ' + (s.decretadoUnidad || '') : s.propuesto != null ? 'Multa propuesta: ' + M.fmt(s.propuesto) + ' ' + (s.propuestoUnidad || '') : 'Sin monto';
      var mesCobro = cobro ? (cobro.periodo || (((cobro.documento || '') + ' ' + (cobro.detalle || '')).match(/pago de ([a-záéíóú]+)/i) || [])[1] || null) : null;
      return h('details', { cls: 'tl-item', open: !s.cerrada ? '' : null }, [
        h('summary', null, [h('b', { text: s.id + ' · ' + s.titulo }), ' ', chip(s.cerrada ? 'Cerrado' : 'En curso', s.cerrada ? null : 'warn'), h('div', { cls: 'va-muted', text: 'Inició el ' + fCL(inicio(s.id)) + ' · etapa: ' + s.estado + (s.vence && !s.cerrada ? ' · vence ' + fCL(s.vence) : '') + ' · ' + monto + (dec.length ? ' · decretos: ' + dec.map(function (e) { return 'D.A. ' + (e.numero ? M.fmt(+e.numero) : '?'); }).join(', ') : '') + (mesCobro ? ' · se cobra en el pago de ' + mesCobro : cobro ? ' · cobro derivado' : '') })]),
        h('p', { cls: 'va-muted', text: 'Siguiente paso: ' + (s.siguiente || '—') + '.' }),
        h('ol', { cls: 'tl' }, es.map(function (e) { var hh = M.H_SAN[e.hito]; return h('li', { cls: e.verificacion === 'Por verificar' ? 'tl-warn' : '' }, [h('span', { cls: 'tl-f', text: e.fecha ? fCL(e.fecha) : 's/f' }), h('div', null, [h('b', { text: hh ? hh.nombre : e.hito }), h('div', { cls: 'va-muted' }, [e.documento || '', e.monto ? ' · ' + M.fmt(e.monto) + ' ' + (e.unidadMonto || '') : '', e.respaldo ? h('span', null, [' · ', h('a', { href: e.respaldo, target: '_blank', rel: 'noopener', text: 'abrir' })]) : null])])]); }))
      ]);
    }));
  });

  // ---------- Manifolds ----------
  dash.draw('vm_mf_resumen', function (el) {
    if (!listo(el, ['manifolds'])) return;
    var m = filas('manifolds'), ab = m.filter(function (x) { return x.estado === 'Abierto'; }), hoy = hoyCL(), venc = ab.filter(function (x) { return x.vence && x.vence < hoy; });
    el.textContent = m.length + ' manifolds desde julio de 2024: ' + ab.length + ' abiertos, ' + venc.length + ' de ellos con el plazo vencido. El más reciente es del ' + fCL(m.map(function (x) { return x.fecha; }).sort().pop()) + '.';
  });
  dash.draw('vm_mf', function (el) {
    if (!listo(el, ['manifolds'])) return;
    var hoy = hoyCL(), m = filas('manifolds').slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    el.replaceChildren.apply(el, m.map(function (x) {
      var venc = x.estado === 'Abierto' && x.vence && x.vence < hoy;
      return h('li', { cls: 'tl-li' + (x.estado === 'Abierto' ? ' tl-open' : '') }, [h('span', { cls: 'tl-f', text: fCL(x.fecha) }), h('div', null, [
        h('div', null, [h('b', { text: 'Pág. ' + x.pagina + ' · ' + x.tipo }), ' ', chip(x.estado, x.estado === 'Abierto' ? (venc ? 'bad' : 'warn') : 'ok'), x.caso ? h('span', { cls: 'va-muted', text: ' · ' + x.caso }) : null]),
        h('div', { text: x.motivo + '.' }),
        h('div', { cls: 'va-muted' }, [x.vence ? 'Plazo: ' + (x.plazoDias ? x.plazoDias + ' días ' + x.plazoUnidad + ', ' : '') + 'vence el ' + fCL(x.vence) + (venc ? ' (vencido hace ' + dc(x.vence, hoy) + ' días)' : '') + '. ' : 'Sin plazo. ', x.cierre ? 'Cerrado el ' + fCL(x.cierre) + '. ' : '', x.nota || '', x.respaldo ? h('span', null, [' ', h('a', { href: x.respaldo, target: '_blank', rel: 'noopener', text: 'Abrir' })]) : null])])]);
    }));
  });

  // ---------- Correos ----------
  dash.draw('vc_ultimo', function (el) {
    if (!listo(el, ['correos'])) return;
    var c = filas('correos').slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; }), u = c[0], pend = c.filter(function (x) { return x.estado !== 'Cerrado'; }), urg = pend.filter(function (x) { return x.urgencia === 'Alta'; });
    el.replaceChildren(h('div', { cls: 'va-cards' }, [
      h('div', { cls: 'va-card' }, [h('div', { cls: 'va-eyebrow', text: 'Último correo · ' + fCL(u.fecha) }), h('div', { cls: 'op-tema', text: u.tema }), h('div', { cls: 'va-muted', text: u.contacto + ' · ' + u.contrato + ' · ' + u.estado })]),
      h('div', { cls: 'va-card' }, [h('div', { cls: 'va-eyebrow', text: 'Abiertos' }), h('div', { cls: 'va-big', text: String(pend.length) }), h('div', { cls: 'va-muted', text: urg.length + ' con urgencia alta' })])]));
  });
  dash.draw('vc_lista', function (el) {
    if (!listo(el, ['correos'])) return;
    var c = filas('correos').slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    el.replaceChildren.apply(el, c.map(function (x) {
      return h('li', { cls: 'tl-li' + (x.estado !== 'Cerrado' ? ' tl-open' : '') }, [h('span', { cls: 'tl-f', text: fCL(x.fecha) }), h('div', null, [
        h('div', null, [h('b', { text: x.tema }), ' ', chip(x.urgencia, x.urgencia === 'Alta' ? 'bad' : x.urgencia === 'Media' ? 'warn' : null), ' ', chip(x.estado, x.estado === 'Cerrado' ? 'ok' : null)]),
        h('div', { cls: 'va-muted' }, [x.contacto + ' (' + x.empresa + ') · ' + x.contrato + (x.nota ? ' · ' + x.nota : ''), ' ', h('a', { href: x.enlace, target: '_blank', rel: 'noopener', text: 'Abrir en Gmail' })])])]);
    }));
  });

  // ---------- Flota ----------
  function docEstado(f, hoy) { if (!f) return ['sin dato', 'bad']; var d = dc(hoy, f); return d < 0 ? ['vencido ' + fCL(f), 'bad'] : d <= 30 ? ['vence ' + fCL(f), 'warn'] : ['al día · ' + fCL(f), 'ok']; }
  dash.draw('vf_resumen', function (el) {
    if (!listo(el, ['flota'])) return;
    var f = filas('flota'), hoy = hoyCL(), op = f.filter(function (x) { return /^Operativo/.test(x.estado); }), tall = f.filter(function (x) { return /taller/i.test(x.estado); });
    var mal = f.filter(function (x) { return [x.rt, x.permiso, x.soap].some(function (d) { return !d || dc(hoy, d) < 0; }); });
    var pronto = f.filter(function (x) { return [x.rt, x.permiso, x.soap].some(function (d) { return d && dc(hoy, d) >= 0 && dc(hoy, d) <= 30; }); });
    function card(eb, big, txt, cls) { return h('div', { cls: 'va-card' }, [h('div', { cls: 'va-eyebrow', text: eb }), h('div', { cls: 'va-big' + (cls ? ' ' + cls : ''), text: big }), h('div', { cls: 'va-muted', text: txt })]); }
    el.replaceChildren(h('div', { cls: 'va-cards' }, [card('Equipos del contrato', String(f.length), 'Más tres camionetas de apoyo sin documentos en la planilla.'), card('Operativos al 09-11', String(op.length), tall.length + ' en taller: ' + tall.map(function (x) { return x.movil; }).join(' y ') + '.'),
      card('Documentos vencidos', String(mal.length), mal.length ? 'Móviles ' + mal.map(function (x) { return x.movil; }).join(', ') + '.' : 'Ninguno.', mal.length ? 'va-deuda' : ''), card('Vencen en 30 días', String(pronto.length), pronto.length ? 'Móviles ' + pronto.map(function (x) { return x.movil; }).join(', ') + '.' : 'Ninguno.', pronto.length ? 'va-ipc' : '')]));
  });
  dash.draw('vf_tabla', function (el) {
    if (!listo(el, ['flota'])) return;
    var hoy = hoyCL();
    el.replaceChildren.apply(el, filas('flota').map(function (x) {
      var rt = docEstado(x.rt, hoy), pc = docEstado(x.permiso, hoy), so = docEstado(x.soap, hoy);
      var foto = x.fotoId ? h('a', { href: x.foto, target: '_blank', rel: 'noopener', title: 'Abrir foto del móvil ' + x.movil }, [h('img', { cls: 'fl-foto', src: 'https://drive.google.com/thumbnail?id=' + x.fotoId + '&sz=w240', alt: 'Móvil ' + x.movil + ', patente ' + x.patente, loading: 'lazy', onerror: function () { this.replaceWith(h('span', { cls: 'fl-sin', text: 'Ver foto' })); } })]) : null;
      return h('tr', null, [h('td', null, [foto, h('b', { text: x.movil }), h('div', { cls: 'va-muted', text: x.patente })]), h('td', { text: x.tipo + ' · ' + x.modelo }),
        h('td', null, [chip(x.estado, /^Operativo/.test(x.estado) ? 'ok' : 'warn')]), h('td', null, [chip(rt[0], rt[1]), x.rtOtraFuente ? h('div', { cls: 'va-muted', text: 'La ficha de flota dice ' + fCL(x.rtOtraFuente) }) : null]),
        h('td', null, [chip(pc[0], pc[1])]), h('td', null, [chip(so[0], so[1]), h('div', { cls: 'va-muted', text: x.aseguradora })]), h('td', { text: x.nota || '' })]);
    }));
  });

  // ---------- Personal ----------
  dash.draw('vp2_resumen', function (el) {
    if (!listo(el, ['personal', 'resumenes'])) return;
    var p = filas('personal'), r = filas('resumenes').filter(function (x) { return x.clave === 'personal'; })[0] || {};
    function card(eb, big, txt) { return h('div', { cls: 'va-card' }, [h('div', { cls: 'va-eyebrow', text: eb }), h('div', { cls: 'va-big', text: big }), h('div', { cls: 'va-muted', text: txt })]); }
    var ofer = p.filter(function (x) { return x.oferta; }).reduce(function (t, x) { return t + x.oferta; }, 0), dot = p.filter(function (x) { return x.oferta; }).reduce(function (t, x) { return t + x.dotacion; }, 0);
    el.replaceChildren(h('div', { cls: 'va-cards' }, [card('Dotación total', String(r.total), 'Choferes y peonetas: ' + dot + ' frente a ' + ofer + ' ofertados. ' + (r.periodoEdp || '') + '.'),
      card('Movimientos del mes', '+' + r.contratados + ' / −' + r.desvinculados, 'Contrataciones y desvinculaciones informadas en el EDP.'),
      card('Reajuste de sueldos', pct(r.reajusteJul2026 || 0), 'Sueldo base de enero a julio de 2026. ' + (r.reajusteBases || '')),
      card('Último pago acreditado', r.ultimoPagoPeriodo ? mesL(r.ultimoPagoPeriodo) : 'Sin respaldo', r.ultimoPagoTxt || 'No hay comprobantes en el expediente.')]));
  });
  dash.draw('vp2_tabla', function (el) {
    if (!listo(el, ['personal'])) return;
    el.replaceChildren.apply(el, filas('personal').map(function (x) { return h('tr', null, [h('td', { text: x.cargo }), h('td', { cls: 'va-r', text: String(x.dotacion) }), h('td', { cls: 'va-r', text: x.oferta == null ? '—' : String(x.oferta) }), h('td', { cls: 'va-r', text: x.sueldoMin === x.sueldoMax ? clp(x.sueldoMin) : clp(x.sueldoMin) + ' a ' + clp(x.sueldoMax) }), h('td', { cls: 'va-muted', text: x.nota || '' })]); }));
  });
  dash.draw('vp2_pend', function (el) {
    if (!listo(el, ['resumenes'])) return;
    var r = filas('resumenes').filter(function (x) { return x.clave === 'personal'; })[0] || {};
    el.replaceChildren.apply(el, (r.pendientes || []).map(function (t) { return h('li', { text: t }); }));
  });


  dash.draw('vp2_impo', function (el) {
    if (!listo(el, ['imposiciones'])) return;
    el.replaceChildren.apply(el, filas('imposiciones').slice().reverse().map(function (x) {
      return h('tr', null, [h('td', { text: mesL(x.periodo) }), h('td', null, [chip(x.estado, x.estado === 'Acreditado' ? 'ok' : x.cotizaciones ? 'warn' : 'bad')]),
        h('td', null, [x.cotizaciones ? h('a', { href: x.cotizaciones, target: '_blank', rel: 'noopener', text: 'Comprobante' }) : '—', x.fechaPago ? h('div', { cls: 'va-muted', text: 'PREVIRED ' + fCL(x.fechaPago) }) : null]),
        h('td', null, [x.libro ? h('a', { href: x.libro, target: '_blank', rel: 'noopener', text: 'Libro' }) : '—'])]);
    }));
  });
  dash.draw('vp2_f30', function (el) {
    if (!listo(el, ['resumenes'])) return;
    var r = filas('resumenes').filter(function (x) { return x.clave === 'imposiciones'; })[0] || {};
    el.replaceChildren.apply(el, (r.f30 || []).slice().reverse().map(function (f) { return h('li', null, [h('b', { text: fCL(f.fecha) + ' · ' }), f.doc + ' ', h('a', { href: f.enlace, target: '_blank', rel: 'noopener', text: 'abrir' })]); }));
  });

  // ---------- Bono SUBDERE ----------
  dash.draw('vs_resumen', function (el) {
    if (!listo(el, ['subdere', 'resumenes'])) return;
    var s = filas('subdere'), r = filas('resumenes').filter(function (x) { return x.clave === 'subdere'; })[0] || {};
    var nom = s.reduce(function (t, x) { return t + x.nominal; }, 0), resp = s.reduce(function (t, x) { return t + x.respaldado; }, 0);
    function card(eb, big, txt, cls) { return h('div', { cls: 'va-card' }, [h('div', { cls: 'va-eyebrow', text: eb }), h('div', { cls: 'va-big' + (cls ? ' ' + cls : ''), text: big }), h('div', { cls: 'va-muted', text: txt })]); }
    el.replaceChildren(h('div', { cls: 'va-cards' }, [card('Asignado por SUBDERE', clp(r.asignacion), (r.resolucion || '') + '. Ingresó al municipio el ' + fCL(r.ingreso) + '.'),
      card('Pagado según planillas', clp(nom), clp(resp) + ' con firma o recibo (' + pct(resp / r.asignacion) + ' de lo asignado). Diferencia con lo asignado: ' + clp(r.asignacion - nom) + '.'),
      card('Rendido y aprobado', clp(r.rendidoAprobado), r.memoControl + '.'), card('Saldo formal por rendir', clp(r.saldoPorRendir), 'No es saldo de caja ni monto a devolver.', 'va-ipc')]));
  });
  dash.draw('vs_tabla', function (el) {
    if (!listo(el, ['subdere'])) return;
    el.replaceChildren.apply(el, filas('subdere').map(function (x) { return h('tr', null, [h('td', { text: x.concepto }), h('td', { cls: 'va-r', text: String(x.trabajadores) }), h('td', { cls: 'va-r', text: clp(x.nominal) }), h('td', { cls: 'va-r', text: clp(x.respaldado) }), h('td', { text: fCL(x.fecha) }), h('td', null, [chip(x.estado, x.nominal === x.respaldado ? (/falta|sin/i.test(x.estado) ? 'warn' : 'ok') : 'bad')])]); }));
  });
  dash.draw('vs_pend', function (el) {
    if (!listo(el, ['resumenes'])) return;
    var r = filas('resumenes').filter(function (x) { return x.clave === 'subdere'; })[0] || {};
    el.replaceChildren.apply(el, (r.pendientes || []).map(function (t) { return h('li', { text: t }); }));
  });
})();
