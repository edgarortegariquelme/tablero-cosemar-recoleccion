/* Histórico de pagos y alzas del contrato de recolección Cosemar (P.P. 060/2023, ID 3447-86-LR23).
   Fuente: memos de pago DMAO, OC, facturas y decretos en Google Drive, leídos el 17-11-2026.
   Genera dos archivos para el tablero: pagos_contrato.json (un registro por mes de servicio) y alzas_contrato.json (cronología de actos).
   Uso: node datos/historico_pagos.js */
const fs = require('fs'), path = require('path');
const D = 'https://drive.google.com/file/d/', V = '/view';
const u = id => id ? D + id + V : null;
const CARPETA_2026 = 'https://drive.google.com/drive/folders/122zU1bsRlvC_jVNQFqdZMW2kVyYhXfzo';
const MATRIZ_2026 = u('1zUJhueNebAnVzxceUcPTUYYIEMCNzBzw');

const B0 = 244618475, B1 = 261767423;
// Retroactivo D.A. 2.459/2026: factura 50.836 por $154.340.525 (memo 1300/2026) cubre jul-2025 a mar-2026.
// Se asigna a cada mes la diferencia mensual (B1 - B0 = $17.148.948); marzo absorbe el redondeo del decreto ($7 menos).
const RETRO_TOTAL = 154340525, RETRO_MES = B1 - B0;
const mesesRetro = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
const retro = {}; mesesRetro.forEach((m, i) => { retro[m] = i < 8 ? RETRO_MES : RETRO_TOTAL - RETRO_MES * 8; });

// periodo, tramitado (bruto IVA incl.), estado, memo, factura, OC, id Drive del respaldo, nota
const P = [
  ['2024-07', B0, 'Remitido a pago', 'Memo 1423/2024', '32996', '3447-3210-SE24', '1muV80lYt0HArzRiknm7YcnRmE7lyRQuy', 'Primer mes. Proceso sancionatorio 1 sin multa (D.A. 6.579/2024).'],
  ['2024-08', B0, 'Remitido a pago', 'Memo 1596/2024', '33681', '3447-3617-SE24', '1rBxM8cBXTNGKc94pI9EbT1spyUDu2_iQ', ''],
  ['2024-09', B0, 'Remitido a pago', 'Memo 1844/2024', '34154', '3447-3901-SE24', '1n0bPMjTSMPv69rBy56ggUB9DV44JR1yD', ''],
  ['2024-10', B0, 'OC solicitada', 'Memo 1011/2024 (pide OC)', null, null, '1sPgDKkD4LPeCHl_r2ATkpZ3opj4mo5C1', 'En Drive solo está el memo que pide la OC; no se halló el memo de pago ni la factura de octubre 2024.'],
  ['2024-11', B0, 'Remitido a pago', 'Memo 2107/2024', '35546', '3447-4672-SE24', '14ke264VEL45bOii1RY6BDCVKsMqtu0oL', ''],
  ['2024-12', B0, 'Remitido a pago', 'Memo 138/2025', '36338', '3447-159-SE25', '1Y45O1_SvttmU51GlimF3KdvMYoVLHCIs', ''],
  ['2025-01', B0, 'Remitido a pago', 'Memo 457/2025', '37637', '3447-683-SE25', '1KkOY-c_XzX-MrSe8ShF5ANSD1eUHlNJQ', ''],
  ['2025-02', B0, 'Remitido a pago', 'Memo 423/2025', '37837', '3447-779-SE25', '1xYb9lRu1UMqq32ZFyF3tF7KzrM-ShB3C', ''],
  ['2025-03', B0, 'Remitido a pago', 'Memo 714/2025', '38658', '3447-1169-SE25', '1k24z2EQ36oF1JlCEKoFc2584zawQeqVh', 'El archivo se llama «MEMO 423.2025 … MARZO»; el texto es el memo 714/2025.'],
  ['2025-04', B0, 'Remitido a pago', 'Memo 886/2025', '39296', '3447-1504-SE25', '1TW6731xYQNgcyaAjtQ_Pj9fcS2GZuPGe', ''],
  ['2025-05', B0, 'Remitido a pago', 'Memo 1028/2025', '40107', '3447-1830-SE25', '1tvQ0Wc39QqnvOzbnmXweI-ATS6DDn51V', ''],
  ['2025-06', B0, 'Remitido a pago', 'Memo 1285/2025', '40997', '3447-2162-SE25', '1L6MS0v8n6AP_fhWe_mFvxSOjVkj5B2Al', ''],
  ['2025-07', B0, 'Remitido a pago', 'Memo 1485/2025', '41847', '3447-2488-SE25', '1tWKUJjTWZBSiSltuzR6GWvWZ4OMxbMjk', 'El certificado de recepción cita la factura 41877; el memo, la 41847.'],
  ['2025-08', B0, 'Remitido a pago', 'Memo 1771/2025', '42835', '3447-2881-SE25', '1HEnqHSuRnMPa_z0GawolEDtr5XXFCXkb', ''],
  ['2025-09', B0, 'Remitido a pago', 'Memo 1876/2025', '43550', '3447-3325-SE25', '1-Nb1aQC_r3MFv73iiZQgA7wRPqFHGOW-', 'El certificado de recepción repite la factura 42835 de agosto.'],
  ['2025-10', B0, 'Remitido a pago', 'Memo 2083/2025', '44508', '3447-4438-SE25', '149HBo1dEF57kp_mmCJ3bVzOfYA59WmON', ''],
  ['2025-11', B0, 'Remitido a pago', 'Memo 2264/2025', '45444', '3447-4847-SE25', '1NB78X8hXziAIN_Q6twyteLlbGOGmHw5s', 'El certificado adjunto es el de octubre 2025.'],
  ['2025-12', B0, 'Remitido a pago', 'Memo 274/2026', null, '3447-88-SE26', null, 'OC «sin reajuste». El archivo del memo 274/2026 contiene el texto del memo de octubre 2025: monto por verificar contra el memo firmado.'],
  ['2026-01', B0, 'Remitido a pago', 'Memo 408/2026', null, null, null, 'Monto según matriz de pagos 2026.'],
  ['2026-02', B0, 'Remitido a pago', 'Memo 642/2026', null, null, null, 'Memo de OC sin número («X»). Monto según matriz de pagos 2026.'],
  ['2026-03', B0, 'Remitido a pago', 'Memo 961/2026', null, null, null, 'Faltan OC y factura individualizadas (matriz de pagos 2026).'],
  ['2026-04', B1, 'Remitido a pago', 'Memo 1231/2026', '50602', '3447-1576-SE26', null, 'Primer mes al valor del D.A. 2.459/2026.'],
  ['2026-05', B1, 'Remitido a pago', 'Memo 1301/2026', '50762', '3447-1577-SE26', null, 'OC 3447-1625-SE26 reemplazada por la 3447-1577-SE26.'],
  ['2026-06', B1, 'Remitido a pago', 'Memo 1570/2026', '51859', '3447-1940-SE26', '1HlVe7IM4cweT6WmuYU1hP8nZW8qQJzve', 'Descuenta multa de 60 UTM ($4.193.340) por D.A. 2.463 y 3.649/2026.'],
  ['2026-07', B1, 'Remitido a pago', 'Memo 1797/2026', '52576', '3447-2357-SE26', '1JkBJRy0KFRCXrbucmu5MEDxk9rhRmuRL', 'Facturado al valor del D.A. 2.459 aunque rige el D.A. 3.957/2026.'],
  ['2026-08', B1, 'Remitido a pago', 'Memo 1964/2026', '53591', '3447-2586-SE26', '1737FAKfRuAcEDcMqBVr-vgKhL7vTDdsA', 'Facturado al valor del D.A. 2.459 aunque rige el D.A. 3.957/2026.'],
  ['2026-09', B1, 'Remitido a pago', 'Memo 2111/2026', '54395', '3447-2948-SE26', '1py1mDc2v2TbQZ4o4y3ZEyImVv8hsdV9L', 'Facturado al valor del D.A. 2.459 aunque rige el D.A. 3.957/2026.'],
  ['2026-10', B1, 'OC solicitada', 'Memo 2211/2026 (pide OC)', null, null, '1mx8cKl4eLUxuUS_BiPfC1eBRm4rpt32-', 'OC pedida al valor del D.A. 2.459; aún sin memo de pago.']
];
const MULTAS = { '2026-06': 4193340 };

const rows = P.map(([periodo, tramitado, estado, memo, factura, oc, id, nota], i) => ({
  periodo, anio: Number(periodo.slice(0, 4)), mesServicio: i + 1, estado, tramitado, multa: MULTAS[periodo] || 0,
  ajusteRetro: retro[periodo] || 0, ajusteRetroPagadoEn: retro[periodo] ? '2026-06' : null,
  memo, factura, oc, respaldo: id ? u(id) : (periodo >= '2026-01' && periodo <= '2026-05' ? MATRIZ_2026 : CARPETA_2026), nota: nota || null
}));
const suma = rows.reduce((t, r) => t + r.ajusteRetro, 0);
if (suma !== RETRO_TOTAL) throw new Error('El retroactivo asignado no cuadra: ' + suma);

// Cronología de alzas. capa: Contrato y Decreto fijan lo exigible; «Bases sin decreto» es el derecho devengado por art. 9 BA
// que el municipio no ha formalizado; «Solicitud» y «Trámite» no cambian el precio.
const A = [
  ['A01', '2023-09-05', 'Bases', 'D.A. 6.424/2023 · Bases art. 9 BA y art. 64 BT', 'Reajuste anual por IPC sobre sueldos y combustible (art. 9 BA) y aumento por viviendas nuevas, 0,065 UTM por vivienda (art. 64 BT).', null, null, null, 'Vigente', 'Mecanismo', '1J4Lv8tlB89BBV4zbpJRV_vY77kzpmyg4'],
  ['A02', '2024-06-28', 'Contrato', 'D.A. 5.665/2024 · contrato', 'Valor mensual original desde el 01-07-2024.', 205561744, 244618475, '2024-07', 'Vigente hasta mar-2026', 'Contrato', '1FbmAP0IpXkvuVtxjyAaSsYGKmltIKTCa'],
  ['A03', '2025-07-22', 'Carta Cosemar', 'Carta Cosemar 22-07-2025', 'Pide IPC 4,1% (jun-24 a jun-25) según art. 9.', 213989776, 254647833, '2025-07', 'Superada por el D.A. 2.459', 'Solicitud', '1KF2tno9T3kaK7NrnMC4roXbPb5lJ_hL-'],
  ['A04', '2025-10-09', 'Memo DMAO', 'Memo 1799/2025', 'Pide decreto por IPC 4,3% más 1.100 viviendas. No prosperó: saldo presupuestario negativo 2025.', 219033587, 260649966, null, 'No prosperó', 'Trámite', '1KF2tno9T3kaK7NrnMC4roXbPb5lJ_hL-'],
  ['A05', '2025-12-31', 'Memo DMAO', 'Memo 2245/2025', 'Pide decreto por IPC 4,3% más 1.533 viviendas y pago de diferencias ago–dic 2025. Superado.', 221364988, 263424336, null, 'No prosperó', 'Trámite', '16pLkdeWAAIwTzLhL6lyGh_9Ptfcjb91u'],
  ['A06', '2026-04-24', 'Decreto', 'D.A. 2.459/2026', 'IPC 4,1% más 1.317 viviendas ($5.982.849 neto). Rige desde jul-2025: autoriza pagar 9 meses de diferencia (jul-25 a mar-26) y fija el valor desde abr-2026.', 219972624, 261767423, '2025-07', 'Ejecutado', 'Decreto', null],
  ['A07', '2026-06-18', 'Pago', 'Memo 1300/2026 · factura 50.836', 'Pide pagar $154.340.525 por las diferencias jul-2025 a mar-2026 (OC 3447-1654-SE26).', null, 154340525, null, 'Remitido a pago', 'Trámite', '1EaEx2N4cNVFjM3SbbiqUPY8IoaIu_x2p'],
  ['A08', '2026-07-02', 'Decreto', 'D.A. 3.957/2026', '1.116 viviendas nuevas (72,54 UTM = $5.187.045 neto) desde el 01-07-2026. Decretado; OC y facturas siguen al valor anterior.', 225159669, 267940006, '2026-07', 'Decretado, no aplicado', 'Decreto', '1FZho0ukoYZ65ogCziTYOub3AJS7EAj4n'],
  ['A09', '2026-07-10', 'Carta Cosemar', 'Carta Cosemar 10-07-2026', 'Pide IPC 4,3% (jun-25 a jun-26) por art. 9. Calculó sobre $213.989.776; corrigió el 14-07-2026 a la base decretada y coincide con DMAO.', 229431447, 273023422, '2026-07', 'Concordada, sin decreto', 'Solicitud', '1g3l6kVOd8r6gtrjAn9YMx1DK1nEfGdDM'],
  ['A10', '2026-07-15', 'Memo DMAO', 'Memo 1490/2026', 'Pide al Secretario Municipal decretar el IPC 4,3%.', 229431447, 273023422, null, 'Sin decreto', 'Trámite', '1Da-AjzMRSSdZ0e4KAbyGGCvpaz8tgTbr'],
  ['A11', '2026-07-27', 'Anexo', 'Anexo de contrato de reajuste (sin firmas)', 'Borrador del anexo que formaliza los reajustes; sin firmas. El PDF es imagen: montos por verificar.', null, null, null, 'Sin firmas', 'Trámite', '14G0B8wbya6PZXHCbno-vowayhi48Qd4Y'],
  ['A12', '2026-09-01', 'Memo DMAO', 'Memo 1798/2026', 'Pide a la Administración gestionar con Cosemar no aplicar el IPC 2026 por falta de presupuesto. Sin acuerdo escrito.', null, null, null, 'Sin respuesta formal', 'Trámite', '1c0ZXfhg83M3qxeXwiT2_lgU2SRcYmP5K'],
  ['A13', '2026-10-02', 'Memo DMAO', 'Memo 2013/2026', 'Reitera la solicitud de decreto y cuantifica las diferencias devengadas desde jul-2026.', 229431447, 273023422, null, 'Sin decreto', 'Trámite', '1g3l6kVOd8r6gtrjAn9YMx1DK1nEfGdDM'],
  ['A14', '2026-10-16', 'Bases sin decreto', 'Memo 2097/2026 · IPC 4,3% sobre el D.A. 3.957', 'Valor que corresponde según art. 9 BA: IPC 4,3% ($9.458.823 neto) más el componente de viviendas del D.A. 3.957. Pide anexo y decreto a Jurídico.', 234618492, 279196005, '2026-07', 'Devengado, sin decreto', 'Bases sin decreto', '15aL2kZK2d9Yf94NcxwQrCPQD9rSXzG7o'],
  ['A15', '2026-11-13', 'Memo DMAO', 'Respuesta a Jurídico (13-11-2026)', 'DAF no emite certificado presupuestario (saldo negativo). Pide confirmar por escrito que el anexo de reajuste queda suspendido y consolidar anexos.', null, null, null, 'Anexo suspendido', 'Trámite', '1vMOv4FLFO-oOIyYnhbd7O_xYNAlzdCkn']
];
const alzas = A.map(([id, fecha, tipo, acto, efecto, neto, bruto, rigeDesde, estado, capa, did]) => ({ id, fecha, tipo, acto, efecto, neto, bruto, rigeDesde, estado, capa, respaldo: did ? u(did) : CARPETA_2026 }));

const meta = (f) => [{ label: 'Fuente', value: f }, { label: 'Leído', value: '17-11-2026, desde Google Drive' }, { label: 'Generado por', value: 'datos/historico_pagos.js (repositorio tablero-cosemar-recoleccion)' }];
const out = path.join(__dirname, '..', 'tablero', 'store');
fs.writeFileSync(path.join(out, 'pagos_contrato.json'), JSON.stringify({ rows, meta: meta('Memos de pago DMAO, OC y facturas de cada mes; matriz de pagos 2026; memo 1300/2026 del retroactivo') }, null, 1));
fs.writeFileSync(path.join(out, 'alzas_contrato.json'), JSON.stringify({ rows: alzas, meta: meta('Bases, contrato, decretos 2.459 y 3.957/2026, memos DMAO y cartas de Cosemar citadas en ellos') }, null, 1));

// Verificación: totales por año (bruto).
const precio = (p, capas) => alzas.filter(a => capas.includes(a.capa) && a.rigeDesde && a.rigeDesde <= p).sort((a, b) => a.rigeDesde < b.rigeDesde ? -1 : 1).pop().bruto;
const res = {};
rows.forEach(r => {
  const y = res[r.anio] = res[r.anio] || { meses: 0, debidoDecreto: 0, debidoBases: 0, tramitado: 0, retro: 0, multa: 0 };
  y.meses++; y.debidoDecreto += precio(r.periodo, ['Contrato', 'Decreto']); y.debidoBases += precio(r.periodo, ['Contrato', 'Decreto', 'Bases sin decreto']);
  y.tramitado += r.tramitado; y.retro += r.ajusteRetro; y.multa += r.multa;
});
Object.entries(res).forEach(([y, v]) => console.log(y, JSON.stringify(Object.assign(v, { deudaDecreto: v.debidoDecreto - v.tramitado - v.retro, deudaBasesExtra: v.debidoBases - v.debidoDecreto }))));
console.log('filas', rows.length, 'alzas', alzas.length);
