/* Catálogo estático del contrato: fuentes, precios vigentes por período, matriz de obligaciones y flujogramas.
 * Cada cláusula cita la versión legible de las bases (127 páginas). Límites conocidos al final. */
(function (root) {
  var D = 'https://drive.google.com/', N = 'https://app.notion.com/p/';
  var F = {
    bases: { n: 'Bases administrativas y técnicas P.P. 060/2023 (versión legible, 127 pp.)', u: D + 'file/d/1TknaBBbdBm8PIJVN_lpM3JcyR6h2Y8D7/view' },
    basesDA: { n: 'Bases aprobadas por D.A. 6.424/2023', u: D + 'file/d/1J4Lv8tlB89BBV4zbpJRV_vY77kzpmyg4/view' },
    contrato: { n: 'Contrato aprobado por D.A. 5.665/2024', u: D + 'file/d/1FbmAP0IpXkvuVtxjyAaSsYGKmltIKTCa/view' },
    da7337: { n: 'D.A. 7.337/2023 (modifica bases), en Providencia 6981', u: D + 'file/d/1NPisD82ZlPaCyW9hiY6zyRDylfg49k75/view' },
    flujo: { n: 'FLUJOGRAMA COSEMAR RECOLECCION.xlsx (mapa del flujo actual)', u: D + 'file/d/15b5Li0NNyiQjxco9VcuVw-8TGuvsJ1CN/view' },
    venc: { n: 'Control vencimientos COSEMAR (planilla)', u: 'https://docs.google.com/spreadsheets/d/1tHM807N-TxxC-WTic12y5tgCJoNP0KEcBCvgX-dgE5w/edit' },
    inventario: { n: 'Inventario maestro COSEMAR (corte 22-09-2026)', u: 'https://docs.google.com/spreadsheets/d/1sob4ZvqNh1eKxaQDtyK-hrGhH5ZWoGx9/edit' },
    multas: { n: 'Carpeta Drive · Multas (procesos sancionatorios)', u: D + 'drive/folders/1S6PzQeBg6BWSCQnIdfaokWU-9OXF3Fx-' },
    pagos: { n: 'Carpeta Drive · 2. Pagos servicios 2026', u: D + 'drive/folders/122zU1bsRlvC_jVNQFqdZMW2kVyYhXfzo' },
    pagosSep: { n: 'Carpeta Drive · 9. Septiembre 2026', u: D + 'drive/folders/1eJrvdI2lkm6YtU-eR4rvDV6ipN-_BfVH' },
    pagosOct: { n: 'Carpeta Drive · 10. Octubre 2026', u: D + 'drive/folders/1204ZW0LRhGlJkoaRyah8wFf6u0UYuTtS' },
    polizas: { n: 'Carpeta Drive · 3. Pólizas', u: D + 'drive/folders/1new6tELuK_9HDRqRkvCQaXYunKtBB-zy' },
    fiscal: { n: 'Carpeta Drive · Fiscalización al contrato', u: D + 'drive/folders/182QnsD9zNaSZkIz_5HPbTvRomvymlgE2' },
    expDrive: { n: 'Carpeta Drive · Expediente recolección 3447-86-LR23', u: D + 'drive/folders/11kjK9ibJ3DTL4CQU0tzBPuLHQD9zbOmm' },
    poliza: { n: 'Póliza Continental 224103598 (fiel cumplimiento)', u: D + 'file/d/1NmcAB7dy23GgTSmaz_sn_86wt6apTuc7/view' },
    endoso355: { n: 'Endoso 225146034 (+UF 355) y carta 17-12-2025', u: D + 'file/d/1UM8LpPLOgAh5P_q2vH9xbOarshxkpxic/view' },
    rc: { n: 'Póliza RC Continental 226102080', u: D + 'file/d/13Tjf0WsRN6Ouj3f9bMpjG8rmijlpf9Cq/view' },
    nContrato: { n: 'Notion · Contrato COSEMAR Recolección (Contratos)', u: N + '4159e3e655c0810a974aec33d1bd63d4' },
    nExp: { n: 'Notion · Expediente canónico (Trabajo municipal contrato COSEMAR)', u: N + '3ed9e3e655c081ed8dc1d316d74108fb' },
    nTraz: { n: 'Notion · Trazabilidad de trámites DMAO', u: N + '4159e3e655c0816d9846e76116cb12ab' },
    nGar: { n: 'Notion · Garantía COSEMAR · Endoso 226139451', u: N + '4089e3e655c08176a812c95ecd59b8f8' },
    nDiag: { n: 'Notion · Diagnóstico e integración municipal 09-10-2026', u: N + '3f49e3e655c081e19dd2c48f65282d6e' }
  };
  function o(id, titulo, clausula, pag, frecuencia, plazo, evidencia, criterio, accion, modulo, cobertura, vig, extra) {
    return Object.assign({ id: id, titulo: titulo, clausula: clausula, pagina: pag, frecuencia: frecuencia, plazo: plazo, evidencia: evidencia, criterio: criterio, accion: accion, modulo: modulo, cobertura: cobertura || 'ok', vigencias: vig || [{ desde: '2024-07-01', hasta: null, exigencia: 'Texto de bases sin modificación identificada' }], fuente: 'bases' }, extra || {});
  }
  var HALL = 'Abrir hallazgo con folio de manifold y cláusula; comunicar a Cosemar (BA 176)';
  var OBL = [
    // ---- Pago mensual ----
    o('OB-01', 'Solicitud y emisión mensual de la orden de compra', 'BA 154', 48, 'Mensual', 'Tras el término del mes de servicio (uso DMAO: días 1–5)', 'Memo correlativo que solicita OC con V°B° DAF; OC emitida', 'Memo numerado y OC del período con ítems y valor vigente', 'Registrar diferencia y reiterar a DAF', 'Pago'),
    o('OB-02', 'Aceptación de la OC por Cosemar', 'BA 155–156', 48, 'Mensual', '3 días hábiles desde el envío de la OC', 'Constancia de aceptación en Mercado Público', 'Aceptada dentro de plazo; si no, DAF puede cancelarla a solicitud de la UT', HALL, 'Pago'),
    o('OB-03', 'Emisión de la factura por mes vencido', 'BA 157–158', 49, 'Mensual', '5 días corridos siguientes al término del mes', 'Factura a nombre de la Municipalidad, RUT 69.265.100-6', 'Factura posterior a la OC del período y por el valor vigente', 'Registrar diferencia; pedir rectificación o nota de crédito', 'Pago'),
    o('OB-04', 'Entrega de factura con antecedentes para el pago', 'BA 121, 159 y 163', 41, 'Mensual', 'BA 121: 7 días corridos · BA 159: 7 días hábiles (discrepancia conservada)', 'Carpeta: factura, OC con recepción conforme, certificado laboral (≤30 días), pagos previsionales, listado de personal, habilidad Mercado Público, residencia, remuneraciones', 'Carpeta completa por mes de servicio; cada faltante se registra como subsanación', 'Devolver con observaciones; no derivar a pago hasta subsanar', 'Pago', 'ok', null, { nota: 'BA 121 y BA 159/123(v) difieren en el cómputo; falta criterio formal.' }),
    o('OB-05', 'Certificado de antecedentes laborales y previsionales o de cumplimiento (F30 / F30-1)', 'BA 163', 49, 'Mensual', 'Antigüedad máxima 30 días respecto de la facturación', 'Certificado DT del período', 'Uno u otro certificado vigente («o», no ambos)', 'Observar el estado de pago', 'Pago', 'ok', null, { nota: 'La denominación «F30-12» informada por Edgar sigue por aclarar.' }),
    o('OB-06', 'Certificados de pago de previsión, salud y cesantía y listado de personal', 'BA 163 · BT 75', 50, 'Mensual', 'Mes inmediatamente anterior al pago solicitado', 'Planillas de cotizaciones y listado', 'Coinciden con la dotación informada', 'Observar el estado de pago; multa BA 169 por atraso', 'Pago', 'ok', null, { personal: true }),
    o('OB-07', 'Certificado de habilidad en el Registro de Proveedores', 'BA 163', 50, 'Mensual', 'Con cada estado de pago', 'Certificado estado «Hábil»', 'Hábil a la fecha del pago', 'Observar el estado de pago', 'Pago'),
    o('OB-08', 'Acreditación del porcentaje de trabajadores locales ofertado', 'BA 163', 50, 'Mensual', 'Con cada estado de pago', 'Certificados de residencia u otro respaldo aceptado', 'Porcentaje ≥ ofertado', HALL, 'Pago', 'pendiente_configurar', null, { personal: true, nota: 'Falta el porcentaje ofertado por Cosemar (oferta técnica).' }),
    o('OB-09', 'Listado de remuneraciones de conductores y peonetas; reajuste semestral de sueldos base', 'BA 153 y 163', 48, 'Mensual; reajuste en enero y julio', 'Enero y julio', 'Listado de remuneraciones con reajustabilidad', 'Sueldo base reajustado por IPC acumulado; nunca a la baja', 'Hallazgo; multa BA 169 por reajustabilidad menor', 'Pago', 'ok', null, { personal: true }),
    o('OB-10', 'Recepción conforme del servicio antes de pagar', 'BA 160 y 162', 49, 'Mensual', 'Pago en máximo 30 días corridos desde la recepción conforme', 'Certificado de recepción conforme firmado y timbrado; informes GPS y de trabajos con fotografías (Hernán)', 'Certificado del período con respaldo del ITS', 'No derivar a pago', 'Pago'),
    o('OB-11', 'Revisión de procesos sancionatorios y descuentos antes de derivar a pago', 'BA 163 y 187–190', 57, 'Mensual', 'Antes del memo de pago', 'Constancia de revisión de procesos abiertos y cerrados; instrucción de descuento si hay multa firme', 'Toda multa firme se descuenta una sola vez en el estado de pago más próximo', 'Detener el memo de pago hasta registrar la revisión', 'Pago'),
    o('OB-12', 'Evidencias del plan de educación ambiental con la facturación mensual', 'BA 121 N°8 · BT 14', 41, 'Mensual', 'Con la facturación', 'Informes, fotografías y asistencia por actividad', 'Evidencia por actividad, no solo títulos de charlas', HALL, 'Pago'),
    o('OB-13', 'Conciliación mensual de pesajes y tonelaje', 'BT 124–125', 95, 'Mensual', 'Antes del pago', 'Conciliación relleno–municipio de la flota del contrato', 'Tonelaje conciliado sin vehículos ajenos', 'Registrar diferencia', 'Monitoreo', 'pendiente_configurar', null, { nota: 'Fuente de pesajes aún no conectada (tickets del relleno).' }),
    o('OB-14', 'Declaración mensual RETC y comprobante', 'BT 141–142', 97, 'Mensual', 'Mensual', 'Comprobante de recepción RETC', 'Declaración del mes entregada', HALL, 'Monitoreo', 'pendiente_configurar'),
    // ---- Precio y modificaciones ----
    o('OB-15', 'Precio mensual vigente y reajuste anual por IPC', 'BA 9 · Contrato cl. CUARTO', 4, 'Anual', 'Informe de la empresa a la UT; se formaliza por decreto y anexo', 'Decreto alcaldicio, anexo de contrato, certificado presupuestario', 'Se paga el valor del último acto ejecutado; un reajuste no se aplica dos veces', 'Registrar diferencia entre valor decretado y valor tramitado', 'Pago', 'ok', [
      { desde: '2026-04-01', hasta: '2026-06-30', exigencia: '$219.972.624 neto / $261.767.423 bruto', acto: 'D.A. 2.459/2026 (IPC 4,1% + 1.317 viviendas)' },
      { desde: '2026-07-01', hasta: null, exigencia: '$225.159.669 neto / $267.940.006 bruto', acto: 'D.A. 3.957/2026 (1.116 viviendas) · decretado, no ejecutado' }]),
    o('OB-16', 'Aumento por crecimiento poblacional (viviendas)', 'BA 9', 4, 'Cuando proceda', 'Según acto', 'Decreto y anexo; cálculo por viviendas', 'Incremento incluido una sola vez en factura o ajuste posterior', 'Registrar diferencia', 'Pago', 'ok', [
      { desde: '2026-04-01', hasta: null, exigencia: '+$5.982.849 neto (1.317 viviendas)', acto: 'D.A. 2.459/2026' },
      { desde: '2026-07-01', hasta: null, exigencia: '+$5.187.045 neto (1.116 viviendas)', acto: 'D.A. 3.957/2026' }]),
    // ---- Garantías y seguros ----
    o('OB-17', 'Garantía de fiel cumplimiento vigente y suficiente', 'BA 115 h), 198 y 200', 60, 'Permanente; se actualiza con cada ampliación', 'Contrato más 120 días; 5% del monto total', 'Póliza y endosos; revisión de Jurídico; custodia en Tesorería', 'Capital exigido según la ampliación vigente y vencimiento posterior al término contractual (30-06-2029)', 'Oficio a Cosemar para actualizar; BA 191 si hay cobro', 'Monitoreo', 'ok', [
      { desde: '2024-07-01', hasta: '2025-12-08', exigencia: 'UF 19.605', acto: 'Póliza 224103598' },
      { desde: '2025-12-09', hasta: '2026-10-18', exigencia: 'UF 19.960', acto: 'Endoso 225146034 (+UF 355)' },
      { desde: '2026-10-19', hasta: null, exigencia: 'UF 20.379,57', acto: 'Endoso 226139451 (+UF 419,57) · en revisión formal' }]),
    o('OB-18', 'Seguro de responsabilidad civil vigente', 'BA 125–128 y 134', 45, 'Renovación anual', 'Todo el contrato más 90 días', 'Póliza vigente, UF 2.000', 'Póliza vigente a la fecha, a favor de la Municipalidad', 'Requerir renovación; BA 126 (resolución del contrato)', 'Monitoreo', 'ok', [
      { desde: '2025-07-31', hasta: '2026-07-31', exigencia: 'UF 2.000 · póliza 225102411' },
      { desde: '2026-07-31', hasta: '2027-07-31', exigencia: 'UF 2.000 · póliza 226102080' }]),
    o('OB-19', 'Informes trimestrales de instalaciones de Cosemar', 'Flujograma DMAO · BA 120', 41, 'Trimestral', 'Trimestral', 'Informe trimestral de instalaciones', 'Informe del trimestre recibido y revisado', HALL, 'Monitoreo', 'pendiente_configurar', null, { fuente: 'flujo', nota: 'El ciclo consta en el flujograma; falta ubicar la cláusula exacta y los informes.' }),
    // ---- Flota ----
    o('OB-20', 'Documentación vehicular vigente: revisión técnica', 'BA 123 y) · BT 95', 44, 'Por vehículo', 'Antes del vencimiento', 'Certificado de revisión técnica por patente', 'Vigente a la fecha de operación', 'Manifold; multa BA 169 (caso PS03, 5 UTM)', 'Monitoreo'),
    o('OB-21', 'Documentación vehicular vigente: permiso de circulación', 'BA 123 y) · BT 95', 44, 'Anual por vehículo', 'Antes del vencimiento', 'Permiso de circulación por patente', 'Vigente', HALL, 'Monitoreo'),
    o('OB-22', 'Documentación vehicular vigente: seguro obligatorio (SOAP)', 'BA 123 y) · BT 95', 44, 'Anual por vehículo', 'Antes del vencimiento', 'SOAP por patente', 'Vigente', HALL, 'Monitoreo'),
    o('OB-23', 'Identificación y gráfica de los vehículos', 'BA 169 (identificación inadecuada)', 53, 'Permanente', '—', 'Registro fotográfico', 'Gráfica aprobada por el ITS', 'Manifold (caso PS02)', 'Monitoreo'),
    o('OB-24', 'Equipos de comunicación y localización (GPS) operativos', 'BA 169 · BT 95', 53, 'Diaria', '—', 'Informe de seguimiento GPS (Hernán)', 'Sin días de falta', 'Manifold; multa por día de falta', 'Monitoreo'),
    o('OB-25', 'Flota informada en el plan de trabajo; reemplazos autorizados', 'BA 124 a) · BT 30', 44, 'Permanente', '—', 'Plan de trabajo y listado de flota', 'Solo operan equipos asociados al contrato', 'Manifold (caso PS06)', 'Monitoreo'),
    o('OB-26', 'Programa de mantención de equipos', 'BT 23', 78, 'Mensual', 'Mensual', 'Control mensual de equipo por móvil', 'Controles del mes entregados', HALL, 'Monitoreo', 'pendiente_configurar'),
    // ---- Operación y rutas ----
    o('OB-27', 'Ejecución completa de las rutas de recolección', 'BA 169 N°1 · BT 9', 51, 'Diaria', '—', 'GPS y fiscalización en terreno', 'Ruta realizada completa', 'Manifold; multa 30 UTM por ruta', 'Monitoreo'),
    o('OB-28', 'No modificar unilateralmente el servicio ni el plan de trabajo', 'BA 124 a)', 44, 'Permanente', '—', 'Plan de trabajo aprobado y comunicaciones', 'Todo cambio cuenta con autorización de la UT', 'Manifold (caso PS05)', 'Monitoreo'),
    o('OB-29', 'Servicio de contingencia y continuidad', 'BT 30–32', 79, 'Permanente', '—', 'Reporte de flota y reemplazos', 'Sin interrupción por fallas o falta de personal', HALL, 'Monitoreo'),
    o('OB-30', 'Lavado de equipos y contenedores en instalaciones adecuadas', 'BT 25', 78, 'Según plan', '—', 'Informes de lavado y resolución de aguas', 'Lavado conforme (caso PS04)', HALL, 'Monitoreo'),
    // ---- Personal e instalaciones ----
    o('OB-31', 'Informe mensual de dotación, contrataciones, finiquitos, feriados y móviles', 'BA 122 · BT 83', 41, 'Mensual', 'Primeros 5 días corridos del mes', 'Listado de personal y móviles', 'Entregado en plazo', HALL, 'Monitoreo', 'ok', null, { personal: true }),
    o('OB-32', 'Base de operaciones conforme al D.S. 594/1999', 'BA 120 y 169', 41, 'Permanente', '—', 'Inspección de instalaciones; resolución sanitaria', 'Vestuario, casilleros, servicios higiénicos y duchas', 'Manifold (requerimiento REQ07); multa BA 169', 'Monitoreo'),
    o('OB-33', 'Uniformes y elementos de protección personal', 'BA 169', 55, 'Permanente', '—', 'Inspección en terreno', 'Personal con uniforme y EPP', 'Manifold; multa por trabajador', 'Monitoreo', 'pendiente_configurar'),
    o('OB-34', 'Ejecutivo responsable y representante técnico', 'BA 117 y 119', 40, 'Permanente', '—', 'Designación y datos de contacto', 'Contacto vigente', HALL, 'Monitoreo', 'pendiente_configurar'),
    // ---- Procedimiento sancionatorio ----
    o('OB-35', 'Notificación de la infracción a Cosemar', 'BA 176 y 180–182', 56, 'Por hallazgo', 'Se entiende practicada 24 horas después', 'Folio de manifold, correo u oficio', 'Indica infracción, hechos y monto', 'Completar la notificación antes de computar plazos', 'Sanción'),
    o('OB-36', 'Descargos de la empresa', 'BA 177', 56, 'Por proceso', '5 días hábiles desde la notificación', 'Carta o correo de descargos', 'Recibidos en plazo', 'Sin descargos: decreto directo (BA 178)', 'Sanción'),
    o('OB-37', 'Resolución de los descargos por decreto', 'BA 172 y 179', 56, 'Por proceso', '20 días hábiles desde la recepción de los descargos', 'Informe fundado con firma y timbre del Director; decreto', 'Decreto dictado y notificado en plazo', 'Escalar a la Unidad Técnica', 'Sanción'),
    o('OB-38', 'Recurso de reposición', 'BA 183–185', 57, 'Por proceso', '5 días hábiles desde la notificación del decreto en la ficha de contrato', 'Recurso por «Gestión de Sanciones» de Mercado Público', 'Presentado en plazo y por la vía indicada', 'Vencido el plazo: multa firme (BA 187)', 'Sanción'),
    o('OB-39', 'Resolución de la reposición', 'BA 186', 57, 'Por proceso', '20 días hábiles', 'Informe, visados de Jurídico y Alcaldía, decreto final', 'Decreto final publicado', 'Escalar', 'Sanción'),
    o('OB-40', 'Cobro de la multa firme', 'BA 171 y 187–190', 57, 'Por proceso', 'Estado de pago más próximo; cobro directo en 10 días hábiles', 'Instrucción de descuento y estado de pago que lo acredita; UTM a la fecha en que se cursó', 'Descuento efectivo acreditado una sola vez', 'BA 191: ejecutar garantía si no se paga', 'Sanción')
  ];
  var CAT = {
    contrato: { nombre: 'Servicio de recolección, transporte y disposición final de RSD · P.P. 060/2023', id: '3447-86-LR23', proveedor: 'Cosemar SpA · RUT 96.827.370-1', inicio: '2024-07-01', termino: '2029-06-30', adjudicacion: 'D.A. 4.824/2024', aprobacion: 'D.A. 5.665/2024',
      alcance: 'Este tablero cubre el contrato de recolección 3447-86-LR23. La disposición final se controla por el contrato separado 3447-187-LR24 (Relleno Santa Inés); solo se cruza la conciliación de tonelaje (BT 124–125).' },
    fuentes: F,
    precios: [
      { desde: '2026-04', neto: 219972624, bruto: 261767423, acto: 'D.A. 2.459/2026', ejecutado: true, respaldo: N + '4159e3e655c0819cb21ddee46f0a5239' },
      { desde: '2026-07', neto: 225159669, bruto: 267940006, acto: 'D.A. 3.957/2026', ejecutado: false, respaldo: N + '4159e3e655c081eabe14fccfe1d8c7ca', nota: 'Decretado el 02-07-2026, no ejecutado: OC y pagos siguen al valor del D.A. 2.459 por déficit presupuestario informado por DAF (22-10-2026).' }
    ],
    obligaciones: OBL,
    sanciones: {
      PS01: { titulo: 'Apoyo en rutas con equipos de escombros y voluminosos', obligacion: 'OB-27', sector: 'Rutas de recolección', carpeta: '1. FEB 2026 APOYO RUTAS EQUIPOS ESCOM Y VOL (sin efecto)' },
      PS02: { titulo: 'Gráfica e identificación de camiones recolectores', obligacion: 'OB-23', sector: 'Flota', carpeta: '2. FEB 2026 GRAFICA CAMIONES RECOLECTORES (en evaluacion)' },
      PS03: { titulo: 'Camión con documentación vencida (móvil 980)', obligacion: 'OB-20', sector: 'Flota', patente: 'TPPW41-0',
        // Factura en que se descuenta la multa (BA 188 a), según el encargado (27-11-2026): la próxima por pagar, recolección de octubre de 2026.
        cobroEn: { contrato: 'rec', periodo: '2026-10', nota: 'Indicada por el encargado el 27-11-2026 (próxima factura por pagar)' }, carpeta: '3. FEB 2026 CAMION CON DOCUMENTACION VENCIDA (confirmada)' },
      PS04: { titulo: 'Lavado deficiente de equipos', obligacion: 'OB-30', sector: 'Instalaciones', carpeta: '4. FEB LAVADO DEFICIENTE EQUIPOS (sin efecto)' },
      PS05: { titulo: 'Modificación unilateral del plan de trabajo (inicio domingo 5 de abril)', obligacion: 'OB-28', sector: 'Rutas de recolección', carpeta: '5. MODIFICACION UNILATERAL DE PLAN DE TRABAJO (decretando)' },
      PS06: { titulo: 'Camión no informado en el plan de trabajo (móvil 1473)', obligacion: 'OB-25', sector: 'Flota', carpeta: '6. CAMION NO INFORMADO EN PLAN TRABAJO' },
      REQ07: { titulo: 'Requerimiento de resolución sanitaria de instalaciones', obligacion: 'OB-32', sector: 'Instalaciones', carpeta: '7. RESOLUCION SANITARIA INSTALACIONES' },
      PS07: { titulo: 'Observaciones de la visita técnica a instalaciones (30-09-2026)', obligacion: 'OB-30', sector: 'Instalaciones', carpeta: '8. NOVIEMBRE INSTALACIONES COSEMAR' }
    },
    flujos: [
      { id: 'monitoreo', titulo: 'Monitoreo y fiscalización', ramas: [
        { nombre: 'Arranque', pasos: [{ id: 'm0', t: 'Carpeta de arranque del contrato', d: 'Bases, decretos de aprobación y adjudicación, contrato, decretos de aumento poblacional e IPC', vista: 'obligaciones', filtro: {} }] },
        { nombre: 'Rama documental · vigila Edgar', pasos: [
          { id: 'm1', t: 'Garantía de fiel cumplimiento', d: 'Ciclos de renovación y endosos', vista: 'vencimientos', filtro: { entidad: 'GAR-FC' }, obl: 'OB-17' },
          { id: 'm2', t: 'Seguro de responsabilidad civil', d: 'Revisión anual', vista: 'vencimientos', filtro: { entidad: 'SEG-RC' }, obl: 'OB-18' },
          { id: 'm3', t: 'Renovaciones y caducidades', d: 'Avisos de vencimiento con respaldo', vista: 'vencimientos', filtro: { estado: 'por vencer' } },
          { id: 'm4', t: 'Informes trimestrales de instalaciones', d: 'Ciclo de revisión', vista: 'obligaciones', filtro: { id: 'OB-19' }, obl: 'OB-19' }] },
        { nombre: 'Rama de inspección en terreno · Hernán', pasos: [
          { id: 'm5', t: 'Rutas', d: 'Ejecución y cambios del plan', vista: 'obligaciones', filtro: { id: 'OB-27' }, obl: 'OB-27' },
          { id: 'm6', t: 'Flota', d: 'Revisión técnica, permiso, SOAP, gráfica, GPS', vista: 'vencimientos', filtro: { grupo: 'flota' }, obl: 'OB-20' },
          { id: 'm7', t: 'Personal', d: 'Dotación, EPP, obligaciones laborales', vista: 'obligaciones', filtro: { id: 'OB-31' }, obl: 'OB-31' },
          { id: 'm8', t: 'Instalaciones', d: 'D.S. 594, resolución de aguas de lavado', vista: 'obligaciones', filtro: { id: 'OB-32' }, obl: 'OB-32' }] },
        { nombre: 'Registro y seguimiento', pasos: [
          { id: 'm9', t: 'Registro de control', d: 'Fecha, ítem, evidencia, resultado y seguimiento', vista: 'linea', filtro: {} },
          { id: 'm10', t: 'Observación → hallazgo', d: 'Folio de manifold y cláusula', vista: 'sanciones', filtro: { hito: 'manifold' } },
          { id: 'm11', t: 'Comunicación a Cosemar', d: 'Correo con el manifold foliado', vista: 'sanciones', filtro: { hito: 'comunicacion_empresa' } },
          { id: 'm12', t: 'Respuesta de la empresa', d: 'Descargos', vista: 'sanciones', filtro: { hito: 'respuesta_empresa' } },
          { id: 'm13', t: 'Evaluación', d: 'Cierre respaldado o propuesta de multa', vista: 'sanciones', filtro: { hito: 'informe_evaluacion' } }] }] },
      { id: 'pago', titulo: 'Pago mensual', ramas: [
        { nombre: 'Orden de compra', pasos: [
          { id: 'p1', t: '1 · Memo solicita OC', d: 'Memo tipo con número correlativo', hito: 'memo_oc' },
          { id: 'p2', t: '2 · Visto bueno y derivación a DAF', d: 'Por libro o por sistema', hito: 'vb_daf' },
          { id: 'p3', t: '3 · OC emitida', d: 'DAF', hito: 'oc_emitida' },
          { id: 'p4', t: '4 · Cosemar recibe y acepta la OC', d: 'Por correo / Mercado Público · 3 días hábiles', hito: 'oc_aceptada' }] },
        { nombre: 'Expediente del mes de servicio', pasos: [
          { id: 'p5', t: '5 · Factura con carpeta de antecedentes', d: 'F30, personal, imposiciones, informe empresa, ambientalista, habilidad, residencia', hito: 'factura' },
          { id: 'p6', t: '6a · Informe de seguimiento GPS', d: 'Hernán, por Gmail', hito: 'informe_gps' },
          { id: 'p7', t: '6b · Informe de trabajos con fotografías', d: 'Hernán, por Gmail', hito: 'informe_trabajos' },
          { id: 'p8', t: 'Cotejo, diferencias y subsanaciones', d: 'Orden OC–factura; recepción conforme', hito: 'recepcion_conforme' }] },
        { nombre: 'Derivación a pago', pasos: [
          { id: 'p9', t: 'Revisión de procesos sancionatorios', d: 'Abiertos y cerrados; visación y descuentos', hito: 'revision_sanciones' },
          { id: 'p10', t: '7 · Memo pide pago de factura', d: 'Edgar, con número de memo', hito: 'memo_pago' },
          { id: 'p11', t: 'Pago efectivo', d: 'Comprobante', hito: 'pago' }] }] },
      { id: 'sancion', titulo: 'Proceso sancionatorio', ramas: [
        { nombre: 'Inicio', pasos: [
          { id: 's1', t: '1 · Folio de manifold', d: 'Hernán identifica la falla', hito: 'manifold' },
          { id: 's2', t: '2 · Comunicación a Cosemar', d: 'Correo con manifold foliado · 5 días hábiles de descargos', hito: 'comunicacion_empresa' },
          { id: 's3', t: 'Respuesta de la empresa', d: 'Descargos', hito: 'respuesta_empresa' },
          { id: 's4', t: '3 · Evaluación de la respuesta', d: 'Informe', hito: 'informe_evaluacion' },
          { id: 's4b', t: 'Cierre respaldado', d: 'Sin multa', hito: 'cierre_sin_multa' }] },
        { nombre: 'Propuesta de multa y decreto', pasos: [
          { id: 's5', t: '5 · Informe técnico', d: 'Tipificación y pruebas', hito: 'informe_tecnico' },
          { id: 's5b', t: 'Revisión de Edgar', d: 'Forma y fondo; visado', hito: 'revision_edgar' },
          { id: 's6', t: '6 · Memo a Secretaría Municipal', d: 'Solicita decretar', hito: 'memo_secmun' },
          { id: 's7', t: '7 · Visado de Alcaldía', d: '', hito: 'visado_alcaldia' },
          { id: 's7b', t: 'Remisión a Secretaría Municipal', d: '', hito: 'remision_secmun' },
          { id: 's8', t: '8 · Borrador de decreto', d: 'Secretaría Municipal', hito: 'borrador_decreto' },
          { id: 's9', t: '9 · Revisión de Control', d: '', hito: 'revision_control' },
          { id: 's9b', t: 'Decreto que aplica multa', d: '', hito: 'decreto_multa' },
          { id: 's10', t: '10 · Publicación en Mercado Público', d: 'Ficha de contrato', hito: 'publicacion_mp' },
          { id: 's11', t: '11 · Notificación a Cosemar', d: 'Oficio y correo · 5 días hábiles de reposición', hito: 'notificacion' }] },
        { nombre: 'Con reposición', pasos: [
          { id: 's12', t: '12 · Reposición recibida', d: '', hito: 'reposicion_recibida' },
          { id: 's12b', t: 'Análisis', d: 'Mantener, reducir o acoger', hito: 'analisis_reposicion' },
          { id: 's13', t: '13 · Memo con informe', d: '', hito: 'memo_reposicion' },
          { id: 's14', t: '14 · Visado de Jurídico', d: '', hito: 'visado_juridico' },
          { id: 's14b', t: 'Visado de Alcaldía', d: '', hito: 'visado_alcaldia_rep' },
          { id: 's15', t: '15 · Decreto final', d: '', hito: 'decreto_final' },
          { id: 's17', t: '17 · Comunicación a Cosemar', d: 'Oficio y correo', hito: 'comunicacion_final' }] },
        { nombre: 'Sin reposición', pasos: [{ id: 's18', t: 'Constancia de que no hubo reposición', d: 'Antecedente que permite avanzar a cobro (BA 187)', hito: 'sin_reposicion' }] },
        { nombre: 'Cobro', pasos: [
          { id: 's16', t: '16 · Derivación a cobro', d: 'Instrucción de descuento', hito: 'derivacion_cobro' },
          { id: 's19', t: 'Cobro o descuento efectivo', d: 'Estado de pago que lo acredita', hito: 'cobro_efectivo' }] }] }
    ],
    limites: [
      'La tabla de multas del BA 169 (pp. 51–55) no se extrae limpia del PDF: los montos por infracción requieren lectura visual antes de usarlos en una propuesta.',
      'Las bases técnicas se leyeron por artículo hasta el BT 34; las citas BT 75, 83, 95, 124–125 y 141–142 provienen del checklist ya contrastado en Notion (11-11-2026).',
      'El D.A. 7.776/2023 no se recuperó íntegro; aclaraciones y anexos posteriores no están verificados.',
      'Los expedientes sancionatorios y de pago de enero–agosto se reconstruyeron desde el Inventario maestro (corte 22-09-2026): las fechas son de archivo, no del acto.'
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAT; else root.Catalogo = CAT;
})(typeof window !== 'undefined' ? window : this);
