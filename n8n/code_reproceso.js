// ===== Cosemar 3 · Reproceso: reenvía a la ingesta las cargas de errores reprocesables =====
const cfg = $('Config').first().json;
const libro = M.normalizarLibro($('Notion: leer libro').all().flatMap(i => i.json.results || []).map(aEvento));
const pend = libro.filter(e => e.modulo === 'Error' && e.vigente !== false && e.verificacion === 'Por verificar' && /REPROCESABLE/.test(e.detalle || ''));
const out = [];
pend.forEach(e => {
  const m = /carga: (\{.*\})\s*$/.exec(e.detalle || ''); let carga = null; try { carga = m && JSON.parse(m[1]); } catch (x) {}
  if (carga && carga.eventos) out.push({ json: { method: 'POST', url: cfg.ingestaUrl, body: { eventos: carga.eventos.map(c => { const d = Object.assign({}, c); delete d.origen; return d; }), reproceso: e.clave }, errorId: e.id, clave: e.clave } });
  else if (carga && carga.peticion) out.push({ json: Object.assign(carga.peticion, { errorId: e.id, clave: e.clave }) });
  else out.push({ json: { method: 'POST', url: cfg.ingestaUrl, body: { eventos: [], reproceso: e.clave }, errorId: e.id, clave: e.clave } });
});
return out.length ? out : [{ json: { noop: true, mensaje: 'Sin errores por reprocesar' } }];
