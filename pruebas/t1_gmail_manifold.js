/* Regresión del lector de Gmail (acciones/gmail.js · clasificar): casos reales que fallaron.
   - Manifold pág. 24 (Providencia 10492): la ITS lo cerró el 24-11-2026 respondiendo en el mismo hilo
     («se otorga V°B° al cierre… Estado: Cerrado. Fecha de cierre: 24/11/2026»), y el manifold quedó «Abierto».
   - Borradores del agente: no deben registrarse como correos.
   Uso: node pruebas/t1_gmail_manifold.js  (sale con código 1 si algo falla) */
const assert = require('assert');
const { clasificar } = require('../acciones/gmail.js');
const st = { correos: {}, manifolds: {}, rt: {}, vistos: [] }, nov = [];
const ITS = { nombre: 'Hernán Gómez', correo: 'hgomez@maho.cl' }, COS = { nombre: 'Jesús Maria Chinchayan', correo: 'jchinchayan@grupoebi.cl' };
const hilo = '1a20941754a80338';
const msgs = [
  { id: 'a', hilo, fecha: '2026-11-23T16:33:21Z', de: ITS, asunto: 'Solicitud de respuesta Providencia 10492', adjuntos: [],
    texto: 'Estimada Jesús:\n\nJunto con saludar, y en atención a la Providencia N° 010492/2026 ... Se solicita remitir, dentro de un plazo máximo de 5 días hábiles ... una respuesta formal.\nQueda respaldo de solicitud en manifold pag 24\n\nAtte.\n\nHernán Gómez\nITS' },
  { id: 'b', hilo, fecha: '2026-11-24T18:57:51Z', de: COS, asunto: 'RE: Solicitud de respuesta Providencia 10492', adjuntos: [],
    texto: 'Hernan\n\nSe envía informe técnico en respuesta a la Providencia.\n\nSaludos\n\n-----Mensaje original-----\nDe: hgomez@maho.cl\nQueda respaldo de solicitud en manifold pag 24' },
  { id: 'c', hilo, fecha: '2026-11-24T19:31:06Z', de: ITS, asunto: 'Re: Solicitud de respuesta Providencia 10492', adjuntos: [],
    texto: 'Estimada Jesus, con fecha 24 de noviembre de 2026, se recepciona informe técnico por parte de COSEMAR SpA, en respuesta a lo solicitado mediante Providencia N° 010492/2026, registrada en libro Manifold, página 24.\n\nEn virtud de los antecedentes entregados y las medidas correctivas informadas, se otorga V°B° al cierre de la solicitud, sin perjuicio de mantener la fiscalización del cumplimiento operacional en el sector.\n\nEstado: Cerrado.\n\nFecha de cierre: 24/11/2026.\nEl 2026-11-24 15:57, Jesús Maria Chinchayan escribió:\n> Hernan' }
];
let fallas = 0; const caso = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fallas++; console.log('FALLA', n, '→', e.message); } };
msgs.slice(0, 1).forEach(m => clasificar(m, st, nov));
caso('el manifold 24 nace abierto', () => { assert.strictEqual(st.manifolds['2026-24'].estado, 'Abierto'); });
msgs.slice(1).forEach(m => clasificar(m, st, nov));
caso('el cierre de la ITS en el mismo hilo cierra el manifold 24', () => { assert.strictEqual(st.manifolds['2026-24'].estado, 'Cerrado'); assert.strictEqual(st.manifolds['2026-24'].cierre, '2026-11-24'); });
caso('no se crea un manifold duplicado', () => { assert.deepStrictEqual(Object.keys(st.manifolds), ['2026-24']); });
caso('el correo del hilo queda cerrado', () => { assert.strictEqual(st.correos[hilo].estado, 'Cerrado'); });
caso('hay una novedad de cierre', () => { assert.ok(nov.some(n => /cerrado el 24-11-2026/.test(n.texto))); });
// Cierre en un hilo nuevo que cita la página con coma («Manifold, página 24»)
const st2 = { correos: {}, manifolds: { '2026-24': { id: 'MF-2026-24', pagina: '24', motivo: 'x', estado: 'Abierto', respaldo: 'https://mail.google.com/mail/u/0/#all/otro' } }, rt: {}, vistos: [] };
clasificar(Object.assign({}, msgs[2], { hilo: 'nuevo', asunto: 'Cierre providencia' }), st2, []);
caso('cierre en otro hilo que cita «Manifold, página 24»', () => { assert.strictEqual(st2.manifolds['2026-24'].estado, 'Cerrado'); });
// Una solicitud de Cosemar no cierra nada aunque cite el manifold
const st3 = { correos: {}, manifolds: { '2026-24': { id: 'MF-2026-24', pagina: '24', motivo: 'x', estado: 'Abierto', respaldo: 'https://mail.google.com/mail/u/0/#all/' + hilo } }, rt: {}, vistos: [] };
clasificar(Object.assign({}, msgs[1], { texto: 'Solicitamos fecha de cierre: 30/11/2026 para el manifold pag 24' }), st3, []);
caso('un correo de Cosemar no cierra el manifold', () => { assert.strictEqual(st3.manifolds['2026-24'].estado, 'Abierto'); });
// TCXV-47 (27-11-2026): la ITS deja constancia «en el libro Manifold» sin página y fija «plazo máximo de 5 días».
const st4 = { correos: {}, manifolds: {}, rt: {}, vistos: [] }, h4 = '1a21d16679be1e12';
clasificar({ id: 't1', hilo: h4, fecha: '2026-11-27T12:58:53Z', de: ITS, asunto: 'Solicitud de investigación – Camión compactador PPU TCXV-47', adjuntos: [],
  texto: 'Estimada Jesús:\n\nSe solicita remitir a esta ITS el resultado de la investigación, junto\ncon los respectivos respaldos, en un plazo máximo de 5 días, sin\nperjuicio de adoptar medidas preventivas.\n\nSe deja constancia del presente requerimiento en el libro Manifold para\nsu respaldo y seguimiento.\n\nAtte.\n\nHernán Gómez\nITS' }, st4, []);
clasificar({ id: 't2', hilo: h4, fecha: '2026-11-27T15:23:18Z', de: COS, asunto: 'RE: Solicitud de investigación – Camión compactador PPU TCXV-47', adjuntos: [],
  texto: 'Hernan\n\nSe realizará la investigación de los hechos y se informará por esta vía.\n\n-----Mensaje original-----\nDe: hgomez@maho.cl\nSe deja constancia del presente requerimiento en el libro Manifold' }, st4, []);
const mf4 = Object.values(st4.manifolds);
caso('constancia en el libro Manifold sin página crea el manifold', () => { assert.strictEqual(mf4.length, 1); assert.strictEqual(mf4[0].estado, 'Abierto'); });
caso('toma el plazo de 5 días corridos (BA 7)', () => { assert.strictEqual(mf4[0].plazoDias, 5); assert.strictEqual(mf4[0].plazoUnidad, 'corridos'); });
// Providencia 12010 (manifold pág. 25): plazo en días hábiles; el seguimiento de la ITS no lo cierra ni lo duplica.
const st5 = { correos: {}, manifolds: {}, rt: {}, vistos: [] }, h5 = '1a20e4a7bb56813a';
clasificar({ id: 'p1', hilo: h5, fecha: '2026-11-24T16:01:27Z', de: ITS, asunto: 'Solicitud de investigación – Providencia N.º 12010 – Condominio Doña Olga', adjuntos: [],
  texto: 'Se solicita remitir una respuesta formal, con sus respectivos respaldos,\nen un plazo no superior a 5 días hábiles desde la recepción del presente\ncorreo, con la finalidad de dar respuesta a la providencia y gestionar\nel cierre del requerimiento.\nQueda respaldo en pag.25 manifold\n\nAtte.\nHernán Gómez' }, st5, []);
clasificar({ id: 'p2', hilo: h5, fecha: '2026-11-27T13:37:52Z', de: ITS, asunto: 'Re: Solicitud de investigación – Providencia N.º 12010', adjuntos: [],
  texto: 'Se mantiene el plazo originalmente otorgado, cuyo vencimiento\ncorresponde al 1 de diciembre de 2026.\nMientras no se cuente con dichos antecedentes, la observación\npermanecerá abierta.\nSe deja respaldo en Manifold para su control y seguimiento.' }, st5, []);
caso('manifold 25 con plazo de 5 días hábiles', () => { assert.strictEqual(st5.manifolds['2026-25'].plazoDias, 5); assert.strictEqual(st5.manifolds['2026-25'].plazoUnidad, 'hábiles'); });
caso('el seguimiento «permanecerá abierta» no cierra ni duplica', () => { assert.deepStrictEqual(Object.keys(st5.manifolds), ['2026-25']); assert.strictEqual(st5.manifolds['2026-25'].estado, 'Abierto'); });
if (fallas) { console.log(fallas + ' falla(s)'); process.exit(1); } else console.log('todas las pruebas del lector de Gmail pasan');
