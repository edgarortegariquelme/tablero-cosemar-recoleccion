/* Ingesta de Gmail para el control Cosemar (sin n8n ni Notion).
   Lee por IMAP (contraseña de aplicación: secretos GMAIL_USUARIO y GMAIL_CLAVE_APP) los correos del contrato desde la última
   lectura, los clasifica en correos, manifolds y revisiones técnicas, y guarda el estado en datos/auto/gmail.json.
   datos/operacion.js mezcla ese estado con los datos curados a mano. Modo de prueba: GMAIL_PRUEBA=<archivo.json con mensajes>. */
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const RAIZ = path.join(__dirname, '..'), ESTADO = path.join(RAIZ, 'datos/auto/gmail.json');

// Qué correos son del contrato: Cosemar (grupo EBI), la ITS y asuntos con los ID de las licitaciones.
const BUSQUEDA = '(from:grupoebi.cl OR to:grupoebi.cl OR cc:grupoebi.cl OR from:hgomez@maho.cl OR subject:cosemar OR "3447-86-LR23" OR "3447-187-LR24" OR subject:manifold)';
const RUTINA = /Ingresos I\.?\s*M\.? de Alto Hospicio y Ticket/i;            // tickets diarios del relleno: se registran sin aviso
const DF = /disposici[oó]n final|relleno|santa in[eé]s|3447-187|rbarril/i;
const SANCION = /sancion|multa|incumplimiento|descargo|apelaci/i;
const PIDE = /solicit|favor|requier|consult|pide|necesit|\?/i;
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

const limpiarAsunto = s => (s || '(sin asunto)').replace(/\*{2,}\s*spam\s*\*{2,}/ig, '').replace(/^\s*((re|rv|fw|fwd|reenviar|resp)\s*:\s*)+/i, '').replace(/\s+/g, ' ').trim();
// Nombres de quienes escriben sin nombre visible (la ITS envía solo con su dirección).
const NOMBRES = { 'hgomez@maho.cl': 'Hernán Gómez (ITS)' };
const nombreDe = d => d.nombre || NOMBRES[d.correo] || d.correo;
// Cuerpo propio del mensaje, sin la conversación citada debajo.
const propio = t => (t || '').replace(/\r/g, '').split(/\n(?:El .{5,80} escribió:|De: |-----\s*Mensaje original|On .{5,80} wrote:)/)[0];
// Página de manifold mencionada en el cuerpo: «respaldo en manifold pagina 20», «Manifold pág. 22», «pagina 21 manifold».
function paginaManifold(t) {
  const m = t.match(/manifol?d?[\s,;:]*(?:de\s+la\s+solicitud\s*)?p[áa]g(?:ina)?\.?\s*(?:n[°º]\s*)?(\d{1,3})/i) || t.match(/p[áa]g(?:ina)?\.?\s*(?:n[°º]\s*)?(\d{1,3})\s*(?:del?\s+)?manifol/i)
    || t.match(/manifol?d?\s*(?:n[°º]\s*)?(\d{1,3})\b(?![-/.]\d)/i) || t.match(/respaldo en p[áa]g(?:ina)?\.?\s*(\d{1,3})/i);
  return m ? m[1] : null;
}
const CIERRA = /se da(?:n)? por cerrad|cierre de (?:las )?observaciones|se acoge|son acogidos|dar(?:\s+por)? cerrad|cierre del proceso|estado\s*:\s*cerrad|v[°º.]?\s*b[°º.]?\s*(?:al|para el)\s+cierre|fecha de cierre|se cierra (?:la|el) (?:solicitud|requerimiento|manifold)/i;
// Plazo que fija la ITS en su texto: «plazo máximo de 5 días», «no superior a 5 días hábiles». Sin «hábiles» son corridos (BA 7).
const plazoEn = t => { const x = (t || '').match(/plazo[^.]{0,40}?(\d{1,3})\s*d[ií]as(\s+h[aá]biles)?/i); return x ? { dias: +x[1], unidad: x[2] ? 'hábiles' : 'corridos' } : null; };
// Constancia en el libro manifold sin número de página («Se deja constancia … en el libro Manifold»).
const CONSTANCIA_MF = /(constancia|respaldo)[^.]{0,80}manifold|libro\s+manifold/i;
// Fecha de cierre declarada por la ITS («Fecha de cierre: 24/11/2026»); si no, la del correo.
const fechaCierre = (t, def) => { const x = (t || '').match(/fecha de cierre\s*:?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/i); return x ? x[3] + '-' + x[2].padStart(2, '0') + '-' + x[1].padStart(2, '0') : def; };
const fechaCL = d => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
const resumen = t => propio(t).replace(/\s+/g, ' ').trim().slice(0, 220);
const empresaDe = c => /grupoebi\.cl$/i.test(c) ? 'Cosemar' : /maho\.cl$/i.test(c) ? 'DMAO' : /gmail\.com$/i.test(c) ? 'DMAO' : 'Otro';

function leerEstado() { try { return JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch (e) { return { desde: '2026-11-19', correos: {}, manifolds: {}, rt: {}, vistos: [] }; } }

// Fecha de vigencia de un certificado de revisión técnica (texto del PDF). Toma la fecha más lejana posterior a la emisión.
function fechasEn(t) {
  const f = [];
  for (const m of t.matchAll(/(\d{1,2})\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s*(?:de\s+|del\s+)?(\d{4})/g)) f.push([+m[3], MESES[m[2]], +m[1], m.index]);
  for (const m of t.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g)) f.push([+m[3], +m[2], +m[1], m.index]);
  return f.filter(([a, m, d]) => a >= 2020 && a <= 2040 && m >= 1 && m <= 12 && d >= 1 && d <= 31).map(([a, m, d, i]) => ({ iso: a + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'), i }));
}
// Fecha de vigencia de un certificado de revisión técnica: la primera fecha después de «válida hasta»; si no, la más lejana posterior a la emisión.
function vigenciaRT(texto, emision) {
  const t = (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), fs_ = fechasEn(t).filter(x => x.iso > emision);
  const h = t.search(/valid[ao]s?\s+hasta|vence|vigente\s+hasta|proxima\s+revision/);
  if (h >= 0) { const tras = fs_.filter(x => x.i > h && x.i - h < 400).sort((a, b) => a.i - b.i)[0]; if (tras) return tras.iso; }
  return fs_.map(x => x.iso).sort().pop() || null;
}
// Texto de un PDF; si es un escaneo sin capa de texto, se pasa por OCR (tesseract, español).
function textoPDF(buf) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-')), f = path.join(tmp, 'c.pdf'); fs.writeFileSync(f, buf);
  try {
    let t = ''; try { t = execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8', timeout: 20000 }); } catch (e) {}
    if (t.replace(/\s/g, '').length > 80) return t;
    execFileSync('pdftoppm', ['-r', '300', '-gray', '-png', '-f', '1', '-l', '2', f, path.join(tmp, 'p')], { timeout: 60000 });
    return fs.readdirSync(tmp).filter(x => /^p.*\.png$/.test(x)).sort().map(x => { try { return execFileSync('tesseract', [path.join(tmp, x), '-', '-l', 'spa'], { encoding: 'utf8', timeout: 90000, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return ''; } }).join('\n');
  } catch (e) { return ''; } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
function imagenRT(adj, movil) {
  const destino = path.join(RAIZ, 'docs/fotos/rt-' + movil + '.jpg');
  if (/jpe?g$/i.test(adj.nombre) || /jpeg/.test(adj.tipo || '')) { fs.writeFileSync(destino, adj.contenido); return true; }
  if (/pdf$/i.test(adj.nombre) || /pdf/.test(adj.tipo || '')) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtimg-')), f = path.join(tmp, 'c.pdf'); fs.writeFileSync(f, adj.contenido);
    try { execFileSync('pdftoppm', ['-jpeg', '-r', '90', '-singlefile', f, path.join(tmp, 'p')], { timeout: 30000 }); fs.copyFileSync(path.join(tmp, 'p.jpg'), destino); return true; }
    catch (e) { return false; } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  return false;
}

// Clasifica un mensaje normalizado { id, hilo, fecha, de:{nombre,correo}, asunto, texto, adjuntos:[{nombre,tipo,contenido}] }.
function clasificar(m, st, novedades) {
  // Solo cuentan Cosemar/Grupo EBI y la municipalidad (fuera avisos automáticos, p. ej. notificaciones de GitHub).
  if (empresaDe(m.de.correo) === 'Otro' || /noreply|no-reply|notifications@/i.test(m.de.correo)) return;
  if (/^Control Cosemar$/i.test(m.de.nombre || '') || /^Cosemar · \d/.test(m.asunto || '')) return;   // los propios avisos del sistema
  const hoy = fechaCL(m.fecha), asunto = limpiarAsunto(m.asunto), emp = empresaDe(m.de.correo), contrato = DF.test(asunto + ' ' + m.de.correo) ? 'Disposición final' : 'Recolección';
  const enlace = 'https://mail.google.com/mail/u/0/#all/' + m.hilo;
  // 1) Revisión técnica: «Revisión Técnica M-922»
  const rt = asunto.match(/revisi[oó]n\s+t[eé]cnica\D{0,12}(\d{3,4})/i);
  if (rt) {
    const movil = rt[1], adjs = m.adjuntos || [];
    // El certificado: el PDF; si no hay, una imagen grande (las firmas de correo son imágenes chicas).
    const adj = adjs.find(a => /pdf/i.test(a.nombre + ' ' + a.tipo)) || adjs.find(a => /jpe?g|png/i.test(a.nombre + ' ' + a.tipo) && a.contenido.length > 60000);
    let vence = null, imagen = false;
    if (adj) { if (/pdf/i.test(adj.nombre + adj.tipo)) vence = vigenciaRT(textoPDF(adj.contenido), hoy); imagen = imagenRT(adj, movil); }
    const prev = st.rt[movil];
    if (!prev || prev.recibido < hoy || (vence && prev.vence !== vence)) {
      st.rt[movil] = { recibido: hoy, vence, hilo: m.hilo, imagen };
      novedades.push(vence ? { tipo: 'Flota', texto: 'Llegó la revisión técnica del móvil ' + movil + ': vigente hasta el ' + vence.split('-').reverse().join('-') + '. Quedó cargada en Flota.', enlace }
        : { tipo: 'Flota', texto: 'Llegó la revisión técnica del móvil ' + movil + ', pero no pude leer la fecha de vigencia: confírmala en el certificado.', enlace });
    }
  }
  // 2) Manifold: adjunto o asunto «manifold N», o la ITS que deja respaldo en una página del libro manifold (en el cuerpo propio).
  const textoMf = (m.adjuntos || []).map(a => a.nombre).join(' ') + ' ' + asunto, cuerpo = propio(m.texto);
  // La página que la ITS declara en su propio texto manda sobre números del asunto.
  let pagina = (/hgomez@maho\.cl/i.test(m.de.correo) && paginaManifold(cuerpo)) || paginaManifold(textoMf);
  // Un manifold ya registrado en este mismo hilo (la ITS suele cerrar respondiendo en el hilo de la solicitud).
  const kHilo = Object.keys(st.manifolds).find(x => (st.manifolds[x].respaldo || '').endsWith('/' + m.hilo));
  const esITS = /hgomez@maho\.cl/i.test(m.de.correo);
  if (pagina || /manifold/i.test(textoMf) || kHilo || (esITS && CONSTANCIA_MF.test(cuerpo))) {
    const k = pagina ? hoy.slice(0, 4) + '-' + pagina : kHilo || hoy.slice(0, 4) + '-' + m.hilo;
    const mf = st.manifolds[k] || (kHilo && st.manifolds[kHilo]);
    if (mf && mf.estado !== 'Cerrado' && emp === 'DMAO' && CIERRA.test(cuerpo)) {
      mf.estado = 'Cerrado'; mf.cierre = fechaCierre(cuerpo, hoy); mf.nota = (mf.nota || '') + ' · Cerrado por ' + nombreDe(m.de) + ' el ' + mf.cierre.split('-').reverse().join('-') + ': ' + resumen(m.texto).slice(0, 160);
      novedades.push({ tipo: 'Manifold', texto: 'Manifold ' + (mf.pagina && mf.pagina !== '?' ? 'pág. ' + mf.pagina + ' ' : '') + 'cerrado el ' + mf.cierre.split('-').reverse().join('-') + ': ' + mf.motivo + '.', enlace });
    }
    if (!mf) {
      const cerrado = CIERRA.test(cuerpo);
      const pl = esITS ? plazoEn(cuerpo) : null;
      st.manifolds[k] = { id: 'MF-' + hoy.slice(0, 4) + '-' + (pagina ? pagina.padStart(2, '0') : 'X' + m.hilo.slice(-4)), fecha: hoy, pagina: pagina || '?', motivo: asunto,
        plazoDias: pl ? pl.dias : null, plazoUnidad: pl ? pl.unidad : null,
        tipo: cerrado ? 'Cierre' : SANCION.test(asunto + ' ' + cuerpo) ? 'Proceso sancionatorio' : 'Por clasificar', estado: cerrado ? 'Cerrado' : 'Abierto', cierre: cerrado ? hoy : null,
        nota: 'Ingresado automáticamente desde Gmail (' + nombreDe(m.de) + '). ' + resumen(m.texto).slice(0, 160), respaldo: enlace };
      novedades.push({ tipo: 'Manifold', texto: 'Manifold ' + (pagina ? 'pág. ' + pagina + ' ' : '') + 'del ' + hoy.split('-').reverse().join('-') + (cerrado ? ' (cierre)' : '') + ': ' + asunto + (cerrado ? '.' : '. Revisa motivo y plazo.'), enlace });
    }
  }
  // 3) Correo: una fila por hilo con su último mensaje.
  const prev = st.correos[m.hilo];
  if (prev && prev.fecha > hoy) return;
  const deMuni = emp === 'DMAO', rutina = RUTINA.test(asunto);
  const estado = rutina ? 'Informativo' : deMuni ? (CIERRA.test(cuerpo) ? 'Cerrado' : 'En curso') : PIDE.test(asunto + ' ' + resumen(m.texto)) ? 'Responder' : 'Revisar';
  const urgencia = rutina ? 'Baja' : SANCION.test(asunto) || /orden de compra|\bOC\b|factura|pago/i.test(asunto) ? 'Alta' : 'Media';
  st.correos[m.hilo] = { fecha: hoy, contacto: nombreDe(m.de), empresa: emp, tema: asunto, contrato, urgencia, estado, nota: resumen(m.texto), hilo: m.hilo };
  if (!rutina && !deMuni && (!prev || prev.fecha < hoy || prev.estado !== estado)) novedades.push({ tipo: 'Correo', texto: nombreDe(m.de) + ' (' + emp + '): ' + asunto + ' — ' + resumen(m.texto).slice(0, 140), enlace });
}

async function mensajesIMAP(desde) {
  const { ImapFlow } = require('imapflow'), { simpleParser } = require('mailparser');
  const c = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: process.env.GMAIL_USUARIO, pass: process.env.GMAIL_CLAVE_APP }, logger: false });
  await c.connect(); const out = [];
  try {
    const cajas = await c.list(), todos = cajas.find(b => b.specialUse === '\\All');
    const lock = await c.getMailboxLock(todos ? todos.path : 'INBOX');
    try {
      const uids = await c.search({ gmraw: 'after:' + desde.replace(/-/g, '/') + ' ' + BUSQUEDA }, { uid: true });
      if (Array.isArray(uids) && uids.length) for await (const msg of c.fetch(uids, { uid: true, envelope: true, threadId: true, size: true, source: true }, { uid: true })) {
        const p = msg.size < 25e6 ? await simpleParser(msg.source) : { text: '', attachments: [] }, de = (msg.envelope.from || [{}])[0];
        out.push({ id: p.messageId || String(msg.uid), hilo: BigInt(msg.threadId).toString(16), fecha: msg.envelope.date, de: { nombre: de.name || '', correo: (de.address || '').toLowerCase() }, asunto: msg.envelope.subject, texto: p.text || '',
          adjuntos: (p.attachments || []).map(a => ({ nombre: a.filename || '', tipo: a.contentType, contenido: a.content })) });
      }
    } finally { lock.release(); }
  } finally { await c.logout().catch(() => {}); }
  return out;
}

// Lectura por el puente de Apps Script (acciones/puente_gmail.gs): sin contraseñas, corre en la cuenta de Google del dueño.
// Enlace del puente normalizado (sin espacios ni saltos de línea pegados por error) y validado sin revelar la clave.
function puenteURL() {
  const crudo = String(process.env.GMAIL_PUENTE_URL || ''), limpio = crudo.replace(/\s+/g, '');
  const diag = 'largo ' + limpio.length + ', ' + (/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(limpio) ? 'URL /exec correcta' : /\/dev(\?|$)/.test(limpio) ? 'termina en /dev (debe ser /exec)' : 'no parece una URL de aplicación web de Apps Script')
    + ', ' + (/[?&]k=[0-9a-f]{32,}/i.test(limpio) ? 'con clave' : /k=/.test(limpio) ? 'clave incompleta' : 'sin ?k=') + (crudo !== limpio ? ', tenía espacios o saltos de línea (corregido)' : '');
  let u; try { u = new URL(limpio); } catch (e) { throw new Error('GMAIL_PUENTE_URL no es una URL válida (' + diag + ')'); }
  if (/\/dev$/.test(u.pathname) || !/\/exec$/.test(u.pathname) || !/^[0-9a-f]{32,}$/i.test(u.searchParams.get('k') || '')) throw new Error('GMAIL_PUENTE_URL mal formado (' + diag + ')');
  return u;
}

// Lectura por el puente de Apps Script (acciones/puente_gmail.gs): sin contraseñas, corre en la cuenta de Google del dueño.
async function mensajesPuente(desde) {
  const u = puenteURL(); u.searchParams.set('desde', desde);
  const r = await fetch(u, { redirect: 'follow' }); if (!r.ok) throw new Error('Puente Gmail respondió ' + r.status);
  const j = await r.json(); if (j.error) throw new Error('Puente Gmail: ' + j.error);
  return (j.mensajes || []).map(m => Object.assign(m, { adjuntos: (m.adjuntos || []).map(a => ({ nombre: a.nombre, tipo: a.tipo, contenido: Buffer.from(a.b64 || '', 'base64') })) }));
}

async function ingestar() {
  const st = leerEstado(), novedades = [];
  let msgs;
  if (process.env.GMAIL_PRUEBA) msgs = JSON.parse(fs.readFileSync(process.env.GMAIL_PRUEBA, 'utf8')).map(m => Object.assign(m, { adjuntos: (m.adjuntos || []).map(a => Object.assign(a, { contenido: a.ruta ? fs.readFileSync(a.ruta) : Buffer.from(a.texto || '') })) }));
  else if (process.env.GMAIL_PUENTE_URL) msgs = await mensajesPuente(st.desde);
  else if (process.env.GMAIL_USUARIO && process.env.GMAIL_CLAVE_APP) msgs = await mensajesIMAP(st.desde);
  else return { omitido: 'falta el secreto GMAIL_PUENTE_URL (o GMAIL_USUARIO y GMAIL_CLAVE_APP)', novedades };
  const vistos = new Set(st.vistos);
  // Los borradores (los que prepara el agente o Edgar) no son correos enviados: no se registran ni se marcan como vistos.
  const esBorrador = m => m.borrador === true || /^\s*\[BORRADOR\b/i.test(m.texto || '') || /^\s*BORRADOR\s*-/i.test(m.asunto || '');
  msgs.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).forEach(m => { if (esBorrador(m) || vistos.has(m.id)) return; vistos.add(m.id); clasificar(m, st, novedades); });
  // La próxima lectura parte dos días antes de hoy (Gmail busca por día); los ya vistos se descartan por id.
  const hoy = fechaCL(Date.now()), d = new Date(hoy + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 2);
  st.desde = d.toISOString().slice(0, 10); st.vistos = [...vistos].slice(-3000); st.leido = new Date().toISOString();
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true }); fs.writeFileSync(ESTADO, JSON.stringify(st, null, 1) + '\n');
  return { mensajes: msgs.length, novedades };
}

module.exports = { puenteURL, ingestar, clasificar, vigenciaRT, limpiarAsunto };
if (require.main === module) ingestar().then(r => console.log(JSON.stringify(r, null, 1)), e => { console.error(e); process.exit(1); });
