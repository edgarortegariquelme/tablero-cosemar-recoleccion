// Se reserva cada clave antes del envío. Ante una interrupción se concilia el lote en Gmail.
const cfg = $('Config').first().json;
const hoy = hoyChile(cfg);
const libro = M.normalizarLibro($('Notion: leer libro').all().flatMap(i => i.json.results || []).map(aEvento));
const nuevos = M.avisos(libro, null, hoy);
if (!nuevos.length) return [{ json: { noop: true, hoy, mensaje: 'Sin avisos nuevos' } }];

const lote = 'Cosemar-avisos-' + $execution.id;
return nuevos.map(aviso => {
  aviso.verificacion = 'Por verificar';
  aviso.detalle = 'Envío pendiente de confirmación · lote ' + lote + '. Revisar Enviados en Gmail con este identificador antes de autorizar un reenvío.';
  aviso.huella = M.huella(aviso);
  return { json: {
    method: 'POST', url: cfg.notionBase + '/v1/pages',
    body: { parent: { database_id: cfg.libroDb }, properties: aPropiedades(aviso, cfg.contratoPagina) },
    aviso, hoy, lote
  } };
});
