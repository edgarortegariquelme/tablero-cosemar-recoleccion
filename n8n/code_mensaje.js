// Gmail recibe un solo mensaje para las reservas confirmadas del lote.
const cfg = $('Config').first().json;
const ops = $('Motor: avisos').all();
const reservas = $input.all();
if (reservas.length !== ops.length || reservas.some((r, i) =>
  r.json.object !== 'page' || !r.json.id || txt(r.json.properties?.Clave) !== ops[i].json.aviso.clave
)) {
  throw new Error('Reserva incompleta de avisos. Revisar el lote antes de reenviar.');
}
const { lote, hoy } = ops[0].json;
const orden = { vencido: 0, plazo_vencido: 0, plazo_proximo: 1, por_vencer: 1, hallazgo_nuevo: 2, cambio_relevante: 3 };
const avisos = ops.map(o => o.json.aviso).sort((a, b) => (orden[a.hito] ?? 9) - (orden[b.hito] ?? 9));
const escapar = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const filas = avisos.map(a => '<li><b>' + escapar(a.entidad) + '</b> · ' + escapar(a.documento) + '</li>').join('');
return [{ json: {
  para: cfg.avisosPara, asunto: '[' + lote + '] Cosemar recolección · ' + avisos.length + ' aviso(s) · ' + hoy,
  html: '<p>Avisos nuevos del tablero de control:</p><ul>' + filas + '</ul><p><a href="' + cfg.tableroUrl + '">Abrir el tablero</a></p>',
  claves: avisos.map(a => a.clave), total: avisos.length
} }];
