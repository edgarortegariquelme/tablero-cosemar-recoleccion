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
if (fallas) { console.log(fallas + ' falla(s)'); process.exit(1); } else console.log('todas las pruebas del lector de Gmail pasan');
