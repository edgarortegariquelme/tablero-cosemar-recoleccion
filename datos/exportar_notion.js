/* Exporta el libro de control de Notion a docs/data/notion/*.json para la app (mismo formato que usa el tablero).
 * Requiere la variable NOTION_TOKEN (integración de Notion con acceso a la base «Cosemar · Libro de control»).
 * Uso: NOTION_TOKEN=... node datos/exportar_notion.js   (en GitHub Actions el token va como secreto del repositorio) */
const fs = require('fs'), path = require('path');
const TOKEN = process.env.NOTION_TOKEN, DB = process.env.NOTION_LIBRO_DB || '41a9e3e655c08141b986d51c9090c499';
if (!TOKEN) { console.log('Sin NOTION_TOKEN: se mantiene el libro que ya existe.'); process.exit(0); }
const G = { libro_san: ['Sanción', 'Hallazgo'], libro_pag: ['Pago', 'Reajuste'], libro_ven: ['Vencimiento'], libro_sis: ['Sistema', 'Control', 'Revisión', 'Error', 'Aviso'] };
const OUT = path.join(__dirname, '../docs/data/notion');
function texto(a) { return (a || []).map(t => t.plain_text).join(''); }
function plano(page) {
  const o = { url: page.url };
  Object.entries(page.properties).forEach(([k, v]) => {
    switch (v.type) {
      case 'title': o[k] = texto(v.title); break;
      case 'rich_text': o[k] = texto(v.rich_text); break;
      case 'select': o[k] = v.select ? v.select.name : ''; break;
      case 'status': o[k] = v.status ? v.status.name : ''; break;
      case 'multi_select': o[k] = v.multi_select.map(x => x.name).join(', '); break;
      case 'number': if (v.number != null) o[k] = v.number; break;
      case 'checkbox': o[k] = v.checkbox ? '__YES__' : '__NO__'; break;
      case 'url': o[k] = v.url || ''; break;
      case 'date': if (v.date) { o['date:' + k + ':start'] = v.date.start; if (v.date.end) o['date:' + k + ':end'] = v.date.end; } break;
      case 'created_time': o[k] = v.created_time; break;
      case 'last_edited_time': o[k] = v.last_edited_time; break;
      default: break;
    }
  });
  return o;
}
async function consultar(filtro) {
  let filas = [], cursor;
  do {
    const r = await fetch('https://api.notion.com/v1/databases/' + DB + '/query', { method: 'POST',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ page_size: 100, filter: filtro }, cursor ? { start_cursor: cursor } : {})) });
    const j = await r.json(); if (!r.ok) throw new Error('Notion ' + r.status + ': ' + (j.message || ''));
    filas = filas.concat(j.results.map(plano)); cursor = j.has_more ? j.next_cursor : null;
  } while (cursor);
  return filas;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [id, mods] of Object.entries(G)) {
    const filas = await consultar({ and: [{ property: 'Vigente', checkbox: { equals: true } }, { or: mods.map(m => ({ property: 'Módulo', select: { equals: m } })) }] });
    fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify({ results: filas, exportado: new Date().toISOString() }));
    console.log(id, filas.length);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
