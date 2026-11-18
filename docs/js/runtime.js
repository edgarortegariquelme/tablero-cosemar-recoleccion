/* Motor mínimo de la app: carga los JSON de data/, resuelve cálculos y dibuja cada [data-draw].
   Expone la misma interfaz (dash.loader / calc / draw / data / colors) que usan app.js y operacion.js. */
(function () {
  var ld = {}, cc = {}, dr = {}, raw = {}, cache = {}, estado = {};
  function data(id) {
    if (cache[id]) return cache[id];
    if (estado[id] === 'loading') return { status: 'loading', data: [] };
    try {
      if (cc[id]) {
        var ins = cc[id].inputs.map(data);
        if (ins.some(function (x) { return x.status === 'loading'; })) return { status: 'loading', data: [] };
        if (ins.some(function (x) { return x.status === 'error'; })) return (cache[id] = { status: 'error', data: [] });
        cache[id] = { status: 'ok', data: cc[id].fn.apply(null, ins.map(function (x) { return x.data; })) };
      } else if (raw[id] !== undefined) {
        var r = raw[id];
        cache[id] = { status: 'ok', data: ld[id] ? ld[id].fn({ answer: r }).rows : (r && Array.isArray(r.rows) ? r.rows : r) };
      } else return { status: estado[id] === 'error' ? 'error' : 'loading', data: [] };
    } catch (e) { console.error('Cálculo ' + id, e); cache[id] = { status: 'error', data: [] }; }
    return cache[id];
  }
  var colores = getComputedStyle(document.documentElement);
  window.dash = {
    data: data, loader: function (i, o) { ld[i] = o; }, calc: function (i, o) { cc[i] = o; }, draw: function (n, f) { if (f) dr[n] = f; },
    params: function () { return {}; }, setParams: function () {}, setLink: function () {},
    colors: [colores.getPropertyValue('--c1').trim() || '#2f6db3', colores.getPropertyValue('--c2').trim() || '#c9772b']
  };
  function dibujar() {
    Object.keys(dr).forEach(function (n) {
      document.querySelectorAll('[data-draw="' + n + '"]').forEach(function (el) { try { dr[n](el); } catch (e) { console.error('Dibujo ' + n, e); } });
    });
  }
  window.Tablero = { iniciar: function () {
    var st = document.getElementById('app-estado');
    var incrustado = window.__DATOS;
    var json = function (u) { return incrustado ? Promise.resolve(incrustado[u]) : fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
    json('data/manifiesto.json').then(function (m) {
      var ids = Object.keys(m.archivos); ids.forEach(function (id) { estado[id] = 'loading'; });
      dibujar();
      return Promise.all(ids.map(function (id) {
        return json(m.archivos[id]).then(function (j) { raw[id] = j; estado[id] = 'ok'; }, function () { estado[id] = 'error'; });
      })).then(function () {
        cache = {}; dibujar();
        var f = new Date(m.construido);
        st.textContent = 'Datos actualizados el ' + f.toLocaleDateString('es-CL') + ' a las ' + f.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' · libro de control: ' + m.libro;
        if (ids.some(function (id) { return estado[id] === 'error'; })) { st.textContent += ' · algunos archivos no cargaron'; st.classList.add('error'); }
      });
    }).catch(function (e) { st.textContent = 'No se pudieron cargar los datos (' + e.message + '). Si abriste el archivo desde tu computador, usa el enlace de la app.'; st.classList.add('error'); });
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(dibujar, 250); });
  } };
})();
