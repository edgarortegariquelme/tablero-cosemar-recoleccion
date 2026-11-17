/* Conversión entre filas de Notion (API) y registros del libro. Se inserta en los nodos Code y en el servidor de prueba. */
function txt(p) { return p && (p.rich_text || p.title || []).map(function (t) { return t.plain_text || (t.text && t.text.content) || ''; }).join('') || null; }
function aEvento(pg) {
  var p = pg.properties || {};
  return { id: pg.id, url: pg.url, clave: txt(p['Clave']), modulo: p['Módulo'] && p['Módulo'].select ? p['Módulo'].select.name : null, entidad: txt(p['Entidad']), hito: txt(p['Hito']),
    fecha: p['Fecha'] && p['Fecha'].date ? p['Fecha'].date.start.slice(0, 10) : null, fechaTipo: p['Tipo de fecha'] && p['Tipo de fecha'].select ? p['Tipo de fecha'].select.name : null,
    monto: p['Monto'] ? p['Monto'].number : null, unidadMonto: p['Unidad'] && p['Unidad'].select ? p['Unidad'].select.name : null,
    verificacion: p['Verificación'] && p['Verificación'].select ? p['Verificación'].select.name : null, documento: txt(p['Documento']), respaldo: p['Respaldo'] ? p['Respaldo'].url : null,
    obligacion: txt(p['Obligación']), detalle: txt(p['Detalle']) || '', origen: txt(p['Origen']), numero: txt(p['N°']), patente: txt(p['Patente']), sector: txt(p['Sector']), huellaGuardada: txt(p['Huella']),
    vigente: p['Vigente'] ? !!p['Vigente'].checkbox : true, version: p['Versión'] && p['Versión'].number || 1, rectificaA: txt(p['Rectifica a']), registrado: pg.created_time || null };
}
function rt(s) { s = String(s == null ? '' : s); var out = []; for (var i = 0; i < s.length; i += 1900) out.push({ type: 'text', text: { content: s.slice(i, i + 1900) } }); return out; }
function aPropiedades(e, contratoId) {
  var p = { 'Clave': { title: rt(e.clave) }, 'Módulo': { select: { name: e.modulo } }, 'Entidad': { rich_text: rt(e.entidad) }, 'Hito': { rich_text: rt(e.hito) },
    'Tipo de fecha': { select: { name: e.fechaTipo || (e.fecha ? 'Declarada' : 'Sin fecha') } }, 'Verificación': { select: { name: e.verificacion || 'Reportado' } },
    'Vigente': { checkbox: e.vigente !== false }, 'Versión': { number: e.version || 1 }, 'Huella': { rich_text: rt(e.huella || '') }, 'Origen': { rich_text: rt(e.origen || 'n8n') } };
  if (e.fecha) p['Fecha'] = { date: { start: e.fecha } };
  if (e.monto != null) { p['Monto'] = { number: e.monto }; p['Unidad'] = { select: { name: e.unidadMonto } }; }
  if (e.documento) p['Documento'] = { rich_text: rt(e.documento) };
  if (e.respaldo) p['Respaldo'] = { url: e.respaldo };
  if (e.obligacion) p['Obligación'] = { rich_text: rt(e.obligacion) };
  if (e.detalle) p['Detalle'] = { rich_text: rt(e.detalle) };
  if (e.numero) p['N°'] = { rich_text: rt(e.numero) };
  if (e.patente) p['Patente'] = { rich_text: rt(e.patente) };
  if (e.sector) p['Sector'] = { rich_text: rt(e.sector) };
  if (e.rectificaA) p['Rectifica a'] = { rich_text: rt(e.rectificaA) };
  if (contratoId) p['Contrato'] = { relation: [{ id: contratoId }] };
  return p;
}
function hoyChile(cfg) { if (cfg && cfg.hoy) return cfg.hoy; return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()); }
function ahoraISO() { return new Date().toISOString(); }
