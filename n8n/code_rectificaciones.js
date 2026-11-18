// Solo una página persistida y explícitamente vinculada acredita el reemplazo.
const cfg = $('Config').first().json;
const leidas = $('Notion: leer libro').all().flatMap(i => i.json.results);
const creadas = $input.all().map(i => i.json).filter(p => p.object === 'page' && p.id && p.properties);
const porVersion = new Map();
for (const pg of leidas.concat(creadas)) {
  const e = aEvento(pg);
  if (!e.id || !e.clave) continue;
  const ref = e.clave + ' v' + e.version;
  if (!porVersion.has(ref)) porVersion.set(ref, []);
  porVersion.get(ref).push(e);
}

const retirar = new Set();
for (const versiones of porVersion.values()) {
  if (versiones.length !== 1 || !versiones[0].vigente) continue;
  let nueva = versiones[0];
  while (nueva.version > 1) {
    const refAnterior = nueva.clave + ' v' + (nueva.version - 1);
    const anteriores = porVersion.get(refAnterior);
    if (nueva.rectificaA !== refAnterior || !anteriores || anteriores.length !== 1) break;
    const anterior = anteriores[0];
    if (anterior.vigente) retirar.add(anterior.id);
    nueva = anterior;
  }
}
const cierres = [...retirar].map(id => ({ json: {
  method: 'PATCH', url: cfg.notionBase + '/v1/pages/' + id,
  body: { properties: { Vigente: { checkbox: false } } }
} }));
return cierres.length ? cierres : [{ json: { noop: true } }];
