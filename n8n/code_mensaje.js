// ===== Cosemar 2 · Componer un único mensaje con los avisos efectivamente registrados =====
const cfg = $('Config').first().json, ops = $('Motor: avisos').all(), res = $input.all();
const hechos = ops.filter((o, i) => res[i] && !res[i].json.error).map(o => o.json.aviso);
if (!hechos.length) return [];
const orden = { vencido: 0, plazo_vencido: 0, plazo_proximo: 1, por_vencer: 1, hallazgo_nuevo: 2, cambio_relevante: 3 };
hechos.sort((a, b) => (orden[a.hito] || 9) - (orden[b.hito] || 9));
const filas = hechos.map(a => '<li><b>' + a.entidad + '</b> · ' + a.documento + '</li>').join('');
return [{ json: { para: cfg.avisosPara, asunto: 'Cosemar recolección · ' + hechos.length + ' aviso(s) · ' + ops[0].json.hoy, html: '<p>Avisos nuevos del tablero de control (cada evento se avisa una sola vez):</p><ul>' + filas + '</ul><p><a href="' + cfg.tableroUrl + '">Abrir el tablero</a></p>', claves: hechos.map(a => a.clave), total: hechos.length } }];
