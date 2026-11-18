// ===== Cosemar 1 · Cierre: registra fallas para reproceso y marca la última actualización exitosa =====
const cfg = $('Config').first().json, base = cfg.notionBase + '/v1';
const ops = $('Motor: clasificar y decidir').all().map(i => i.json), meta = ops[0].meta, salida = [];
let resultados = []; try { resultados = $('Notion: escribir').all(); } catch (e) {}
const planeados = $('Seleccionar versiones reemplazadas').all();
const recibidos = $input.all();
const bajasFallidas = planeados.filter((p, i) => {
  if (p.json.noop) return false;
  const pagina = recibidos[i] && recibidos[i].json;
  return !pagina || pagina.object !== 'page' || !pagina.properties || pagina.properties.Vigente?.checkbox !== false ||
    p.json.url !== base + '/pages/' + pagina.id;
}).length;
let ok = 0, fallas = [];
if (!ops[0].noop) ops.forEach((o, i) => { const r = resultados[i] && resultados[i].json; if (!r || r.error || r.object !== 'page' || !r.id) fallas.push({ o, error: r?.error ? (r.error.message || JSON.stringify(r.error)).slice(0, 300) : 'sin respuesta' }); else ok++; });
fallas.forEach(f => {
  const reg = { clave: 'ERR|escritura|' + M.hash(f.o.clave + '|' + f.o.method + '|' + Date.now()), modulo: 'Error', entidad: f.o.clave, hito: 'escritura_fallida', fecha: meta.hoy, fechaTipo: 'Acto acreditado', verificacion: 'Por verificar', documento: 'Falla temporal al escribir ' + f.o.clave, detalle: 'REPROCESABLE · ' + f.error + ' · carga: ' + JSON.stringify(f.o.carga ? { eventos: [f.o.carga] } : { peticion: { method: f.o.method, url: f.o.url, body: f.o.body } }).slice(0, 1500), origen: 'n8n · ingesta', vigente: true, version: 1 };
  reg.huella = M.huella(reg);
  salida.push({ method: 'POST', url: base + '/pages', body: { parent: { database_id: cfg.libroDb }, properties: aPropiedades(reg, cfg.contratoPagina) }, tipo: 'error' });
});
(meta.fallasFuente || []).forEach(t => {
  const reg = { clave: 'ERR|fuente|' + M.hash(t + meta.hoy), modulo: 'Error', entidad: 'fuente', hito: 'fuente_no_disponible', fecha: meta.hoy, fechaTipo: 'Acto acreditado', verificacion: 'Por verificar', documento: 'Fuente no disponible: ' + t, detalle: 'REPROCESABLE · se reintenta sola en la próxima corrida', origen: 'n8n · ingesta', vigente: true, version: 1 };
  reg.huella = M.huella(reg);
  salida.push({ method: 'POST', url: base + '/pages', body: { parent: { database_id: cfg.libroDb }, properties: aPropiedades(reg, cfg.contratoPagina) }, tipo: 'error' });
});
const exito = fallas.length === 0 && bajasFallidas === 0 && (meta.fallasFuente || []).length === 0;
const texto = (exito ? 'Última actualización exitosa: ' : 'Último intento con errores: ') + ahoraISO() + ' · leídos ' + meta.leidos + ' · nuevos ' + meta.resumen.crear + ' · rectificados ' + meta.resumen.rectificar + ' · duplicados omitidos ' + (meta.resumen.duplicado + meta.omitidos) + ' · a revisión ' + meta.resumen.revision + ' · errores ' + (meta.resumen.error + fallas.length + bajasFallidas + (meta.fallasFuente || []).length);
const props = { 'Detalle': { rich_text: rt(texto) }, 'Documento': { rich_text: rt(exito ? 'Sincronización n8n correcta' : 'Sincronización n8n con errores') } };
if (exito) props['Fecha'] = { date: { start: ahoraISO() } };
if (meta.sis) salida.push({ method: 'PATCH', url: base + '/pages/' + meta.sis, body: { properties: props }, tipo: 'sync' });
else salida.push({ method: 'POST', url: base + '/pages', body: { parent: { database_id: cfg.libroDb }, properties: Object.assign(aPropiedades({ clave: 'SIS|carga', modulo: 'Sistema', entidad: 'sincronizacion', hito: 'ultima_exitosa', fechaTipo: 'Acto acreditado', verificacion: 'Acreditado', origen: 'n8n', vigente: true, version: 1 }, cfg.contratoPagina), props) }, tipo: 'sync' });
const informe = { exito, escritos: ok, fallas: fallas.length + bajasFallidas, bajasFallidas, resumen: meta.resumen, fuentes: meta.fuentes, omitidos: meta.omitidos, fallasFuente: meta.fallasFuente, hoy: meta.hoy };
return salida.map(s => ({ json: Object.assign(s, { informe }) }));
