/* Calcula las alertas de la app (cálculo c_alertas de docs/js/operacion.js) en Node, con los mismos datos que publica la app.
   Uso: const { alertas } = require('./alertas'); alertas() → [{ nivel, contrato, texto, fecha }] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const DOCS = path.join(__dirname, '../docs');

function alertas(fechaHoy) {
  const man = JSON.parse(fs.readFileSync(path.join(DOCS, 'data/manifiesto.json'), 'utf8'));
  const raw = {}; Object.keys(man.archivos).forEach(id => { raw[id] = JSON.parse(fs.readFileSync(path.join(DOCS, man.archivos[id]), 'utf8')); });
  const ld = {}, cc = {}, cache = {};
  function data(id) {
    if (cache[id]) return cache[id];
    if (cc[id]) { const ins = cc[id].inputs.map(data); cache[id] = { status: 'ok', data: cc[id].fn.apply(null, ins.map(x => x.data)) }; }
    else if (raw[id] !== undefined) { const r = raw[id]; cache[id] = { status: 'ok', data: ld[id] ? ld[id].fn({ answer: r }).rows : (r && Array.isArray(r.rows) ? r.rows : r) }; }
    else throw new Error('Falta el dataset ' + id);
    return cache[id];
  }
  const RealDate = Date;
  class FechaFija extends RealDate { constructor(...a) { if (a.length) super(...a); else super(fechaHoy ? fechaHoy + 'T12:00:00-03:00' : RealDate.now()); } static now() { return fechaHoy ? new RealDate(fechaHoy + 'T12:00:00-03:00').getTime() : RealDate.now(); } }
  const doc = { querySelectorAll: () => [], getElementById: () => null, documentElement: {} };
  const ctx = { console, Intl, Math, JSON, Date: fechaHoy ? FechaFija : Date, document: doc, getComputedStyle: () => ({ getPropertyValue: () => '' }) };
  ctx.window = ctx; ctx.dash = { data, loader: (i, o) => ld[i] = o, calc: (i, o) => cc[i] = o, draw() {}, params: () => ({}), setParams() {}, setLink() {}, colors: ['#2f6db3', '#c9772b'] };
  vm.createContext(ctx);
  ['motor.js', 'app.js', 'operacion.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(DOCS, 'js', f), 'utf8'), ctx, { filename: f }));
  return data('c_alertas').data;
}

// Clave estable de una alerta: sin la cuenta regresiva de días, para no repetir el aviso cada día.
const clave = a => a.clave || (a.nivel + '|' + a.contrato + '|' + a.texto).replace(/\s*\((en \d+ días|hoy|mañana)\)/g, '').replace(/\s+/g, ' ').trim();

module.exports = { alertas, clave };
if (require.main === module) console.log(JSON.stringify(alertas(process.argv[2]), null, 1));
