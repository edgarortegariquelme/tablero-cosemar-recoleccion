// ===== Cosemar 2 · Avisos: una sola vez por evento =====
const cfg = $('Config').first().json, hoy = hoyChile(cfg), base = cfg.notionBase + '/v1';
const libro = M.normalizarLibro($('Notion: leer libro').all().flatMap(i => i.json.results || []).map(aEvento));
const nuevos = M.avisos(libro, null, hoy);
if (!nuevos.length) return [{ json: { noop: true, hoy, mensaje: 'Sin avisos nuevos' } }];
return nuevos.map(a => { a.huella = M.huella(a); return { json: { method: 'POST', url: base + '/pages', body: { parent: { database_id: cfg.libroDb }, properties: aPropiedades(a, cfg.contratoPagina) }, aviso: a, hoy } }; });
