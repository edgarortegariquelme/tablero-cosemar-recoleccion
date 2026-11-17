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
