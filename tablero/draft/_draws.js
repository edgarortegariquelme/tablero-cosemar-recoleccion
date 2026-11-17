
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

  // ---------- 1 · esperado frente a tramitado por mes ----------
  dash.draw('va_pagos', function (el) {
    if (!listo(el, ['c_pagos'])) return;
    var ps = filas('c_pagos').filter(function (p) { return !p.ajuste && p.periodo >= '2026-01'; });
    el.replaceChildren(); if (!ps.length) { el.textContent = 'Sin meses de servicio en el libro'; return; }
    var w = Math.max(320, el.clientWidth || 640), H = 260, m = { l: 64, r: 12, t: 16, b: 34 };
    var x = d3.scaleBand().domain(ps.map(function (p) { return p.periodo; })).range([m.l, w - m.r]).padding(0.28);
    var vals = []; ps.forEach(function (p) { [p.esperado, p.remitido, p.solicitadoOC].forEach(function (v) { if (v != null) vals.push(v); }); });
    var lo = d3.min(vals) * 0.97, hi = d3.max(vals) * 1.01;
    var y = d3.scaleLinear().domain([lo, hi]).nice().range([H - m.b, m.t]);
    var box = d3.select(el).append('div').attr('class', 'va-box');
    var svg = box.append('svg').attr('width', '100%').attr('viewBox', '0 0 ' + w + ' ' + H).attr('role', 'img').attr('aria-label', 'Valor esperado según decreto y monto tramitado por mes de servicio');
    svg.append('g').attr('class', 'va-grid').attr('transform', 'translate(' + m.l + ',0)').call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat(function (v) { return '$' + (v / 1e6).toFixed(0) + ' M'; }));
    svg.append('g').attr('class', 'va-axis').attr('transform', 'translate(0,' + (H - m.b) + ')').call(d3.axisBottom(x).tickFormat(mesTxt));
    var t = tip(box);
    var tram = function (p) { return p.remitido != null ? p.remitido : p.solicitadoOC; };
    svg.append('g').selectAll('rect').data(ps).join('rect').attr('x', function (p) { return x(p.periodo); }).attr('width', x.bandwidth())
      .attr('y', function (p) { return tram(p) == null ? m.t : y(tram(p)); }).attr('height', function (p) { return tram(p) == null ? H - m.b - m.t : H - m.b - y(tram(p)); })
      .style('fill', function (p) { return tram(p) == null ? 'none' : dash.colors[0]; }).style('stroke', function (p) { return tram(p) == null ? 'var(--cds-chart-muted)' : 'none'; }).style('stroke-dasharray', '3 3')
      .on('pointerenter pointermove', function (ev, p) { showTip(t, el, ev, mesTxt(p.periodo) + ' · tramitado ' + (tram(p) == null ? 'sin monto en el libro' : clp(tram(p))) + ' · esperado ' + (p.esperado == null ? 'sin decreto cargado' : clp(p.esperado) + ' (' + p.actoEsperado + ')') + ' · ' + p.estado); })
      .on('pointerleave', function () { t.attr('hidden', ''); });
    var esp = ps.filter(function (p) { return p.esperado != null; });
    svg.append('g').selectAll('line').data(esp).join('line').attr('x1', function (p) { return x(p.periodo) - x.step() * 0.12; }).attr('x2', function (p) { return x(p.periodo) + x.bandwidth() + x.step() * 0.12; })
      .attr('y1', function (p) { return y(p.esperado); }).attr('y2', function (p) { return y(p.esperado); }).style('stroke', 'var(--cds-chart-reference)').style('stroke-width', 2.5);
    svg.append('g').selectAll('text').data(ps.filter(function (p) { return p.diferencia > 0; })).join('text').attr('class', 'va-lab va-bad')
      .attr('x', function (p) { return x(p.periodo) + x.bandwidth() / 2; }).attr('y', function (p) { return y(p.esperado) - 6; }).attr('text-anchor', 'middle').text(function (p) { return '−' + (p.diferencia / 1e6).toFixed(1).replace('.', ',') + ' M'; });
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
  dash.draw('va_k1', function (el) { el.style.background = dash.colors[0]; });

  // ---------- al pie: pendientes ----------
  dash.draw('va_pend', function (el) {
    if (!listo(el, ['c_pendientes'])) return;
    el.replaceChildren.apply(el, filas('c_pendientes').map(function (r) {
      return h('tr', { 'data-key': encodeURIComponent(r.clave) }, [h('td', { text: r.tipo }), h('td', { text: r.entidad || '—' }), h('td', null, [h('div', { text: r.descripcion || '' }), r.falta ? h('div', { cls: 'va-muted', text: r.falta }) : null]), h('td', { cls: 'va-num', text: fechaCL(r.plazo) || '—' }), h('td', { text: r.unidad || 'No consta' }), h('td', null, [r.enlace ? h('a', { href: r.enlace, target: '_blank', rel: 'noopener', text: 'Abrir' }) : h('span', { cls: 'va-muted', text: 'Sin respaldo' })])]);
    }));
  });
})();
