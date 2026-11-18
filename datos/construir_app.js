/* Construye la app independiente en docs/ (GitHub Pages): copia el código del tablero y los datos JSON.
 * El libro de control sale de docs/data/notion/*.json si existe (lo escribe datos/exportar_notion.js con la API de Notion);
 * si no, de la semilla del repositorio más los pagos confirmados y datos/libro_novedades.json (filas agregadas a Notion después de la carga; mismo contenido que Notion).
 * Uso: node datos/construir_app.js */
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), T = path.join(R, 'tablero/draft'), S = path.join(R, 'tablero/store'), D = path.join(R, 'docs'), DATA = path.join(D, 'data');
fs.mkdirSync(path.join(D, 'js'), { recursive: true }); fs.mkdirSync(DATA, { recursive: true });
['motor.js', 'app.js', 'operacion.js'].forEach(f => fs.copyFileSync(path.join(T, f), path.join(D, 'js', f)));

// Datos de archivo: mismo nombre que en tablero/store
const ARCH = { pagos_contrato: 'pagos_contrato', alzas: 'alzas_contrato', plan_pago: 'plan_pago', df_pagos: 'disposicion_final_pagos', df_alzas: 'disposicion_final_alzas', catalogo: 'catalogo',
  manifolds: 'manifolds', correos: 'correos', flota: 'flota', personal: 'personal', subdere: 'subdere', antecedentes: 'antecedentes', ciclo_fechas: 'ciclo_fechas', resumenes: 'resumenes', imposiciones: 'imposiciones' };
const mapa = {};
Object.keys(ARCH).forEach(id => { fs.copyFileSync(path.join(S, ARCH[id] + '.json'), path.join(DATA, ARCH[id] + '.json')); mapa[id] = 'data/' + ARCH[id] + '.json'; });

// Libro de control: Notion exportado o semilla
const G = { libro_san: ['Sanción', 'Hallazgo'], libro_pag: ['Pago', 'Reajuste'], libro_ven: ['Vencimiento'], libro_sis: ['Sistema', 'Control', 'Revisión', 'Error', 'Aviso'] };
const NOT = path.join(DATA, 'notion'); let origen;
if (Object.keys(G).every(k => fs.existsSync(path.join(NOT, k + '.json')))) {
  Object.keys(G).forEach(k => { mapa[k] = 'data/notion/' + k + '.json'; }); origen = 'Notion (datos/exportar_notion.js)';
} else {
  const libro = require('./semilla.js').concat(require('../pruebas/pagos_confirmados.json'), require('./libro_novedades.json'));
  const esc = s => typeof s === 'string' ? s.replace(/([_|$.\\])/g, '\\$1') : s;
  const fila = e => { const r = { 'Clave': esc(e.clave), 'Módulo': e.modulo, 'Entidad': e.entidad || '', 'Hito': esc(e.hito || ''), 'Tipo de fecha': e.fechaTipo, 'Verificación': e.verificacion,
    'Documento': esc(e.documento || ''), 'Respaldo': e.respaldo || '', 'Obligación': e.obligacion || '', 'Detalle': esc(e.detalle || ''), 'Origen': e.origen || '', 'N°': e.numero || '',
    'Patente': e.patente || '', 'Sector': e.sector || '', 'Vigente': '__YES__', 'Versión': e.version || 1 };
    if (e.fecha) r['date:Fecha:start'] = e.fecha; if (e.monto != null) { r['Monto'] = e.monto; r['Unidad'] = e.unidadMonto; } return r; };
  Object.keys(G).forEach(k => { fs.writeFileSync(path.join(DATA, k + '.json'), JSON.stringify({ results: libro.filter(e => G[k].includes(e.modulo)).map(fila) })); mapa[k] = 'data/' + k + '.json'; });
  origen = 'Semilla del repositorio + pagos confirmados + novedades del libro';
}
// La fecha de construcción solo cambia si cambian los datos (evita commits vacíos cada hora)
const crypto = require('crypto'), huella = crypto.createHash('sha1');
Object.values(mapa).sort().forEach(f => huella.update(fs.readFileSync(path.join(D, f), 'utf8').replace(/"exportado":"[^"]*"/, '')));
const h = huella.digest('hex'), MAN = path.join(DATA, 'manifiesto.json'), prev = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : {};
fs.writeFileSync(MAN, JSON.stringify({ construido: prev.huella === h ? prev.construido : new Date().toISOString(), huella: h, libro: origen, archivos: mapa }, null, 1));

// Página: index del tablero con cabecera propia, tokens de color y scripts locales
let cuerpo = fs.readFileSync(path.join(T, 'index.html'), 'utf8').replace('<meta name="dash-one-writer">', '').replace(/<script src="[^"]+"><\/script>\s*/g, '');
const head = fs.readFileSync(path.join(__dirname, 'app_head.html'), 'utf8');
fs.writeFileSync(path.join(D, 'index.html'), head + cuerpo + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>\n<script src="js/runtime.js"></script>\n<script src="js/motor.js"></script>\n<script src="js/app.js"></script>\n<script src="js/operacion.js"></script>\n<script>Tablero.iniciar();</script>\n</body>\n</html>\n');
fs.writeFileSync(path.join(D, '.nojekyll'), '');

// Versión de un solo archivo (sin publicar): datos y scripts incrustados; se abre con doble clic.
const incr = { 'data/manifiesto.json': JSON.parse(fs.readFileSync(path.join(DATA, 'manifiesto.json'), 'utf8')) };
Object.values(mapa).forEach(f => { incr[f] = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); });
// Imágenes de la flota incrustadas en la versión de un solo archivo
const fl = incr[mapa.flota]; (fl.rows || []).forEach(r => { if (r.imagen && fs.existsSync(path.join(D, r.imagen))) r.imagen = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(D, r.imagen)).toString('base64'); });
const js = f => '<script>' + fs.readFileSync(path.join(D, 'js', f), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>';
const datos = '<script>window.__DATOS=' + JSON.stringify(incr).replace(/</g, '\\u003c') + ';</script>';
fs.writeFileSync(path.join(R, 'entregables', 'Control_Cosemar.html'), head + cuerpo + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>\n' + datos + '\n' + ['runtime.js', 'motor.js', 'app.js', 'operacion.js'].map(js).join('\n') + '\n<script>Tablero.iniciar();</script>\n</body>\n</html>\n');
console.log('App construida en docs/ · libro:', origen, '· datasets:', Object.keys(mapa).length);
