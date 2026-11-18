/* Plan de pago COSEMAR (recolección 3447-86-LR23), versión vigente del 17-11-2026 en Notion:
   https://app.notion.com/p/41b9e3e655c081e6a717e4034132988d
   Genera tablero/store/plan_pago.json: una fila por componente pagado (mes de pago × mes de servicio × componente).
   Uso: node datos/plan_pago.js */
const fs = require('fs'), path = require('path');
const NOTION = 'https://app.notion.com/p/41b9e3e655c081e6a717e4034132988d';
const BASE = 261767423, POB = 6172583, IPC = 11255999; // D.A. 2.459, diferencia D.A. 3.957, IPC 4,3% propuesto
const C = { base: 'Mensualidad (D.A. 2.459)', pob: 'Aumento poblacional (D.A. 3.957)', ipc: 'IPC 4,3% (sin decreto)' };
const rows = [];
const add = (mesPago, servicio, comp, monto, concepto) => rows.push({ clave: mesPago + '|' + servicio + '|' + comp, mesPago, servicio, componente: C[comp], tipo: comp, monto, decretado: comp !== 'ipc', concepto, respaldo: NOTION });
const s26 = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
s26.forEach(s => add('2026-12', s, 'pob', POB, 'Aumento poblacional julio–diciembre 2026'));
add('2027-02', '2026-10', 'base', BASE, 'Octubre 2026');
s26.forEach(s => add('2027-02', s, 'ipc', IPC, 'IPC acumulado julio–diciembre 2026'));
add('2027-03', '2026-11', 'base', BASE, 'Noviembre 2026'); add('2027-03', '2026-12', 'base', BASE, 'Diciembre 2026');
const p27 = { '2027-01': '2027-04', '2027-02': '2027-04', '2027-03': '2027-05', '2027-04': '2027-06', '2027-05': '2027-07', '2027-06': '2027-07', '2027-07': '2027-08', '2027-08': '2027-09', '2027-09': '2027-10', '2027-10': '2027-11', '2027-11': '2027-12' };
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
Object.entries(p27).forEach(([s, p]) => { const c = MESL[+s.slice(5) - 1] + ' 2027 (mensualidad reajustada)'; add(p, s, 'base', BASE, c); add(p, s, 'pob', POB, c); add(p, s, 'ipc', IPC, c); });
const total = rows.reduce((t, r) => t + r.monto, 0);
if (total !== 3961029816) throw new Error('El plan no cuadra con Notion: ' + total);
const meta = [{ label: 'Fuente', value: 'Notion · Plan de pago COSEMAR · diciembre 2026 a marzo 2027, sección «Actualización vigente del flujo de caja · 17-11-2026»' }, { label: 'Leído', value: '17-11-2026' }, { label: 'Generado por', value: 'datos/plan_pago.js (repositorio tablero-cosemar-recoleccion)' }];
fs.writeFileSync(path.join(__dirname, '..', 'tablero', 'store', 'plan_pago.json'), JSON.stringify({ rows, meta }, null, 1));
const porMes = {}; rows.forEach(r => porMes[r.mesPago] = (porMes[r.mesPago] || 0) + r.monto);
console.log('filas', rows.length, 'total', total, 'IPC sin decreto', rows.filter(r => r.tipo === 'ipc').reduce((t, r) => t + r.monto, 0)); console.log(porMes);
