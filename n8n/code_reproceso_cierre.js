// ===== Cosemar 3 · Marca como resueltos los errores cuyo reproceso terminó bien =====
const cfg = $('Config').first().json, ops = $('Preparar reproceso').all(), res = $input.all(), out = [];
ops.forEach((o, i) => { const r = res[i] && res[i].json; const ok = r && !r.error && r.exito === true && r.resumen && r.resumen.error === 0 && r.resumen.revision === 0;
  if (ok) out.push({ json: { method: 'PATCH', url: cfg.notionBase + '/v1/pages/' + o.json.errorId, body: { properties: { 'Verificación': { select: { name: 'Acreditado' } }, 'Vigente': { checkbox: false }, 'Rectifica a': { rich_text: rt('Reprocesado correctamente el ' + ahoraISO()) } } }, clave: o.json.clave, resuelto: true } }); });
return out.length ? out : [{ json: { noop: true, mensaje: 'Ningún error quedó resuelto en esta corrida' } }];
