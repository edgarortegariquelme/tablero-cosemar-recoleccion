/* Contrato de DISPOSICIÓN FINAL de RSD con Cosemar (P.P. 104/2024, ID 3447-187-LR24). Distinto del de recolección (3447-86-LR23).
   Fuente: memos DMAO de OC y de pago, OC, facturas, decretos y la planilla «RESUMEN MENSUAL PAGOS Y TON» en Google Drive, leídos el 18-11-2026.
   Genera tablero/store/disposicion_final_pagos.json y tablero/store/disposicion_final_alzas.json. Uso: node datos/disposicion_final.js */
const fs = require('fs'), path = require('path');
const u = id => id ? 'https://drive.google.com/file/d/' + id + '/view' : null;
const RESUMEN = u('1rFLD-PEOEuJV3oIgU2Nb0twgqDQL8SpX');

// Actos que fijan o proponen la tarifa neta por tonelada. capa: Contrato/Decreto = exigible; Solicitud/Trámite = no cambia el precio.
const A = [
  ['DF01', '2024-08-06', 'Bases', 'D.A. 6.771/2024 · Bases P.P. 104/2024', 'Precio por tonelada dispuesta. Reajuste en enero de cada año por la variación del IPC del año anterior informada por el INE, si es positiva (Título IX, art. 40 BT). Monto estimado del contrato: $5.200 millones en 5 años (art. 37).', null, null, 'Vigente', 'Mecanismo', '1IMVrrv23RZxJdSQjXOxB609VFaCcvl_n'],
  ['DF02', '2024-12-06', 'Decreto', 'D.A. 9.883/2024 · adjudicación', 'Adjudica a Cosemar S.A. por $14.836 neto por tonelada ($17.655 bruto unitario), del 01-01-2025 al 31-12-2029. Tomado de razón con alcances el 30-12-2024.', 14836, '2025-01', 'Vigente en 2025', 'Contrato', '1z1XOjQHk4U_FmlFfAbTq8HCnuctwzWkt'],
  ['DF03', '2025-03-13', 'Contrato', 'Contrato 13-01-2025 · aprobado por D.A. 1.548/2025', 'Precio de $14.836 neto por tonelada, no modificable salvo mutuo acuerdo (cláusula cuarta). Garantía de fiel cumplimiento por UF 6.850 (póliza 224109615).', 14836, '2025-01', 'Vigente', 'Contrato', '14BU2TzUFp9N6wbATNkKo3rK-mOvXQZWo'],
  ['DF04', '2025-05-06', 'Oficio', 'Oficio del Alcalde a Cosemar (2025, sin número)', 'Pide rebajar 35% la tarifa de 2025 ($9.642 neto por tonelada) mediante anexo, por falta de presupuesto. No se halló anexo ni decreto: todas las OC y facturas de 2025 están a $14.836, aunque los memos dicen «con un descuento del 30%».', 9642, null, 'Sin anexo: no aplicado', 'Solicitud', '1X-j3WnmgaYRaVGcL1Ww-5x49TLZIUfHF'],
  ['DF05', '2026-02-02', 'Carta Cosemar', 'Carta Cosemar 02-02-2026', 'Informa IPC 2025 de 3,5% y tarifa 2026 de $15.355 neto por tonelada.', 15355, '2026-01', 'Acogida por D.A. 2.737', 'Solicitud', '13fn_QFVrVeO2XHE5ZRxmhE07OCg2KNrT'],
  ['DF06', '2026-02-03', 'Memo DMAO', 'Memo 673/2026 (rectificado por memo 941/2026)', 'Pide decretar el reajuste IPC 2025. El memo 941 corrige el ID y la propuesta citados por error (3447-86-LR23 y P.P. 60/2023).', 15355, null, 'Decretado', 'Trámite', '13fn_QFVrVeO2XHE5ZRxmhE07OCg2KNrT'],
  ['DF07', '2026-05-07', 'Decreto', 'D.A. 2.737/2026 · reajuste IPC 2025', 'IPC 3,5%: tarifa de $14.836 a $15.355 neto por tonelada desde enero de 2026 (+$519). Estima $34.520.817 brutos de mayor gasto anual.', 15355, '2026-01', 'Ejecutado', 'Decreto', '13fn_QFVrVeO2XHE5ZRxmhE07OCg2KNrT'],
  ['DF08', '2026-05-26', 'Anexo', 'Anexo de contrato · cambio de razón social a Cosemar SpA (D.A. 3.097/2026)', 'Cambia la razón social; no modifica la tarifa.', null, null, 'Vigente', 'Trámite', '1RbS7mXeTOdod-iH90IU38xVnkabQ_fEA'],
  ['DF09', '2026-11-13', 'Memo DMAO', 'Borrador memo reajuste IPC 2027', 'Prepara el reajuste de enero de 2027 por el IPC 2026; el porcentaje está en blanco hasta que el INE publique el IPC de diciembre de 2026. Cita una comunicación de Cosemar del 13-11-2026.', null, '2027-01', 'Borrador', 'Trámite', '1_Ny4V5VvD1lkfoLVkceGncV_VyCqMqJf4mrFdLRGSJo']
];
// Promedio mensual de toneladas que cada acto usa para proyectar el gasto (texto del acto).
const PROY = { DF07: { ton: 4657.85, base: 2025 }, DF09: { ton: 4643.69, base: 2026 } };
const alzas = A.map(([id, fecha, tipo, acto, efecto, tarifa, rigeDesde, estado, capa, did]) => ({ id, fecha, tipo, acto, efecto, tarifaNeta: tarifa, rigeDesde, estado, capa, tonProyeccion: PROY[id] ? PROY[id].ton : null, anioBaseProyeccion: PROY[id] ? PROY[id].base : null, respaldo: u(did) }));
const tarifa = p => alzas.filter(a => ['Contrato', 'Decreto'].includes(a.capa) && a.rigeDesde && a.rigeDesde <= p && a.tarifaNeta).sort((a, b) => a.rigeDesde < b.rigeDesde ? -1 : 1).pop();

// periodo, toneladas, bruto tramitado, estado, OC, factura, memo OC, memo pago, fecha memo pago, id respaldo, nota
const P = [
  ['2025-01', 4732.52, 83551884, 'Remitido a pago', '3447-1840-SE25', '37212', 'Memo 321/2025', 'Memo 1303/2025', '2025-07-23', '1jIzQUeBjP9OlLT_r-OOsYplD9e4z8HZC', 'El memo cita por error la licitación 3447-186-LR24 y el D.A. 9431.'],
  ['2025-02', 4208.03, 74292096, 'Remitido a pago', '3447-2165-SE25', '41010', 'Memo 1153/2025', 'Memo 1259/2025', '2025-07-15', '1yiubOBqgzNZJXUbXMTK8ubAuBz9ntwSe', ''],
  ['2025-03', 4704.84, 83063197, 'Remitido a pago', '3447-2165-SE25', '41011', 'Memo 1153/2025', 'Memo 1259/2025', '2025-07-15', '1yiubOBqgzNZJXUbXMTK8ubAuBz9ntwSe', 'El memo cita también la OC 3447-2105-SE25: confirmar cuál corresponde a marzo.'],
  ['2025-04', 4381.33, 77351680, 'Remitido a pago', '3447-2467-SE25', '41783', 'Memo 1378/2025', 'Memo 1486/2025', '2025-08-20', '1NMj6WNDUvATiaaPseAWtiiOt2zp8t4rT', ''],
  ['2025-05', 4351.53, 76825566, 'Remitido a pago', '3447-3047-SE25', '42650', 'Memo 1678/2025', 'Memo 1843/2025', '2025-10-15', '1YhOiFJaJSBA7nGZM8_QDcps2g_chOb5n', ''],
  ['2025-06', 4472.16, 78955269, 'Remitido a pago', '3447-3049-SE25', '42654', 'Memo 1678/2025', 'Memo 1843/2025', '2025-10-15', '1YhOiFJaJSBA7nGZM8_QDcps2g_chOb5n', ''],
  ['2025-07', 4498.51, 79420474, 'OC solicitada', null, null, 'Memo 1820/2025', null, null, '1IUy1VShrEYU8NctStna9_nPB-1U-VVlt', 'En Drive solo se halló el memo que pide la OC (09-10-2025).'],
  ['2025-08', 4365.09, 77064966, 'OC solicitada', null, null, 'Memo 1820/2025', null, null, '1IUy1VShrEYU8NctStna9_nPB-1U-VVlt', 'En Drive solo se halló el memo que pide la OC (09-10-2025).'],
  ['2025-09', 4584.59, 80940203, 'Remitido a pago', null, '45304', null, 'Memo 297-A/2026', '2026-02-26', '1B-IrskA3gbUaGvHJ06b8yIGcYEX0Owne', 'Pagado junto con oct–dic 2025 como deuda por falta de presupuesto 2025.'],
  ['2025-10', 4516.40, 79736319, 'Remitido a pago', null, '45305', null, 'Memo 297-A/2026', '2026-02-26', '1B-IrskA3gbUaGvHJ06b8yIGcYEX0Owne', ''],
  ['2025-11', 4563.19, 80562389, 'Remitido a pago', null, '46106', null, 'Memo 297-A/2026', '2026-02-26', '1B-IrskA3gbUaGvHJ06b8yIGcYEX0Owne', ''],
  ['2025-12', 5514.32, 97354438, 'Remitido a pago', null, '46104', null, 'Memo 297-A/2026', '2026-02-26', '1B-IrskA3gbUaGvHJ06b8yIGcYEX0Owne', ''],
  ['2026-01', 4684.08, 85589617, 'Remitido a pago', '3447-1438-SE26', '50348', 'Memo 1045/2026', 'Memo 1110/2026', '2026-05-29', '10bgVso1tqqtkMxxBj_bICcTmKP36QKmF', 'Factura por $85.589.617; el memo 1045 y la planilla dicen $85.589.618 (redondeo).'],
  ['2026-02', 4224.68, 77195254, 'Remitido a pago', '3447-1440-SE26', '50349', 'Memo 1045/2026', 'Memo 1113/2026', '2026-05-29', '1EeF6VtV5BjEdLrA3CGvckJCOOWv3fuvJ', ''],
  ['2026-03', 4885.44, 89268958, 'Remitido a pago', '3447-1441-SE26', '50351', 'Memo 1045/2026', 'Memo 1114/2026', '2026-05-29', '1EeF6VtV5BjEdLrA3CGvckJCOOWv3fuvJ', 'Existe además un borrador de memo de pago de marzo del 08-11-2026 (factura 50.351).'],
  ['2026-04', 4483.29, 81920692, 'Remitido a pago', '3447-1443-SE26', '50352', 'Memo 1045/2026', 'Memo 1115/2026', '2026-05-29', '1wbDVDzpnxBpEhNN7tIHeCLzGqJPdbfxr', ''],
  ['2026-05', 4238.30, 77444125, 'Remitido a pago', '3447-1578-SE26', '50749', 'Memo 1142/2026', 'Memo 1261/2026', '2026-06-15', '1LOmmR2QiGO6TuTZqRYg69yH-tlYPopJK', 'La planilla de control anota el memo 1.115 como memo de pago de mayo; el memo de pago es el 1261/2026.'],
  ['2026-06', 4518.19, 82558400, 'Remitido a pago', '3447-1938-SE26', '51675', 'Memo 1382/2026', 'Memo 1523/2026', '2026-07-22', '1xGVU9AukyeUTHOHH1Fx3KrzjYiB2pTIp', 'La planilla de control dice $82.558.401 (redondeo).'],
  ['2026-07', 4373.10, 79907251, 'Remitido a pago', '3447-2256-SE26', '52729', 'Memo 1614/2026', 'Memo 1767/2026', '2026-08-26', '1ZIUH2xC9Hkog3TwMYmi_3dpETbpjISKj', 'El archivo «1767.2026 … FACTURA 52719 JULIO» contiene otro memo (prevención de riesgos); la planilla y la matriz citan la factura 52729. La matriz dice $79.907.252.'],
  ['2026-08', 5214.00, 95272554, 'Remitido a pago', '3447-2555-SE26', '53624', 'Memo 1812/2026', 'Memo 1982/2026', '2026-09-30', '1LwoH-A7V8X7PcMKq1xHL44QAoDYc3EPw', 'El memo dice «el servicio para el mes de junio»: error de redacción, la tabla es de agosto.'],
  ['2026-09', 5047.20, 92224710, 'Remitido a pago', '3447-2865-SE26', '54243', 'Memo 2006/2026', 'Memo 2118/2026', '2026-10-21', '1_-VtKy7wzamAElHQ7phi8R1T6bVP3_gm', ''],
  ['2026-10', 4770.04, 87160317, 'OC solicitada', null, null, 'Memo 2214/2026', null, null, '1LAdb5LTmxfs3Nm-wmvVjBEiPgM0HgNcB', 'OC pedida el 05-11-2026; sin factura ni memo de pago aún.']
];
// Confirmación del encargado del contrato (18-11-2026): pagado todo 2025 y 2026 hasta septiembre.
const PAGADO_HASTA = '2026-09', CONFIRMA = 'Pago confirmado por el encargado del contrato (18-11-2026).';
const rows = P.map(([periodo, ton, tram, estado0, oc, factura, memoOC, memoPago, fechaMemoPago, did, nota0], i) => {
  const t = tarifa(periodo), neto = Math.round(ton * t.tarifaNeta), debido = Math.round(neto * 1.19);
  const pagado = periodo <= PAGADO_HASTA, estado = pagado ? 'Pagado' : estado0, nota = pagado ? [nota0, CONFIRMA].filter(Boolean).join(' ') : nota0;
  return { periodo, anio: +periodo.slice(0, 4), mesServicio: i + 1, toneladas: ton, tarifaNeta: t.tarifaNeta, actoTarifa: t.acto, debidoNeto: neto, debido, tramitado: tram, diferencia: tram - debido,
    estado, pagado, oc, factura, memoOC, memoPago, fechaMemoPago, respaldo: u(did) || RESUMEN, nota: nota || null,
    // DAF confirmó el 27-11-2026 que los comprobantes de egreso de los meses pagados están conformes (sin fecha de egreso informada).
    comprobante: pagado ? 'Comprobante de egreso conforme (confirmado por DAF el 27-11-2026)' : null, fechaComprobante: null, comprobanteRespaldo: pagado ? (u(did) || RESUMEN) : null };
});
const meta = f => [{ label: 'Fuente', value: f }, { label: 'Leído', value: '18-11-2026, desde Google Drive' }, { label: 'Generado por', value: 'datos/disposicion_final.js (repositorio tablero-cosemar-recoleccion)' }];
const out = path.join(__dirname, '..', 'tablero', 'store');
fs.writeFileSync(path.join(out, 'disposicion_final_pagos.json'), JSON.stringify({ rows, meta: meta('Memos DMAO de OC y pago, OC, facturas de Cosemar y la planilla RESUMEN MENSUAL PAGOS Y TON') }, null, 1));
fs.writeFileSync(path.join(out, 'disposicion_final_alzas.json'), JSON.stringify({ rows: alzas, meta: meta('Bases, D.A. 9.883/2024, contrato y D.A. 1.548/2025, D.A. 2.737/2026, oficio de rebaja 2025, carta Cosemar y memos DMAO') }, null, 1));

// Verificación y resumen
const res = {};
rows.forEach(r => { const y = res[r.anio] = res[r.anio] || { meses: 0, toneladas: 0, debido: 0, tramitado: 0, diferencia: 0, sinMemoPago: 0 }; y.meses++; y.toneladas += r.toneladas; y.debido += r.debido; y.tramitado += r.tramitado; y.diferencia += r.diferencia; if (!r.pagado) y.sinMemoPago += r.tramitado; });
Object.entries(res).forEach(([y, v]) => { v.toneladas = Math.round(v.toneladas * 100) / 100; v.promedioTon = Math.round(v.toneladas / v.meses * 100) / 100; console.log(y, JSON.stringify(v)); });
rows.filter(r => Math.abs(r.diferencia) > 1000).forEach(r => console.log('DIFERENCIA >1000', r.periodo, r.diferencia));
rows.filter(r => Math.abs(r.diferencia) > 0 && Math.abs(r.diferencia) <= 1000).forEach(r => console.log('redondeo', r.periodo, r.diferencia));
console.log('meses', rows.length, 'actos', alzas.length);
