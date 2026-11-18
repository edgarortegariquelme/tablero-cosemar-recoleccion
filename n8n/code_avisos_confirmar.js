// Una aceptación de Gmail acredita el envío al proveedor. La recepción por el destinatario es otro hito.
const cfg = $('Config').first().json;
const respuesta = $input.first().json;
let comprobante = respuesta.id;
if (cfg.notionBase === 'http://127.0.0.1:8787' && respuesta.ok === true && Number.isInteger(respuesta.n)) {
  comprobante = 'simulado-' + respuesta.n;
}
if (respuesta.error || typeof comprobante !== 'string' || !comprobante.trim()) {
  throw new Error('Gmail no confirmó el envío. Conciliar el identificador de lote en Enviados.');
}
const lote = $('Motor: avisos').first().json.lote;
return $('Notion: registrar aviso').all().map(({ json: pagina }) => ({
  json: {
    method: 'PATCH', url: cfg.notionBase + '/v1/pages/' + pagina.id,
    body: { properties: {
      'Verificación': { select: { name: 'Acreditado' } },
      'Detalle': { rich_text: rt('Aceptado por Gmail · lote ' + lote + ' · mensaje ' + comprobante) }
    } }
  }
}));
