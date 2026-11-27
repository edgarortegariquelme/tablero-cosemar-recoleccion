/* Generador de inicio de proceso sancionatorio · Cosemar Recolección (P.P. 060/2023 · ID 3447-86-LR23)
   Toma un requerimiento con plazo vencido (manifold) y produce, en HTML listo para Google Docs:
     1) Informe técnico fundado (BA 172)   2) Cálculo de multa (BA 168, 169, 171 y 7)   3) Oficio que comunica la infracción (BA 176 y 177)
   Uso:  node acciones/generar_sancion.js <idCaso> [fechaCorte AAAA-MM-DD] [carpetaSalida]
   Los casos viven en CASOS (abajo). Los montos salen SOLO de la tabla del BA 169; el generador no inventa multas.
   Todo lo generado es BORRADOR: lo revisa y firma la Unidad Técnica; nada se envía a Cosemar desde aquí. */
const fs = require('fs'), path = require('path');
const M = require('../tablero/draft/motor.js');

// ---------- BA 169: tabla de multas (transcrita de las Bases Administrativas, págs. 51-55) ----------
// [sección, N°, UTM, concepto, frecuencia]
const SEC = { PS: 'Sanciones respecto a la prestación de los servicios', PE: 'Asociadas al personal', EQ: 'Asociadas a los equipos', FA: 'Sanciones por faltas administrativas', CL: 'Sanciones por no mantener adecuadas condiciones laborales' };
const BA169 = [
  ['PS', 1, 30, 'No realizar, o realizar parcialmente una ruta de recolección', 'Por camión sorprendido diariamente'],
  ['PS', 2, 15, 'No recolectar todos los residuos establecidos en el contrato en cada ruta (recolección incompleta)', 'Por camión sorprendido diariamente'],
  ['PS', 3, 5, 'Botar basuras al cargar en forma impropia el camión', 'Por camión sorprendido diariamente'],
  ['PS', 4, 5, 'Vaciado incompleto de canastillos o acopios de basura', 'Cada vez que se detecte'],
  ['PS', 5, 10, 'Cambio de frecuencia del servicio sin autorización del I.T.S.', 'Por cada subsector y cada vez que se detecte'],
  ['PS', 6, 5, 'Incumplimiento, en más de una hora, de algún horario de ruta del Plan de Trabajo', 'Cada vez que se detecte'],
  ['PS', 7, 10, 'Cambiar frecuencia, horarios y recorrido o ruta sin autorización de la DMAO', 'Por camión sorprendido diariamente'],
  ['PS', 8, 2, 'Ingreso no autorizado del vehículo y/o personal a un recinto a retirar residuos', 'Cada vez que sea sorprendido'],
  ['PS', 9, 1, 'No contar con las herramientas indicadas en las Especificaciones Técnicas', 'Por camión sorprendido diariamente'],
  ['PS', 10, 50, 'No entregar los residuos en los lugares de descarga especificados o autorizados', 'Por vehículo sorprendido'],
  ['PS', 11, 2, 'No retiro de animales muertos en la vía pública', 'Cada vez que se detecte'],
  ['PS', 12, 10, 'Omisión del Supervisor de informar al I.T.S. hechos extraordinarios o irregularidades', 'Cada vez que se detecte'],
  ['PS', 13, 25, 'Retirar y/o transportar residuos que no correspondan a la comuna', 'Por camión sorprendido diariamente'],
  ['PS', 14, 40, 'Aumentar artificialmente el peso de los residuos', 'Por vehículo alterado y cada vez que se detecte'],
  ['PS', 15, 20, 'Escurrimiento de percolados y/o dejar basura esparcida en la vía pública', 'Por camión sorprendido diariamente'],
  ['PS', 16, 5, 'Abandonar el camión recolector en la vía pública', 'Por camión sorprendido diariamente'],
  ['PE', 1, 3, 'No usar el uniforme definido, usarlo en mal estado o incompleto, cambiarse en la vía pública', 'Por trabajador y cada vez que se detecte'],
  ['PE', 2, 20, 'Persona trabajando que no pertenece a la nómina oficial', 'Por persona y cada vez que se detecte'],
  ['PE', 3, 5, 'Conductores sin la licencia de conducir correspondiente', 'Por chofer sorprendido'],
  ['PE', 4, 1, 'Selección, clasificación y/o comercialización de materiales durante la recolección', 'Cada vez que se detecte'],
  ['PE', 5, 10, 'Uso en la faena de personal no incluido en la dotación', 'Cada vez que se detecte'],
  ['PE', 6, 4, 'Solicitar dádivas o propinas', 'Cada vez que se compruebe el hecho'],
  ['PE', 7, 5, 'Comportamiento impropio o irrespetuoso hacia la comunidad o funcionarios municipales', 'Por persona y cada vez que se compruebe'],
  ['PE', 8, 20, 'Personal menor de 18 años sin autorización legal', 'Por persona y cada vez que se compruebe'],
  ['PE', 9, 5, 'Ausencia del personal ofertado o dotación incompleta', 'Por día y hombre ausente'],
  ['EQ', 1, 10, 'No mantener el vehículo y/o caja compactadora en condiciones técnicas adecuadas', 'Por vehículo y cada vez que se detecte'],
  ['EQ', 2, 15, 'Abandono de vehículos cargados en la vía pública (salvo fuerza mayor)', 'Por vehículo y cada vez que se detecte'],
  ['EQ', 3, 2, 'Falta o desperfecto de equipos de comunicación o localización', 'Por día de falta'],
  ['EQ', 4, 1, 'Identificación inadecuada de los vehículos o leyendas no autorizadas', 'Por vehículo y cada vez que se detecte'],
  ['EQ', 5, 5, 'Vehículos sin exigencias legales de circulación (permiso, revisión técnica, seguro)', 'Por vehículo y cada vez que se detecte'],
  ['EQ', 6, 10, 'Uso de vehículos no registrados ni avisados a la Inspección Técnica', 'Por vehículo y cada vez que se detecte'],
  ['EQ', 7, 80, 'Vehículos o equipos de antigüedad superior a la solicitada u ofertada', 'Cada vez que se detecte'],
  ['EQ', 8, 5, 'Camiones con suciedad en carrocería, capacho y bandeja de retención', 'Por camión y cada vez que se detecte'],
  ['EQ', 9, 20, 'Recolectar en paseos peatonales con equipos no permitidos', 'Cada vez que se detecte'],
  ['EQ', 10, 20, 'No presentación o no reemplazo de la camioneta de inspección', 'Cada vez que se detecte'],
  ['EQ', 11, 30, 'No reemplazo de vehículos por fallas, mantención, accidentes o restricción', 'Cada día de no reemplazo'],
  ['EQ', 12, null, 'No reposición/renovación del equipamiento (valor de mercado del equipo)', 'Cada vez que se detecte'],
  ['FA', 1, 10, 'Incumplimiento de normas laborales, previsionales o de seguridad social', 'Cada vez que se detecte'],
  ['FA', 2, 10, 'Reajustabilidad de remuneraciones menor o no realizada (Título XXVI BA)', 'Cada vez que se detecte'],
  ['FA', 3, 4, 'Incumplimiento de alguna de las condiciones exigidas (D.S. N° 594/1999) al local que sirve de Base de Operaciones del adjudicatario', 'Cada vez que se detecte'],
  ['FA', 4, 50, 'Pagar al personal sueldos inferiores a los ofertados', 'Cada vez que se detecte'],
  ['FA', 5, 3, 'Incumplimiento de normas sanitarias y/u ordenanzas municipales sobre recolección y transporte', 'Por equipo y cada vez que se detecte'],
  ['FA', 6, 20, 'Atraso en la renovación de la garantía de fiel cumplimiento y/o entrega de póliza', 'Por día de atraso'],
  ['FA', 7, 10, 'Por no cumplir con las instrucciones dadas en forma anticipada y por escrito por la I.T.S.', 'Por día de incumplimiento'],
  ['FA', 8, 2, 'No cumplir plazos del I.T.S. para reparar daños a bienes privados o públicos', 'Por cada día de atraso'],
  ['FA', 9, 30, 'Atraso en el inicio del servicio contratado', 'Por día y ruta que no se realice'],
  ['FA', 10, 2, 'Interrupción de la comunicación con el supervisor por más de 2 horas', 'Por hora después de las primeras dos'],
  ['FA', 11, 25, 'Incumplir el porcentaje ofertado de trabajadores de la comuna', 'Cada vez que se incumpla'],
  ['FA', 12, 20, 'Incumplir el porcentaje ofertado de trabajadores con contrato indefinido', 'Cada vez que se incumpla'],
  ['CL', 1, 10, 'Atraso en el pago de obligaciones laborales y de seguridad social', 'Por trabajador y cada vez que se detecte'],
  ['CL', 2, 15, 'Rebaja de remuneraciones ofertadas denunciada por trabajadores', 'Por trabajador y cada vez que se detecte'],
  ['CL', 3, 5, 'Incumplimiento de condiciones exigidas al local base de operaciones (10 UTM si ocupa otra base)', 'Por deficiencia detectada'],
  ['CL', 4, 5, 'No dotar al personal de uniformes adecuados según la época', 'Por trabajador y cada vez que se detecte'],
  ['CL', 5, 3, 'No dotar al personal de elementos de protección personal', 'Por trabajador y cada vez que se detecte'],
  ['CL', 6, 2, 'No dotar de elementos reflectantes en trabajo nocturno o de escasa visibilidad', 'Por trabajador y cada vez que se detecte']
].map(r => ({ sec: r[0], n: r[1], utm: r[2], concepto: r[3], frecuencia: r[4], ref: 'BA 169 · ' + SEC[r[0]] + ' N° ' + r[1] }));
const item = (sec, n) => { const i = BA169.find(x => x.sec === sec && x.n === n); if (!i) throw new Error('No existe el ítem ' + sec + ' ' + n + ' en el BA 169'); return i; };
// BA 168: categoría según monto de la sanción (por unidad de frecuencia).
const categoria = utm => utm == null ? 'Según valor de mercado' : utm <= 5 ? 'Leve (1 a 5 UTM)' : utm < 10 ? 'Sin categoría expresa (el BA 168 no cubre 6 a 9 UTM)' : utm <= 19 ? 'Grave (10 a 19 UTM)' : 'Muy grave (20 o más UTM)';

// ---------- Casos ----------
const CASOS = {
  'MF-2026-28': {
    proceso: 'Proceso sancionatorio N° 7/2026 (REQ-07)', informeN: '7/2026', oficioN: '___/2026',
    titulo: 'Resolución sanitaria de las instalaciones (patio de lavado y fosa de RILes)',
    manifold: { folio: '28', fecha: '2026-06-05', plazo: 5, tipoPlazo: 'hábiles',
      texto: 'Se solicita informar estado de obtención de Resolución Sanitaria instalaciones empresa, con plazo 5 días hábiles a contar de la presente notificación, conforme a mail adjunto remitido con evidencia fotográfica a Jesús.' },
    cumplimiento: { fecha: '2026-11-18', texto: 'Cosemar informó, tras la reiteración de la ITS, que inició el trámite (primero la patente comercial; documentos en revisión desde octubre) y que informaría la semana siguiente. No acompañó resolución sanitaria ni ingreso a la SEREMI de Salud.' },
    hechos: [
      ['2026-06-04', 'Inspección visual del Encargado Ambiental DMAO a la base de operaciones de Cosemar: las aguas del lavado de flota (RILes) se canalizan a una fosa de acumulación de aprox. 3 m³ con eventos de colapso y saturación, evacuada con camiones limpiafosas. No consta resolución sanitaria del predio ni de la faena de lavado (correo con registro fotográfico).'],
      ['2026-06-05', 'Manifold N° 28: se requiere a Cosemar informar el estado de obtención de la resolución sanitaria de sus instalaciones, en 5 días hábiles.'],
      ['2026-06-12', 'Vence el plazo del manifold N° 28 (5 días hábiles, BA 7) sin respuesta de Cosemar.'],
      ['2026-11-18', 'La ITS reitera el requerimiento. Cosemar responde el mismo día que el trámite está iniciado y que informará la semana siguiente.'],
      ['2026-11-27', 'A la fecha del informe Cosemar no ha presentado la resolución sanitaria ni el comprobante de ingreso de la solicitud a la autoridad sanitaria.']
    ],
    normas: [
      ['BA 120', 'El adjudicatario deberá disponer de un lugar físico a fin de dar cumplimiento a lo indicado en el D.S. N° 594/1999 del Ministerio de Salud.'],
      ['BT 56', 'Los camiones deberán ser lavados diariamente […] cuidando que el lugar de aparcamiento de los vehículos y el personal involucrado cumpla con las disposiciones vigentes, no altere a los vecinos del sector y cumpla las instrucciones emanadas por el Ministerio de Salud en lo referente al lavado de camiones (RILES). Se fiscalizará.'],
      ['BT 58', 'Para el resguardo de la comunidad vecina, deberá mantener las instalaciones limpias, libre de malos olores y vectores […] Las operaciones mecánicas de mantenimiento o lavado no podrán realizarse en la vía pública.'],
      ['BA 111', 'Cualquier contravención a las leyes […] sanitarias […] será de exclusiva responsabilidad de los adjudicatarios.'],
      ['D.S. N° 594/1999, art. 18', 'La acumulación, tratamiento y disposición final de residuos industriales dentro del predio industrial, local o lugar de trabajo, deberá contar con la autorización sanitaria.'],
      ['BA 7', 'Los plazos de las Bases son de días corridos, salvo que expresamente se establezca que son hábiles (inhábiles: sábados, domingos y festivos).']
    ],
    // Cargos: cada uno referencia un ítem del BA 169. dias:'incumplimiento' cuenta días corridos desde el día siguiente al vencimiento
    // hasta el día anterior al cumplimiento (o hasta la fecha de corte si no ha cumplido).
    cargos: [
      { sec: 'FA', n: 7, dias: 'incumplimiento', hecho: 'No cumplir, dentro del plazo de 5 días hábiles, la instrucción escrita del manifold N° 28 (informar el estado de la resolución sanitaria de las instalaciones). Cosemar recién informó el 18-11-2026, tras la reiteración.' },
      { sec: 'FA', n: 3, veces: 1, hecho: 'Operar la base de operaciones con una fosa de acumulación de RILes del lavado de flota sin la autorización sanitaria que exige el art. 18 del D.S. N° 594/1999, condición a la que obligan el BA 120 y el BT 56.' }
    ],
    descartados: [
      ['BA 169 · CL N° 3 (5 UTM por deficiencia)', 'Describe la misma conducta que FA N° 3 (condiciones D.S. 594 del local base de operaciones) con distinto monto. No se aplican ambos al mismo hecho; se opta por FA N° 3 (4 UTM), la lectura más favorable al contratista, porque la ambigüedad de las bases se interpreta contra quien las redactó.'],
      ['BA 169 · FA N° 5 (3 UTM por equipo)', 'Se refiere a normas sanitarias sobre recolección y transporte de residuos; el hecho ocurre en las instalaciones, no en la recolección ni en el transporte.'],
      ['Observaciones de la visita técnica del 30-09-2026 (PS07)', 'Se tramitan en su propio proceso; no se suman aquí para no sancionar dos veces el mismo hecho.']
    ],
    utm: { valor: 72440, mes: 'noviembre de 2026', fuente: 'SII. Valor derivado de la Circular N° 39/2026 (10 UTM = $724.400); confirmar en la tabla oficial www.sii.cl antes de cursar' },
    firmas: { de: 'ANDREA LEÓN VÁSQUEZ', cargoDe: 'DIRECTORA DE MEDIO AMBIENTE, ASEO Y ORNATO', a: 'JESÚS CHINCHAYÁN ALFARO', cargoA: 'JEFE DE PROYECTO RECOLECCIÓN ALTO HOSPICIO, COSEMAR SpA', iniciales: 'ALV/eor' },
    respaldos: ['Manifold N° 28 (05-06-2026)', 'Correo del Encargado Ambiental DMAO con registro fotográfico (04-06-2026)', 'Reiteración de la ITS y respuesta de Cosemar (18-11-2026)']
  }
};

// ---------- Cálculo ----------
const fCL = s => s ? s.slice(8, 10) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4) : '—';
const fLarga = s => { const m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']; return (+s.slice(8, 10)) + ' de ' + m[+s.slice(5, 7) - 1] + ' de ' + s.slice(0, 4); };
const pesos = n => '$' + Math.round(n).toLocaleString('es-CL');
const num = n => n.toLocaleString('es-CL');

function calcular(caso, corte) {
  const mf = caso.manifold;
  const vence = mf.tipoPlazo === 'hábiles' ? M.sumarHabiles(mf.fecha, mf.plazo) : M.sumarDias(mf.fecha, mf.plazo);
  const desde = M.sumarDias(vence, 1);
  const hasta = caso.cumplimiento && caso.cumplimiento.fecha ? M.sumarDias(caso.cumplimiento.fecha, -1) : corte;
  const diasInc = Math.max(0, M.diasCorridos(desde, hasta) + 1);
  const cargos = caso.cargos.map(c => {
    const it = item(c.sec, c.n), cant = c.dias === 'incumplimiento' ? diasInc : (c.veces || 1);
    const unidad = c.dias === 'incumplimiento' ? 'días corridos de incumplimiento (' + fCL(desde) + ' al ' + fCL(hasta) + ')' : (cant === 1 ? 'vez detectada' : 'veces detectadas');
    return Object.assign({}, c, { item: it, cantidad: cant, unidad, utm: it.utm * cant, categoria: categoria(it.utm) });
  });
  const totalUTM = cargos.reduce((s, c) => s + c.utm, 0);
  return { vence, desde, hasta, diasInc, cargos, totalUTM, totalCLP: totalUTM * caso.utm.valor };
}

// ---------- Documentos ----------
const CSS = '<style>body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.4}h1{font-size:14pt;text-align:center}h2{font-size:12pt;margin-top:16pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:4px 6px;vertical-align:top;font-size:10pt}th{background:#e8e8e8}.nota{background:#fff3cd;border:1px solid #e0c060;padding:6px}.der{text-align:right}</style>';
const enc = (t) => '<html><head><meta charset="utf-8">' + CSS + '</head><body><p class="nota"><b>BORRADOR</b> generado por el control contractual para revisión de la Unidad Técnica. No ha sido enviado.</p>' + t + '</body></html>';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function tablaCalculo(caso, r) {
  let h = '<table><tr><th>Cargo</th><th>Ítem BA 169</th><th>Categoría (BA 168)</th><th>UTM unitaria</th><th>Frecuencia</th><th>Cantidad</th><th>Total UTM</th></tr>';
  r.cargos.forEach((c, i) => { h += '<tr><td>' + (i + 1) + '. ' + esc(c.hecho) + '</td><td>' + esc(c.item.ref) + ': «' + esc(c.item.concepto) + '»</td><td>' + c.categoria + '</td><td class="der">' + c.item.utm + '</td><td>' + esc(c.item.frecuencia) + '</td><td class="der">' + c.cantidad + ' ' + esc(c.unidad) + '</td><td class="der"><b>' + num(c.utm) + '</b></td></tr>'; });
  h += '<tr><td colspan="6" class="der"><b>Total</b></td><td class="der"><b>' + num(r.totalUTM) + ' UTM</b></td></tr>';
  h += '<tr><td colspan="6" class="der">Equivalencia referencial en pesos (UTM ' + caso.utm.mes + ' = ' + pesos(caso.utm.valor) + ')</td><td class="der"><b>' + pesos(r.totalCLP) + '</b></td></tr></table>';
  return h;
}

function informe(caso, r, corte) {
  let h = '<h1>INFORME TÉCNICO FUNDADO N° ' + caso.informeN + '</h1><p style="text-align:center">' + esc(caso.proceso) + ' · ' + esc(caso.titulo) + '<br>Contrato «Servicio de Recolección, Transporte y Disposición Final de Residuos Sólidos Domiciliarios y Asimilables de la Comuna de Alto Hospicio», P.P. N° 060/2023, ID 3447-86-LR23</p>';
  h += '<p>Alto Hospicio, ' + fLarga(corte) + '</p>';
  h += '<h2>1. Objeto</h2><p>Calificar el incumplimiento de Cosemar SpA respecto del requerimiento del manifold N° ' + caso.manifold.folio + ' y proponer la multa que corresponde según las Bases Administrativas (BA 172), para iniciar el procedimiento de aplicación de multas del Título XXXII (BA 176 a 179).</p>';
  h += '<h2>2. Hechos constatados</h2><table><tr><th>Fecha</th><th>Hecho</th></tr>' + caso.hechos.map(x => '<tr><td>' + fCL(x[0]) + '</td><td>' + esc(x[1]) + '</td></tr>').join('') + '</table>';
  h += '<h2>3. Requerimiento incumplido</h2><p>Manifold N° ' + caso.manifold.folio + ' del ' + fCL(caso.manifold.fecha) + ': «' + esc(caso.manifold.texto) + '». Plazo de ' + caso.manifold.plazo + ' días ' + caso.manifold.tipoPlazo + ', vencido el <b>' + fCL(r.vence) + '</b>. ';
  h += caso.cumplimiento ? 'Respuesta de la empresa: ' + fCL(caso.cumplimiento.fecha) + '. ' + esc(caso.cumplimiento.texto) + '</p>' : 'Sin respuesta a la fecha.</p>';
  h += '<h2>4. Normas contractuales y legales infringidas</h2><table><tr><th>Norma</th><th>Texto</th></tr>' + caso.normas.map(x => '<tr><td>' + esc(x[0]) + '</td><td>' + esc(x[1]) + '</td></tr>').join('') + '</table>';
  h += '<h2>5. Calificación y multa aplicable (BA 168, 169, 171 y 7)</h2>' + tablaCalculo(caso, r);
  h += '<p>Cómputo: el plazo del manifold venció el ' + fCL(r.vence) + '; el incumplimiento corre desde el ' + fCL(r.desde) + ' hasta el ' + fCL(r.hasta) + ', día anterior a la respuesta de la empresa, en días corridos porque el BA 169 sanciona «por día de incumplimiento» y el BA 7 fija que los plazos de las Bases son corridos salvo mención expresa: <b>' + r.diasInc + ' días</b>. La conversión a pesos se hace al valor de la UTM de la fecha en que se curse la multa (BA 171), revisada por el I.T.S. y con V°B° de la Unidad Técnica.</p>';
  h += '<h2>6. Ítems analizados y descartados</h2><table><tr><th>Ítem</th><th>Motivo</th></tr>' + caso.descartados.map(x => '<tr><td>' + esc(x[0]) + '</td><td>' + esc(x[1]) + '</td></tr>').join('') + '</table>';
  h += '<h2>7. Riesgos que la Dirección debe ponderar antes de notificar</h2><ul>' +
    '<li><b>Monto.</b> El cargo 1 suma ' + num(r.cargos[0] ? r.cargos[0].utm : 0) + ' UTM (' + pesos((r.cargos[0] ? r.cargos[0].utm : 0) * caso.utm.valor) + '), del orden de la mitad de una facturación mensual. Es la cifra que resulta de las Bases, pero la empresa probablemente alegará falta de proporcionalidad. Se recomienda V°B° de Asesoría Jurídica antes de notificar.</li>' +
    '<li><b>Inactividad del mandante.</b> Entre el vencimiento (' + fCL(r.vence) + ') y la reiteración (18-11-2026) no hubo nuevas gestiones de la ITS. Cosemar puede alegar tolerancia. Mitigación: el plazo y la instrucción constan por escrito en el libro de servicio y no fueron modificados.</li>' +
    '<li><b>Quién dio la instrucción.</b> El ítem FA N° 7 exige una instrucción escrita del I.T.S. El manifold N° 28 consta en el libro de servicio con timbre de la DMAO; acompañar la firma o visación del I.T.S. al expediente.</li>' +
    '<li><b>BA 170.</b> Más de 20 sanciones graves o muy graves en el año calendario facultan el término del contrato. Este proceso se computa como una sanción (una infracción con monto por día), no como una por cada día.</li>' +
    '<li><b>Alternativa prudente (si la Dirección no persigue el cargo 1):</b> aplicar solo el cargo 2 (' + num(r.cargos[1] ? r.cargos[1].utm : 0) + ' UTM) y dictar una instrucción nueva con plazo cierto para presentar la resolución sanitaria o el ingreso a la SEREMI. Su incumplimiento devengaría FA N° 7 (10 UTM por día) desde el vencimiento, sin discusión sobre la tolerancia.</li></ul>';
  h += '<h2>8. Propuesta</h2><p>Iniciar el procedimiento de aplicación de multas notificando a Cosemar SpA por oficio (BA 176), con indicación de las infracciones, los hechos y el monto de ' + num(r.totalUTM) + ' UTM, y otorgar 5 días hábiles para descargos (BA 177). Vencido el plazo sin descargos, solicitar el decreto alcaldicio que aplica la multa (BA 178); con descargos, resolverlos dentro de 20 días hábiles (BA 179). Se instruye además regularizar la autorización sanitaria y acreditar el ingreso del trámite a la SEREMI de Salud.</p>';
  h += '<h2>9. Respaldos</h2><ul>' + caso.respaldos.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  h += '<br><br><p style="text-align:center">______________________________<br>' + esc(caso.firmas.de) + '<br>' + esc(caso.firmas.cargoDe) + '<br>Municipalidad de Alto Hospicio</p>';
  return enc(h);
}

function calculoDoc(caso, r, corte) {
  let h = '<h1>CÁLCULO DE MULTA · ' + esc(caso.proceso) + '</h1><p>Fecha de corte: ' + fCL(corte) + ' · Base: BA 169 (tabla de multas), BA 168 (categorías), BA 171 (conversión), BA 7 (cómputo de días).</p>';
  h += tablaCalculo(caso, r);
  h += '<h2>Cómputo de días del cargo 1</h2><table><tr><td>Notificación del manifold N° ' + caso.manifold.folio + '</td><td>' + fCL(caso.manifold.fecha) + '</td></tr><tr><td>Plazo</td><td>' + caso.manifold.plazo + ' días ' + caso.manifold.tipoPlazo + '</td></tr><tr><td>Vencimiento</td><td>' + fCL(r.vence) + '</td></tr><tr><td>Primer día de incumplimiento</td><td>' + fCL(r.desde) + '</td></tr><tr><td>Último día de incumplimiento</td><td>' + fCL(r.hasta) + '</td></tr><tr><td>Días corridos (BA 7)</td><td><b>' + r.diasInc + '</b></td></tr></table>';
  h += '<h2>Escenarios</h2><table><tr><th>Escenario</th><th>UTM</th><th>Pesos referenciales</th></tr>' +
    '<tr><td>A. Según las Bases (cargos 1 y 2), recomendado con V°B° de Jurídico</td><td class="der">' + num(r.totalUTM) + '</td><td class="der">' + pesos(r.totalCLP) + '</td></tr>' +
    (r.cargos[1] ? '<tr><td>B. Alternativa prudente: solo el cargo 2 más una instrucción nueva con plazo</td><td class="der">' + num(r.cargos[1].utm) + '</td><td class="der">' + pesos(r.cargos[1].utm * caso.utm.valor) + '</td></tr>' : '') + '</table>';
  h += '<p>UTM: ' + pesos(caso.utm.valor) + ' (' + caso.utm.mes + '). Fuente: ' + esc(caso.utm.fuente) + '. El monto definitivo se convierte al valor de la UTM del mes en que se curse la multa (BA 171).</p>';
  return enc(h);
}

function oficio(caso, r, corte) {
  const c = r.cargos;
  let h = '<p><b>OFICIO N° ' + caso.oficioN + '</b></p><table style="border:none"><tr><td style="border:none;width:60px"><b>A</b></td><td style="border:none">: ' + esc(caso.firmas.a) + '<br>&nbsp;&nbsp;' + esc(caso.firmas.cargoA) + '</td></tr><tr><td style="border:none"><b>DE</b></td><td style="border:none">: ' + esc(caso.firmas.de) + '<br>&nbsp;&nbsp;' + esc(caso.firmas.cargoDe) + ', MUNICIPALIDAD DE ALTO HOSPICIO</td></tr></table>';
  h += '<p class="der">Alto Hospicio, ' + fLarga(corte) + '</p><p><b>MAT.:</b> Comunica infracciones e inicio de procedimiento de aplicación de multas. ' + esc(caso.titulo) + '.</p>';
  h += '<p>Junto con saludar, y en el marco del contrato «Servicio de Recolección, Transporte y Disposición Final de Residuos Sólidos Domiciliarios y Asimilables de la Comuna de Alto Hospicio» (P.P. N° 060/2023, ID 3447-86-LR23), conforme al artículo 176 de las Bases Administrativas informo a usted lo siguiente:</p>';
  h += '<p>1. Que, mediante manifold N° ' + caso.manifold.folio + ' de fecha ' + fCL(caso.manifold.fecha) + ', se requirió a la empresa informar el estado de obtención de la resolución sanitaria de sus instalaciones, en un plazo de ' + caso.manifold.plazo + ' días ' + caso.manifold.tipoPlazo + ', que venció el ' + fCL(r.vence) + ' sin respuesta. La empresa recién informó el ' + fCL(caso.cumplimiento.fecha) + ', tras la reiteración de la Inspección Técnica, que el trámite se encuentra iniciado, sin acompañar la resolución ni el ingreso de la solicitud a la autoridad sanitaria.</p>';
  h += '<p>2. Que, en la inspección del ' + fCL(caso.hechos[0][0]) + ', se constató que las aguas del lavado de la flota (residuos industriales líquidos) se acumulan en una fosa de aproximadamente 3 m³, con eventos de saturación, sin la autorización sanitaria que exige el artículo 18 del D.S. N° 594/1999, en contravención del artículo 120 de las Bases Administrativas y del artículo 56 de las Bases Técnicas.</p>';
  h += '<p>3. Que, de acuerdo con el Informe Técnico N° ' + caso.informeN + ', los hechos descritos constituyen las siguientes infracciones del artículo 169 de las Bases Administrativas:</p><table><tr><th>Infracción</th><th>Multa</th></tr>' +
    c.map(x => '<tr><td>' + esc(x.item.ref) + ': «' + esc(x.item.concepto) + '».</td><td>' + x.item.utm + ' UTM ' + esc(x.item.frecuencia.toLowerCase()) + ' × ' + x.cantidad + ' ' + esc(x.unidad) + ' = <b>' + num(x.utm) + ' UTM</b></td></tr>').join('') +
    '<tr><td class="der"><b>Monto total de la multa</b></td><td><b>' + num(r.totalUTM) + ' UTM</b></td></tr></table>';
  h += '<p>El monto se convertirá a pesos al valor de la UTM de la fecha en que se curse la multa, conforme al artículo 171 de las Bases Administrativas.</p>';
  h += '<p>4. Conforme al artículo 177 de las Bases Administrativas, la empresa dispone de un plazo máximo de <b>cinco (05) días hábiles</b>, contados desde la notificación del presente oficio, para presentar sus descargos por escrito ante la Unidad Técnica, acompañando todos los antecedentes que estime pertinentes. Vencido dicho plazo sin descargos, se dictará el decreto alcaldicio que aplica la multa (art. 178).</p>';
  h += '<p>5. Sin perjuicio de lo anterior, se instruye a la empresa regularizar la autorización sanitaria de la acumulación de residuos industriales líquidos en su base de operaciones y acreditar ante esta Dirección, dentro del mismo plazo, el ingreso de la solicitud a la SEREMI de Salud de Tarapacá, junto con los certificados de retiro y disposición final de los residuos de la fosa.</p>';
  h += '<p>Saluda atentamente,</p><br><br><p style="text-align:center">______________________________<br>' + esc(caso.firmas.de) + '<br>' + esc(caso.firmas.cargoDe) + '<br>MUNICIPALIDAD DE ALTO HOSPICIO</p>';
  h += '<p style="font-size:9pt">' + esc(caso.firmas.iniciales) + '<br>Distribución: Empresa Cosemar SpA · Inspección Técnica del Servicio · Archivo DMAO</p>';
  return enc(h);
}

function generar(id, corte, salida) {
  const caso = CASOS[id]; if (!caso) throw new Error('Caso desconocido: ' + id + '. Casos: ' + Object.keys(CASOS).join(', '));
  corte = corte || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
  const r = calcular(caso, corte);
  if (salida) {
    fs.mkdirSync(salida, { recursive: true });
    fs.writeFileSync(path.join(salida, '1_informe_tecnico.html'), informe(caso, r, corte));
    fs.writeFileSync(path.join(salida, '2_calculo_multa.html'), calculoDoc(caso, r, corte));
    fs.writeFileSync(path.join(salida, '3_oficio_comunica_infraccion.html'), oficio(caso, r, corte));
  }
  return r;
}

module.exports = { BA169, CASOS, calcular, generar, item, categoria };
if (require.main === module) {
  const [id = 'MF-2026-28', corte, salida] = process.argv.slice(2);
  const r = generar(id, corte, salida);
  console.log(JSON.stringify({ vence: r.vence, desde: r.desde, hasta: r.hasta, diasInc: r.diasInc, cargos: r.cargos.map(c => [c.item.ref, c.cantidad, c.utm]), totalUTM: r.totalUTM, totalCLP: r.totalCLP }, null, 1));
}
