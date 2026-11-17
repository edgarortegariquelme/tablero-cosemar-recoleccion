/* Arnés local del tablero: simula el entorno «dash» (loaders, calcs, drawings, params) con jsdom y d3,
   alimentado con el libro en forma de respuesta de vista de Notion (con sus escapes de Markdown). */
const S = process.env.HARNESS_MODULES ? process.env.HARNESS_MODULES.replace(/\/?$/, '/') : '';
const { JSDOM } = require(S + 'jsdom'), fs = require('fs'), path = require('path'), T = path.join(__dirname, '../tablero/store/');
const libro = JSON.parse(process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : 'null') || require('../datos/semilla.js');
const esc = s => typeof s === 'string' ? s.replace(/([_|$.\\])/g, '\\$1') : s;
function fila(e) { const r = { 'Clave': esc(e.clave), 'Módulo': e.modulo, 'Entidad': e.entidad || '', 'Hito': esc(e.hito || ''), 'Tipo de fecha': e.fechaTipo, 'Verificación': e.verificacion, 'Documento': esc(e.documento || ''), 'Respaldo': e.respaldo || '', 'Obligación': e.obligacion || '', 'Detalle': esc(e.detalle || ''), 'Origen': e.origen || '', 'N°': e.numero || '', 'Patente': e.patente || '', 'Sector': e.sector || '', 'Vigente': e.vigente === false ? '__NO__' : '__YES__', 'Versión': e.version || 1, 'Rectifica a': e.rectificaA || '', url: 'https://app.notion.com/p/x' + Math.random().toString(16).slice(2) };
  if (e.fecha) r['date:Fecha:start'] = e.fecha; if (e.monto != null) { r['Monto'] = e.monto; r['Unidad'] = e.unidadMonto; } return r; }
const grupos = { libro_san: ['Sanción', 'Hallazgo'], libro_pag: ['Pago', 'Reajuste'], libro_ven: ['Vencimiento'], libro_sis: ['Sistema', 'Control', 'Revisión', 'Error', 'Aviso'] };
const html = fs.readFileSync(T + 'index.html', 'utf8').replace(/<script src="[^"]+"><\/script>/g, '');
const dom = new JSDOM('<!doctype html><div id="dash-root">' + html + '</div>', { runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window; w.d3 = require(S + 'd3');
const errores = [], datasets = {}, loaders = {}, calcs = {}, draws = {}; let params = JSON.parse(fs.readFileSync(T + 'w_dash_params.json'));
Object.keys(grupos).forEach(k => { datasets[k] = { results: libro.filter(e => grupos[k].indexOf(e.modulo) >= 0).map(fila), has_more: false }; });
datasets.catalogo = JSON.parse(fs.readFileSync(T + 'catalogo.json'));
const cache = {};
function data(id) {
  if (cache[id]) return cache[id];
  try {
    if (calcs[id]) { const c = calcs[id], ins = c.inputs.map(i => data(i)); if (ins.some(x => x.status !== 'ok')) return { status: 'loading', data: null }; cache[id] = { status: 'ok', data: c.fn.apply(null, ins.map(x => x.data)) }; }
    else if (loaders[id]) { const o = loaders[id].fn({ answer: datasets[id] }); cache[id] = { status: 'ok', data: o.rows, truncated: o.truncated }; }
    else if (datasets[id]) cache[id] = { status: 'ok', data: datasets[id] };
    else cache[id] = { status: 'missing', data: [] };
  } catch (e) { errores.push('dataset ' + id + ': ' + e.stack.split('\n').slice(0, 2).join(' ')); cache[id] = { status: 'error', data: [] }; }
  return cache[id];
}
function redibujar() { Object.keys(draws).forEach(n => w.document.querySelectorAll('[data-draw="' + n + '"]').forEach(el => { if (el.closest('[hidden]')) return; try { draws[n](el); } catch (e) { errores.push('draw ' + n + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } })); }
w.dash = { data, loader: (id, o) => { loaders[id] = o; }, calc: (id, o) => { calcs[id] = o; }, draw: (n, fn) => { if (fn) draws[n] = fn; else redibujar(); }, onData: fn => fn(),
  params: () => Object.assign({}, params), setParams: o => { Object.assign(params, o); setTimeout(redibujar, 0); redibujar(); }, resetParams: () => {}, setLink: () => {}, refresh: () => {}, colors: ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)'] };
w.eval(fs.readFileSync(T + 'motor.js', 'utf8')); w.eval(fs.readFileSync(T + 'app.js', 'utf8'));
redibujar();
const q = s => w.document.querySelector(s), txt = s => (q(s) ? q(s).textContent.replace(/\s+/g, ' ').trim() : '(no existe)');
const out = {};
function ir(sec, p) { w.CosemarUI.ir(sec, p); redibujar(); }
out.portada = { resumen: txt('[data-draw="resumen"]'), kpi: ['k_vence', 'k_atraso', 'k_decision', 'k_porverificar', 'k_monto', 'k_meses', 'k_sinmonto', 'k_dif', 'k_sync'].map(k => k + '=' + txt('[data-draw="' + k + '"]')).join(' | '), plazos: q('[data-draw="tbl_san_plazo"]').children.length, timeline: txt('[data-draw="tl_contador"]'), svg: !!q('#cz-timeline svg') };
ir('portada', { periodo: '2026-10' }); out.filtroOctubre = txt('[data-draw="tl_contador"]'); ir('portada', { periodo: null, patente: 'TPPW41-0' }); out.filtroPatente = txt('[data-draw="tl_contador"]') + ' · ' + [...q('[data-draw="tl_lista"]').children].map(r => r.children[2].textContent + ':' + r.children[3].textContent.slice(0, 40)).join(' / '); ir('portada', { patente: null, sector: 'Flota' }); out.filtroSector = txt('[data-draw="tl_contador"]'); params.sector = null;
// abrir sanción desde la portada
const primera = q('[data-draw="tbl_san_plazo"] tr'); primera.dispatchEvent(new w.Event('click')); redibujar();
out.sancionDesdePortada = { visible: !q('#sanciones').hidden, ficha: txt('#ficha-sancion').slice(0, 900) };
ir('sanciones', { sancion: 'PS05' }); out.fichaPS05 = txt('#ficha-sancion').slice(0, 1400);
ir('pagos', { pago: '2026-09' }); out.pago09 = { esperado: txt('[data-draw="pm_esperado"]'), acto: txt('[data-draw="pm_acto"]'), oc: txt('[data-draw="pm_oc"]'), fact: txt('[data-draw="pm_fact"]'), rem: txt('[data-draw="pm_rem"]'), pag: txt('[data-draw="pm_pag"]'), obs: txt('[data-draw="pm_obs"]'), cadena: [...q('[data-draw="pag_cadena"] ol').children].map(li => li.firstChild.textContent).join(' | ') };
ir('pagos', { pago: '2026-05' }); out.pago05 = txt('[data-draw="pm_obs"]');
ir('vencimientos', { vgrupo: 'Garantía' }); out.garantia = [...q('[data-draw="ven_tabla"]').children].map(r => r.textContent.replace(/\s+/g, ' ').slice(0, 150));
ir('vencimientos', { vgrupo: 'Flota', patente: 'SZZJ80-4' }); out.flota = [...q('[data-draw="ven_tabla"]').children].map(r => r.textContent.replace(/\s+/g, ' ').slice(0, 120)); params.patente = null; params.vgrupo = null;
ir('obligaciones', { obligacion: 'OB-28' }); out.obligacion = txt('#obl-ficha').slice(0, 1100); out.matriz = q('[data-draw="obl_tabla"]').children.length;
ir('flujos', { sancion: 'PS05', pago: '2026-09' }); out.flujos = { n: w.document.querySelectorAll('.cz-flow').length, pasos: w.document.querySelectorAll('.cz-paso').length, hechos: w.document.querySelectorAll('.cz-paso.cz-hecho').length, activos: w.document.querySelectorAll('.cz-paso.cz-activo').length };
const pasoPago = [...w.document.querySelectorAll('#flujo-pago .cz-paso')][0]; pasoPago.dispatchEvent(new w.Event('click')); redibujar(); out.flujoPagoNavega = !q('#pagos').hidden;
ir('pendientes', {}); out.pendientes = q('[data-draw="pend_tabla"]').children.length + ' filas · tipos: ' + [...new Set(data('c_pendientes').data.map(r => r.tipo))].join(', ');
out.errores = errores;
console.log(JSON.stringify(out, null, 1));
process.exit(errores.length ? 1 : 0);
