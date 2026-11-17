// ===== Cosemar 1 · Motor: clasificar, validar, deduplicar y decidir =====
const cfg = $('Config').first().json;
const hoy = hoyChile(cfg);
const paginas = $('Notion: leer libro').all().flatMap(i => i.json.results || []);
const libro = M.normalizarLibro(paginas.map(aEvento));
const porFuente = {};
libro.forEach(e => { const m = /(drive|notion-com):([\w-]+)(?: · mod:(\S+))?/.exec(e.origen || ''); if (m) porFuente[m[1] + ':' + m[2]] = m[3] || '1'; });
let candidatos = [], omitidos = 0, fuentes = { drive: 0, comunicaciones: 0, webhook: 0 }, fallasFuente = [];
function intentar(nombre, fn) { try { fn(); } catch (e) { fallasFuente.push(nombre + ': ' + e.message); } }
// 1) Eventos directos (webhook o reproceso)
let cuerpo = null; try { cuerpo = $('Webhook evento').first().json.body; } catch (e) {}
if (cuerpo && Array.isArray(cuerpo.eventos)) cuerpo.eventos.forEach(e => { fuentes.webhook++; candidatos.push(Object.assign({ origen: 'n8n · webhook' + (cuerpo.reproceso ? ' · reproceso de ' + cuerpo.reproceso : '') }, e)); });
if (cuerpo && Array.isArray(cuerpo.documentos)) cuerpo.documentos.forEach(d => { fuentes.webhook++; candidatos.push(M.clasificar(Object.assign({ origen: 'n8n · webhook' }, d))); });
// 2) Archivos nuevos o modificados en las carpetas del expediente (Drive)
intentar('Drive', () => {
  $('Drive: archivos nuevos').all().forEach(i => {
    if (i.json.error) throw new Error((i.json.error.message || JSON.stringify(i.json.error)).slice(0, 200));
    (i.json.files || []).forEach(f => {
      if (f.mimeType === 'application/vnd.google-apps.folder') return;
      if (porFuente['drive:' + f.id] === f.modifiedTime) { omitidos++; return; }
      fuentes.drive++;
      const cd = M.clasificar({ id: f.id, nombre: f.name, ruta: (cfg.carpetas[(f.parents || [])[0]] || ''), fecha: (f.modifiedTime || '').slice(0, 10), enlace: f.webViewLink, origen: 'n8n · drive:' + f.id + ' · mod:' + f.modifiedTime });
      if (/fuera del alcance/.test(cd.detalle || '')) { omitidos++; fuentes.drive--; return; }
      candidatos.push(cd);
    });
  });
});
// 3) Comunicaciones ya registradas en Notion (base existente «Comunicaciones» de Trazabilidad DMAO)
intentar('Notion Comunicaciones', () => {
  $('Notion: comunicaciones').all().forEach(i => {
    if (i.json.error) throw new Error((i.json.error.message || JSON.stringify(i.json.error)).slice(0, 200));
    (i.json.results || []).forEach(pg => {
      const p = pg.properties || {}, titulo = txt(p['Documento']) || '', resumen = txt(p['Resumen']) || '';
      if (!/cosemar/i.test(titulo + ' ' + resumen)) return;
      if (porFuente['notion-com:' + pg.id] === pg.last_edited_time) { omitidos++; return; }
      fuentes.comunicaciones++;
      const c = M.clasificar({ id: pg.id, nombre: titulo, resumen: resumen, fechaActo: p['Fecha'] && p['Fecha'].date ? p['Fecha'].date.start.slice(0, 10) : null, enlace: (p['Archivo Drive'] && p['Archivo Drive'].url) || pg.url, origen: 'n8n · notion-com:' + pg.id + ' · mod:' + pg.last_edited_time });
      if (p['Envío'] && p['Envío'].select && p['Envío'].select.name === 'Por confirmar') c.verificacion = 'Por verificar';
      candidatos.push(c);
    });
  });
});
// Decisión por candidato
const trabajo = libro.slice(), ops = [], resumen = { crear: 0, rectificar: 0, duplicado: 0, revision: 0, error: 0 };
const base = cfg.notionBase + '/v1';
function crear(reg) { return { method: 'POST', url: base + '/pages', body: { parent: { database_id: cfg.libroDb }, properties: aPropiedades(reg, cfg.contratoPagina) } }; }
candidatos.forEach(c => {
  const r = M.aplicar(trabajo, c, hoy); resumen[r.accion]++;
  if (r.accion === 'duplicado') return;
  if (r.accion === 'error') {
    const reg = { clave: 'ERR|valid|' + M.hash(JSON.stringify(c)), modulo: 'Error', entidad: c.entidad || 'sin entidad', hito: 'validacion', fecha: hoy, fechaTipo: 'Acto acreditado', verificacion: 'En revisión', documento: c.documento || c.clave || 'registro inválido', respaldo: c.respaldo || null, detalle: 'Rechazado por validación: ' + r.motivo + ' · Corregir la fuente y reenviar · carga: ' + JSON.stringify(c).slice(0, 1200), origen: c.origen || 'n8n', vigente: true, version: 1 };
    if (!trabajo.some(x => x.clave === reg.clave)) { trabajo.push(reg); ops.push(Object.assign(crear(reg), { accion: 'error', clave: reg.clave, carga: null })); }
    return;
  }
  trabajo.push(r.registro);
  ops.push(Object.assign(crear(r.registro), { accion: r.accion, clave: r.registro.clave, carga: c }));
  if (r.accion === 'rectificar') {
    trabajo.forEach(x => { if (x === r.reemplaza) x.vigente = false; });
    ops.push({ method: 'PATCH', url: base + '/pages/' + r.reemplaza.id, body: { properties: { 'Vigente': { checkbox: false } } }, accion: 'cerrar_version', clave: r.reemplaza.clave, carga: null });
  }
});
const meta = { hoy, leidos: libro.length, candidatos: candidatos.length, omitidos, fuentes, fallasFuente, resumen, sis: (libro.filter(e => e.modulo === 'Sistema' && e.vigente !== false)[0] || {}).id || null };
return ops.length ? ops.map(o => ({ json: Object.assign(o, { meta }) })) : [{ json: { noop: true, meta } }];
