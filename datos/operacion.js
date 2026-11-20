/* Datos operativos del tablero (corte 18-11-2026): manifolds, correos del personal del contrato, flota, personal, bono SUBDERE,
 * antecedentes por contrato y fechas del ciclo mensual que no están en el libro de control.
 * Fuentes: Drive (libro manifold escaneado, carpetas de procesos, «Control vencimientos COSEMAR», «FLOTA ACTUAL 2026», cotejo SUBDERE),
 * Gmail (hilos con Cosemar / Grupo EBI e ITS) y EDP de Cosemar del 14-10-2026. Uso: node datos/operacion.js
 * Personal: solo cifras agregadas por cargo; el tablero no publica nombres ni RUT. */
const fs = require('fs'), path = require('path'), M = require('../motor/motor.js');
const OUT = path.join(__dirname, '../tablero/store'), D = 'https://drive.google.com/file/d/', G = 'https://mail.google.com/mail/u/0/#all/';
const hab = (f, n) => M.sumarHabiles(f, n), cor = (f, n) => M.sumarDias(f, n);
const RES = []; // resúmenes de una fila por tema (tablero/store/resumenes.json)
function w(nombre, rows, extra) { fs.writeFileSync(path.join(OUT, nombre), JSON.stringify({ corte: '2026-11-20', rows }, null, 1)); console.log(nombre, rows.length);
  if (extra) RES.push(Object.assign({ clave: nombre.replace('.json', '') }, extra)); }

// ---------- Manifolds (recolección; los anteriores a jul-2024 son del contratista anterior y se excluyen) ----------
const MF = [
  ['MF-2026-28', '2026-06-05', '28', 'Pide informar el estado de la resolución sanitaria de las instalaciones de Cosemar', 'Requerimiento', 5, 'hábiles', 'Abierto', null, 'No consta respuesta. Las visitas técnicas del 30-09 y 06-11 siguen con observaciones a las instalaciones.', 'REQ07', D + '1O6-c-ris6npxcUe7fRiRz6F1OO7imFxb/view'],
  ['MF-2026-26', '2026-05-19', '26', 'Informa el D.A. 2.463/2026, que aplica multa de 60 UTM del proceso 5', 'Notificación de multa', 5, 'hábiles', 'Cerrado', '2026-06-17', 'Cosemar repuso el 26-05; el D.A. 3.649 mantuvo firme la multa y se descontó en el pago de junio.', 'PS05', D + '1yE3EMPlH3vVSxkEqJ9L0QHBdAp5gdO8O/view'],
  ['MF-2026-04b', '2026-04-14', '4', 'Equipo no registrado como apoyo, GPS sin verificar y sin rotulación (móvil 1473)', 'Inicio de proceso', 5, 'hábiles', 'Abierto', null, 'Descargos del 20-04 evaluados el 22-04; falta el cierre o el memo para decretar.', 'PS06', D + '1tohZD6GZ6Qrn8gNdRIqjZrik8ba9ioTH/view'],
  ['MF-2026-04', '2026-04-06', '4', 'Inicia el proceso sancionatorio 5 por modificar el plan de trabajo (inicio del domingo 5 de abril)', 'Inicio de proceso', 5, 'hábiles', 'Cerrado', '2026-06-17', 'Terminó en multa de 60 UTM (D.A. 2.463, firme por D.A. 3.649).', 'PS05', D + '1AzUzxyT5R9U35Ff7znuoqBwhiZfrhu5Y/view'],
  ['MF-2026-01', '2026-02-26', '1', 'Fija el plazo de descargos del proceso 1 (plan de escombros y voluminosos): vence el jueves 5 de marzo', 'Plazo de descargos', null, null, 'Cerrado', '2026-06-02', 'Proceso dejado sin efecto (correo de cierre del 02-06-2026).', 'PS01', D + '1j6ppQLUdp4dK8WkhawnWR0Zvp6U2pZDo/view', '2026-03-05'],
  ['MF-2026-47', '2026-02-25', '47', 'Notifica el inicio del proceso 1 por puntos con escombros de más de 3 días', 'Inicio de proceso', 5, 'hábiles', 'Cerrado', '2026-06-02', 'Sin efecto el 02-06-2026.', 'PS01', D + '1O9q0sQ3YTdEQ0kqRHVcb5GIW9RkHJKN7/view'],
  ['MF-2026-22', '2026-11-18', '22', 'Cierra el proceso sancionatorio 2: gráfica de camiones al 100%', 'Cierre de proceso', null, null, 'Cerrado', '2026-11-18', 'Proceso 2 cerrado sin multa por cumplimiento total de la gráfica.', 'PS02', null, null],
  ['MF-2026-20', '2026-11-17', '20', 'Remite informe de incumplimiento por observaciones de la visita técnica a instalaciones (30-09)', 'Inicio de proceso', 1, 'hábiles', 'Cerrado', '2026-11-19', 'Cosemar presentó descargos el 18-11; la ITS los acogió el 19-11 «en esta oportunidad».', 'PS07', null, null],
  ['MF-2026-46', '2026-02-25', '46', 'Pide propuestas de gráfica de camiones (logo municipal, Cosemar, servicio, numeración)', 'Requerimiento', null, null, 'Cerrado', '2026-11-18', 'Plazo tope 06-02-2026 según el manifold. Gráfica al 100%: proceso 2 cerrado el 18-11-2026 (manifold 22).', 'PS02', D + '1vaE67C_kc_MEHaW714smqZvLJbW2_6mq/view', '2026-02-06'],
  ['MF-2026-45', '2026-02-25', '45', 'Pide un plan para retirar escombros y voluminosos día y noche (puntos con más de 3 días)', 'Requerimiento', 5, 'hábiles', 'Cerrado', '2026-06-02', 'Derivó en el proceso 1, dejado sin efecto.', 'PS01', D + '1AafkQ0SS9km6Wqw0kNhbiDZOWisbDdFr/view'],
  ['MF-2026-43', '2026-02-17', '43', 'Inicia el proceso por lavado deficiente de los camiones', 'Inicio de proceso', 5, 'hábiles', 'Cerrado', '2026-06-03', 'Informe de cierre del 03-06-2026: sin efecto.', 'PS04', D + '1hDvGTXWBo0m-SolxoHbjcV5otqpRz8jt/view'],
  ['MF-2026-41', '2026-02-16', '41', 'Inicia el proceso por circular con revisión técnica rechazada (móvil 980)', 'Inicio de proceso', 5, 'hábiles', 'Cerrado', '2026-08-13', 'Multa de 5 UTM (D.A. 3.307), notificada el 13-08-2026.', 'PS03', D + '1hDvGTXWBo0m-SolxoHbjcV5otqpRz8jt/view'],
  ['MF-2026-38', '2026-02-11', '38', 'Móvil 980 (TPPW41) con revisión técnica vencida desde el 02-02 y rechazada', 'Constancia', null, null, 'Cerrado', '2026-08-13', 'Dio origen al proceso 3.', 'PS03', D + '1D49VFpv13puPDVzArf1eVS4gMiuFcE4f/view'],
  ['MF-2026-37', '2026-02-05', '37', 'Respaldo de la solicitud de mejorar el retiro de escombros y voluminosos en avenidas', 'Constancia', null, null, 'Cerrado', '2026-06-02', 'Antecedente del proceso 1.', 'PS01', D + '1RcoKMtE7tAHDnkXahsqVRrMZ44z2VuqU/view'],
  ['MF-2026-36', '2026-01-16', '36', 'Pide antecedentes del plan de trabajo (difusión, denuncias, lavado, reemplazos, facturas de herramientas) con plazo al 22-01', 'Requerimiento', null, null, 'Cerrado', '2026-01-22', 'Cosemar anotó la entrega en el mismo libro.', null, D + '1hDvGTXWBo0m-SolxoHbjcV5otqpRz8jt/view', '2026-01-22'],
  ['MF-2024-CONST', '2024-11-04', '—', 'Reclamo de la junta de vecinos Nueva Vida: camión no entra a pasajes y quedan puntos sin retiro', 'Constancia', null, null, 'Cerrado', '2024-11-04', 'Cosemar respondió el mismo día (retiro a pie y registro fotográfico).', null, D + '1eUHO5pQwjMzbGK8hcxrMB4xfPn4eSb3j/view'],
  ['MF-2024-36', '2024-10-02', '36', 'Móvil 979 detenido por rotura de abrazaderas; pide estado y reintegro', 'Requerimiento', null, null, 'Cerrado', '2024-10-03', 'Cosemar informó tolva de reemplazo.', null, D + '1wcRkSQkyWNQ4fpt2US3EFAqToF08xq3y/view'],
  ['MF-2024-14', '2024-08-06', '14', 'Instruye un camión de contingencia los fines de semana en El Boro y Santa Rosa (17-08 a 27-10-2024)', 'Instrucción', 5, 'corridos', 'Cerrado', '2024-10-27', 'Servicio especial por tres meses.', null, D + '1usI50b_6g9YiKE14PXX-aflmPTQc-a08/view'],
  ['MF-2024-13', '2024-08-05', '13', 'Pide actualizar el estado de la flota ofertada al terminar la marcha blanca', 'Requerimiento', 5, 'corridos', 'Cerrado', '2024-09-16', 'Respondido el 05-08; subsanado el 16-09-2024.', null, D + '1yBUZX3X05ONRK5lBhp4g4pg3hYHMBj3P/view'],
  ['MF-2024-11', '2024-07-31', '11', 'Incorpora el conjunto habitacional Devotos San Lorenzo II a la recolección', 'Instrucción', null, null, 'Cerrado', '2024-07-31', '', null, D + '1kZozm51ivt42LQgz0qhliWlhMNxdrWaa/view'],
  ['MF-2024-06', '2024-07-18', '6', 'Adjunta el oficio 10 del primer proceso sancionatorio', 'Notificación', null, null, 'Cerrado', '2024-07-25', 'Cosemar respondió el 25-07-2024.', null, D + '15Wk2Lmfbr7mljv6iQFn6oP45P5iz1Yj4/view'],
  ['MF-2024-05', '2024-07-17', '5', 'Pide a Cosemar los planes de trabajo', 'Requerimiento', null, null, 'Cerrado', '2024-10-02', 'Cosemar adjuntó los planes el 02-10-2024.', null, D + '1t3T4Tu8G4EPk1B1Hl2N-QaIvkQKtlO5h/view']
];
w('manifolds.json', MF.map(r => {
  const [id, fecha, pagina, motivo, tipo, dias, unidad, estado, cierre, nota, caso, respaldo, venceFijo] = r;
  const vence = venceFijo || (dias ? (unidad === 'hábiles' ? hab(fecha, dias) : cor(fecha, dias)) : null);
  return { id, fecha, pagina, motivo, tipo, plazoDias: dias, plazoUnidad: unidad, vence, estado, cierre, nota, caso, respaldo };
}));

// ---------- Correos con el personal del contrato (último mensaje de cada hilo; desde ago-2026) ----------
const C = [
  ['2026-11-19', 'Hernán Gómez (ITS)', 'DMAO', 'Descargos acogidos: informe de incumplimiento por instalaciones (visita 30-09)', 'Recolección', 'Media', 'Cerrado', 'Informe 17-11, descargos 18-11, acogidos 19-11 «en esta oportunidad»: vigilar que se corrijan las observaciones.', '1a1e9e4c9e56016c'],
  ['2026-11-19', 'Teresa Donoso', 'Cosemar', 'Revisión técnica del M-922 actualizada', 'Recolección', 'Baja', 'Cerrado', 'Vigente hasta el 19-05-2027; cargada en Flota.', '1a1f3dfaa55b7bdd'],
  ['2026-11-18', 'Jesús Chinchayán', 'Cosemar', 'Proceso sancionatorio 2 (gráfica de camiones): cierre', 'Recolección', 'Baja', 'Cerrado', 'La ITS informó gráfica al 100% y cierre sin multa (manifold 22).', '19e8e06e3b03ec21'],
  ['2026-11-18', 'Jesús Chinchayán', 'Cosemar', 'Informe de sobreproductores (comercio, instituciones, condominios)', 'Recolección', 'Baja', 'Cerrado', 'Hernán acusó recibo el 18-11; insumo para el trabajo con otras direcciones.', '19fa9a13f0792f57'],
  ['2026-11-18', 'Jesús Chinchayán', 'Cosemar', 'Siniestro del móvil 980 (colisión del 10-11)', 'Recolección', 'Baja', 'Cerrado', 'Hernán recibió el 18-11 el registro de charlas y la denuncia; caso cerrado.', '1a1d01a0ff40f93c'],
  ['2026-11-16', 'Teresa Donoso', 'Cosemar', 'Revisión técnica del M-921 actualizada', 'Recolección', 'Media', 'Actualizar', 'La revisión vencía el 16-11: cargar la nueva fecha en la planilla de vencimientos.', '1a1e44a6ba4759da'],
  ['2026-11-16', 'Grupo EBI (A. Concha)', 'Cosemar', 'Reunión por la API del GPS de la flota', 'Recolección', 'Baja', 'En curso', 'Coordinación técnica de la integración GPS.', '1a1e489965953f02'],
  ['2026-11-13', 'Rodrigo Barril', 'Cosemar', 'Pide la OC de octubre de disposición final', 'Disposición final', 'Alta', 'Responder', 'Memo de OC del 05-11: los 7 días para generar la OC vencieron el 12-11. Preguntar a DAF.', '1a1d56b3b111e8f6'],
  ['2026-11-12', 'Jesús Chinchayán', 'Cosemar', 'Respuesta a la visita técnica de instalaciones (septiembre)', 'Recolección', 'Media', 'Revisar', 'Cosemar envió su informe de respuesta a las observaciones del 06-11.', '1a136e1f8e1a010f'],
  ['2026-11-10', 'Hernán Gómez', 'ITS', 'Siniestro del móvil 938', 'Recolección', 'Baja', 'Cerrado', 'La ITS dio por bueno el informe.', '1a1b050d044449e3'],
  ['2026-11-09', 'Jesús Chinchayán', 'Cosemar', 'Estado de operatividad de los equipos al 09-11', 'Recolección', 'Media', 'Revisar', 'Dos camiones en taller (939 y 973).', '1a1c29df4f6d7d7c'],
  ['2026-11-09', 'Jesús Chinchayán', 'Cosemar', 'Rendición y cierre del bono SUBDERE 2026', 'Recolección', 'Alta', 'Esperando a Cosemar', 'Cosemar pedirá la rendición y la remitirá; falta la rendición oficial y el original de octubre.', '1a1c29bbb937e6e1'],
  ['2026-11-09', 'Edgar Ortega', 'DMAO', 'Detalle de ingresos diarios pendientes de octubre (relleno)', 'Disposición final', 'Baja', 'Cerrado', 'Rodrigo aclaró los ingresos.', '1a1be39ecfdf7b2e'],
  ['2026-11-05', 'Edgar Ortega', 'DMAO', 'Informe de servicios de octubre 2026', 'Recolección', 'Baja', 'Cerrado', 'Base del memo 2211/2026 que pide la OC de octubre.', '1a1a68fabd3ab51b'],
  ['2026-11-03', 'Alejandra Marzán', 'Cosemar', 'Reajuste IPC 2026: pide el visto bueno pendiente', 'Recolección', 'Alta', 'Esperando a Administración', 'Edgar respondió que no hay fondos este año; el Administrador Municipal debe confirmarlo. Endoso de garantía por 419,57 UF entregado el 29-10.', '1a179d5a50671f7b'],
  ['2026-11-03', 'Edgar Ortega', 'DMAO', 'Validación de cumplimiento de octubre 2026', 'Recolección', 'Baja', 'Cerrado', 'Acuso de recibo.', '1a19e3f916ae4a71'],
  ['2026-10-27', 'Jesús Chinchayán', 'Cosemar', 'Detalle de móviles actualizado', 'Recolección', 'Baja', 'Cerrado', '', '1a17dd64b7ab55da'],
  ['2026-10-21', 'Edgar Ortega', 'DMAO', 'Firma del anexo de contrato (reajuste)', 'Recolección', 'Alta', 'En Jurídico', 'Alejandra Marzán advirtió el 19-10 que el anexo no corresponde al reajuste desde julio de 2026. Edgar gestiona con Jurídico.', '1a15e57e48a39228'],
  ['2026-10-20', 'Jesús Chinchayán', 'Cosemar', 'Operativo de rucos 2026', 'Recolección', 'Media', 'Responder', 'Cosemar espera que la DMAO indique los lugares.', '1a146236dd9fba62'],
  ['2026-10-20', 'Teresa Donoso', 'Cosemar', 'Licencia de conducir pendiente (chofer)', 'Recolección', 'Baja', 'Cerrado', '', '1a15a622ffe26575'],
  ['2026-10-16', 'Edgar Ortega', 'DMAO', 'Informe comparativo de sueldos base', 'Recolección', 'Media', 'Revisar', 'Edgar quedó de revisarlo: reajuste de 2,8% entre enero y julio de 2026.', '1a13c43cc48e7b29'],
  ['2026-10-14', 'Teresa Donoso', 'Cosemar', 'Informe de estado de pago de septiembre', 'Recolección', 'Media', 'Revisar', 'La carta interior dice «agosto de 2026»: pedir que corrijan el mes.', '1a13bf9c3c672a53'],
  ['2026-10-13', 'Jesús Chinchayán', 'Cosemar', 'Pide respuesta al informe de variación de combustible (16-09)', 'Recolección', 'Alta', 'Responder', 'Más de dos meses sin respuesta municipal.', '1a1357856a344bcb'],
  ['2026-10-02', 'René Gutiérrez', 'Cosemar', 'Cálculo del reajuste IPC julio 2025 a julio 2026', 'Recolección', 'Media', 'Esperando a Administración', 'Cosemar ofrece apoyo para resolver; ligado al anexo suspendido.', '19f48866369d9d37'],
  ['2026-09-23', 'Jesús Chinchayán', 'Cosemar', 'Siniestro del móvil 972 (calle Canadá)', 'Recolección', 'Baja', 'Cerrado', 'La aseguradora está en contacto con el afectado.', '1a0a60e645265c08'],
  ['2026-09-22', 'Edgar Ortega', 'DMAO', 'Actualización de identidad corporativa', 'Recolección', 'Baja', 'Cerrado', 'Visto bueno conforme a bases.', '1a0a50d04ec7e152'],
  ['2026-09-02', 'Edgar Ortega', 'DMAO', 'Puesto de trabajo para funcionario municipal en la garita de báscula', 'Disposición final', 'Media', 'Esperando a Cosemar', 'Edgar insiste en que las bases lo exigen.', '1a0624dac31e0201'],
  ['2026-08-21', 'Jesús Chinchayán', 'Cosemar', 'Solicitud de suspensión del servicio', 'Recolección', 'Baja', 'Cerrado', '', '1a017222df8ab0c7'],
  ['2026-08-13', 'Jesús Chinchayán', 'Cosemar', 'Resolución del proceso de multa por papeles vencidos del móvil 980', 'Recolección', 'Baja', 'Cerrado', 'Recibido por Cosemar.', '19ffba3362b4a3ed']
];
w('correos.json', C.map((r, i) => ({ id: 'C' + String(i + 1).padStart(2, '0'), fecha: r[0], contacto: r[1], empresa: r[2], tema: r[3], contrato: r[4], urgencia: r[5], estado: r[6], nota: r[7], enlace: G + r[8] })),
  { contactos: ['Hernán Gómez (ITS)', 'Jesús Chinchayán (jefatura de proyecto Cosemar)', 'Edgar Ortega (encargado del contrato)', 'Teresa Donoso (administrativa Cosemar)', 'René Gutiérrez (Cosemar)', 'Alejandra Marzán (Cosemar)', 'Rodrigo Barril (relleno sanitario)'] });

// ---------- Flota (DETALLE DE MÓVILES 09-11-2026 + Control vencimientos COSEMAR 05-11-2026 + FLOTA ACTUAL 2026) ----------
const FOTO = D + '10HobGdquVTe-47SqMluy_nO2MFBa4kRo/view';
const FOTOS = { '921': '1Nlfu30Xk1wJUjboPCpXizF8cJFvJCLit', '922': '13Ndz0O0tNlzJZe_HOo3-EIXHaDZBhjX4', '938': '1vYTkANa-4V8Y4wHgmeCaLmZG2AYWsnEl', '939': '1uciHPystIjOzFxrIcn9v-pFtwjgsbLFD',
  '940': '10jYcYIx-rLimK0_6wNwqJ0Ll1vNHIP0Y', '970': '1HURoAvNblbAuSl1zo9cuhwlOAkxiVKqC', '971': '1t3EOQgiuPTiUOTFyuleEGSqBf82WWKsl', '972': '1w0MzaJkGyi0ZpRD3Z-sqOyzYqQ1AriGR',
  '973': '1NcVtn-puGWn6vA15-uS963v4O34wuuvt', '974': '1rXJofABOfqYe86bkHc8VBiMY1pwBGgJp', '975': '1elJ2fluBZc1ZvX-4boilzOqhM88NHjeZ', '976': '1xFGVxMU_Jgd15KQXZTI1FAGvncg-OgyX',
  '977': '1-XcMS3ltnhYjaZyEtQSPDRMpQLgLKIqJ', '978': '1TElCNlVlvR3IGlCchNIcPk74dfhcDgSl', '979': '1qd9_zR10OqVzNS2rlghCCSFt6OGH_1fv', '980': '1IldVUd3n-F_t004yf8P91nNrIg4zNFi9',
  '984': '11n5nepvOT-_dbqYt-K6F-06nduWw04QL', '985': '1UmCCUHMyG_0es6Ze1B-HjGLavpnIlJyp' }; // carpeta Drive 10lZuRbhinsJcuIQVneD2kLnwh861lBwG
const FL = [ // movil, patente, tipo, marca/modelo, estado 09-11, RT vence (planilla), RT según «FLOTA ACTUAL» si difiere
  ['921', 'SZZJ80-4', 'Recolector', 'VW Constellation 17.280', 'Operativo en ruta', '2027-05-14', null, 'Revisión técnica renovada el 14-11-2026 (certificado A0110000000079161, enviado por Teresa Donoso el 16-11).'],
  ['922', 'SZZJ82-0', 'Recolector', 'VW Constellation 17.280', 'Operativo en ruta', '2027-05-19', null, 'Renovada el 19-11-2026 (certificado A0110000000079335).'],
  ['938', 'TCXV47-0', 'Recolector', 'VW Constellation 17.280', 'Operativo en ruta', '2026-12-18', null, 'Siniestro informado en noviembre (cerrado por la ITS).'],
  ['939', 'TCXV48-9', 'Recolector', 'VW Constellation 17.280', 'En taller', '2026-12-24', null, 'Taller en Iquique: fuga hidráulica del cilindro expulsor.'],
  ['940', 'TCRY91-K', 'Ampliroll', 'VW Constellation 17.280', 'Operativo en base', '2026-12-05', null, ''],
  ['970', 'TPPW40-2', 'Tolva', 'VW Constellation 17.280', 'Operativo en base', '2027-01-02', null, ''],
  ['971', 'TPPW38-0', 'Tolva', 'VW Constellation 17.280', 'Operativo en base', '2027-01-07', null, 'Certificado de revisión técnica confirma el 07-01-2027 (la ficha de flota tenía día y mes invertidos).'],
  ['972', 'TPPW36-4', 'Recolector', 'VW Constellation 17.280', 'Operativo en ruta', '2027-01-17', null, 'Siniestro de septiembre (calle Canadá).'],
  ['973', 'TPPW34-8', 'Recolector', 'VW Constellation 17.280', 'En taller', '2027-01-23', null, 'Taller externo: reparación del cuchillo y la compactadora.'],
  ['974', 'TPPW33-K', 'Recolector', 'VW Constellation 17.280', 'Operativo en ruta', '2027-01-14', null, ''],
  ['975', 'TPPW31-3', 'Recolector satélite', 'VW Delivery', 'Operativo en ruta', '2027-01-24', null, ''],
  ['976', 'TPPW32-1', 'Recolector satélite', 'VW Delivery', 'Operativo en base', '2027-01-18', null, ''],
  ['977', 'TPPW39-9', 'Recolector', 'VW Constellation 17.280', 'Operativo en ruta', '2027-01-21', null, 'Certificado de revisión técnica confirma el 21-01-2027.'],
  ['978', 'TPPW42-9', 'Tolva', 'VW Constellation 17.280', 'Operativo en base', '2027-01-11', null, ''],
  ['979', 'TPRD80-3', 'Tolva', 'VW Constellation 17.280', 'Operativo en base', '2027-01-13', null, ''],
  ['980', 'TPPW41-0', 'Recolector', 'VW Constellation 17.280', 'Operativo en ruta', '2027-01-31', null, 'Colisión del 10-11-2026; multa de 5 UTM por revisión vencida en febrero. Revisión técnica vigente hasta el 31-01-2027 (certificado A0110000000075103 del 31-07-2026, enviado por Teresa Donoso).'],
  ['984', 'TPRF92-3', 'Minicargador', 'Bobcat S510', 'Operativo en base', '2030-07-22', null, ''],
  ['985', 'PWWC14-3', 'Carro de arrastre', 'Invicta T6000', 'Operativo en base', '2027-01-14', null, '']
];
w('flota.json', FL.map(r => ({ movil: r[0], patente: r[1], tipo: r[2], modelo: r[3], estado: r[4], estadoFecha: '2026-11-09', rt: r[5], rtOtraFuente: r[6], permiso: '2027-09-30', soap: '2027-09-30', aseguradora: 'Seguros Sura', nota: r[7], foto: FOTOS[r[0]] ? D + FOTOS[r[0]] + '/view' : FOTO, fotoId: FOTOS[r[0]] || null, imagen: FOTOS[r[0]] ? 'fotos/rt-' + r[0] + '.jpg' : null })),
  { contrato: [{ documento: 'Seguro de responsabilidad civil, póliza 226102080 (Continental, UF 2.000)', vence: '2027-07-31' }, { documento: 'Garantía de fiel cumplimiento, póliza 224103598 (20.379,57 UF; endoso por 419,57 UF el 29-10-2026)', vence: '2029-10-28' }],
    otros: 'El EDP también lista tres camionetas de apoyo (904, 986, 987) sin documentos en la planilla.', fuentes: { vencimientos: 'https://docs.google.com/spreadsheets/d/1tHM807N-TxxC-WTic12y5tgCJoNP0KEcBCvgX-dgE5w/edit', estado: G + '1a1c29df4f6d7d7c', ficha: D + '1hxwOOry6aPjS6QpeY4ETbQ43ThyvbVEw/view', fotos: FOTO } });

// ---------- Personal (agregado; EDP de Cosemar del 14-10-2026 e informe comparativo de sueldos del 14-10-2026) ----------
w('personal.json', [
  { cargo: 'Peoneta', dotacion: 47, oferta: 44, sueldoMin: 585932, sueldoMax: 618739 },
  { cargo: 'Chofer', dotacion: 17, oferta: 16, sueldoMin: 828384, sueldoMax: 883629 },
  { cargo: 'Supervisor', dotacion: 2, oferta: null, sueldoMin: 968429, sueldoMax: 988765 },
  { cargo: 'Operario de mantención', dotacion: 2, oferta: null, sueldoMin: 554092, sueldoMax: 554092, nota: 'El informe de sueldos registra uno; el EDP lista dos.' },
  { cargo: 'Jefatura y administración', dotacion: 5, oferta: null, sueldoMin: 793381, sueldoMax: 1495829, nota: 'Jefatura de proyecto, encargado de base, administrativa, prevencionista y encargado ambiental.' }
], { total: 74, periodoEdp: 'Agosto de 2026 según la carta del EDP (el correo dice septiembre)', contratados: 4, desvinculados: 2, enFeriado: 46,
  ultimoPagoSueldos: '2026-08-11', ultimoPagoPeriodo: '2026-07', ultimoPagoTxt: 'Cotizaciones previsionales de julio de 2026 pagadas por PREVIRED el 11-08-2026, con libro de remuneraciones de julio.', reajusteJul2026: 0.028, sueldoAl: 'julio de 2026', reajusteBases: 'BA 153: reajuste de sueldos base cada 6 meses (enero y julio) por IPC acumulado.',
  pendientes: ['Comprobantes de cotizaciones y libros de remuneraciones de agosto, septiembre y octubre de 2026: no están en Drive.', 'F30-1 actualizado: el último es del 17-02-2026 (F30 del 10-06-2026).',
    'Anexos de contrato del reajuste de julio de 2026: el informe comparativo muestra el alza, pero no se adjuntaron los anexos firmados.', 'Feriado legal: el EDP lista 46 personas sin aclarar si lo usaron en el mes. Días administrativos no aplican a trabajadores privados.'],
  fuentes: { edp: G + '1a13bf9c3c672a53', sueldos: G + '1a13c43cc48e7b29' } });


// ---------- Imposiciones y remuneraciones (Drive · pagos mensuales del contrato) ----------
const IM = [ // periodo, comprobante cotizaciones, libro remuneraciones, fecha de pago PREVIRED (si se leyó)
  ['2026-01', '19BPilZ2TxxD80SrW14dI34ZXmvm0RR9V', '1LO00uW-EFyOYcRsUWmc8jMW79u1zD3vz', null], ['2026-02', '1B7haL3OpOSwS9JZF0EbbV8gBlu2EKX8i', '1_cC_5lgCBGYstXmias49-cWR_dAVdsNB', null],
  ['2026-03', '1SUTWSISrZiF-XiyJQjs7U_EsM1IOjFoJ', '1HKD3HOvVeTgyB4bGkrjRZzPabOWO-_TP', null], ['2026-04', '1lNTA_NSpYclHIGY35AbdejhgJUFfIrhS', '1kVcrQS8M7Pg0Lyu6NStuvEjj6q5xgx8w', null],
  ['2026-05', '1IW_WTj98LKLIfN5AmGX9Y_tEnLKZY-qj', null, null], ['2026-06', '1KmANzF4imJplOc9sprBtaI14beiHb3P0', '1JeoclRI1hJ03-A8LaqO6NP4CRWC1Nrd1', null],
  ['2026-07', '12dxs3xMNmxjQ9ToE5RLXBWxqk43ZWmyH', '1sO9_Dg6icLSJ33vQlg-FDMshSa4pFKtU', '2026-08-11'], ['2026-08', null, null, null], ['2026-09', null, null, null], ['2026-10', null, null, null]
];
w('imposiciones.json', IM.map(r => ({ periodo: r[0], cotizaciones: r[1] ? D + r[1] + '/view' : null, libro: r[2] ? D + r[2] + '/view' : null, fechaPago: r[3],
  estado: r[1] && r[2] ? 'Acreditado' : r[1] ? 'Falta libro de remuneraciones' : 'Sin respaldo en Drive' })),
  { f30: [{ fecha: '2026-02-17', doc: 'F30-1 · certificado de cumplimiento laboral', enlace: D + '1ruhCHJ-FbRLFvBLwofJk5FT_007TH3Rd/view' }, { fecha: '2026-03-09', doc: 'F30', enlace: D + '1q1zbq5fek52IHzrqs5G6kKjnBZBmYzJ7/view' },
    { fecha: '2026-05-25', doc: 'F30', enlace: D + '13g8Jz0Zc8LvjhTpVPTazmb4q6eAphxbi/view' }, { fecha: '2026-06-10', doc: 'F30', enlace: D + '1UJe-ynMUcyPaxPwdLFLJohFIR3dMHl1K/view' }] });

// ---------- Bono SUBDERE 2026 (cotejo del 09-11-2026) ----------
w('subdere.json', [
  { concepto: 'Contratados: pago anual', trabajadores: 51, nominal: 57171051, respaldado: 57171051, fecha: '2026-05-18', estado: 'Firmado' },
  { concepto: 'Plazo fijo: ingreso a abril', trabajadores: 12, nominal: 3568555, respaldado: 3568555, fecha: '2026-05-16', estado: 'Firmado' },
  { concepto: 'Plazo fijo: mayo', trabajadores: 12, nominal: 1330262, respaldado: 1330262, fecha: '2026-06-02', estado: 'Firmado' },
  { concepto: 'Plazo fijo: junio', trabajadores: 12, nominal: 1345200, respaldado: 1345200, fecha: '2026-07-01', estado: 'Firmado; remitido a Control el 30-09' },
  { concepto: 'Plazo fijo: julio', trabajadores: 12, nominal: 1345200, respaldado: 1345200, fecha: '2026-08-01', estado: 'Firmado; remitido a Control el 30-09' },
  { concepto: 'Plazo fijo: agosto', trabajadores: 12, nominal: 1345200, respaldado: 1345200, fecha: '2026-09-01', estado: 'Firmado; remitido a Control el 30-09' },
  { concepto: 'Plazo fijo: septiembre', trabajadores: 12, nominal: 1345200, respaldado: 1345200, fecha: '2026-10-01', estado: 'Firmado; sin aprobación localizada' },
  { concepto: 'Plazo fijo: octubre', trabajadores: 12, nominal: 1345212, respaldado: 1345212, fecha: '2026-11-01', estado: 'Copia firmada; falta el original' },
  { concepto: 'Finiquitados: proporcional', trabajadores: 8, nominal: 1670309, respaldado: 1206951, fecha: '2026-06-01', estado: 'Solo 4 de 8 firmados' }
], { asignacion: 73986066, resolucion: 'Resolución SUBDERE 22/2026 (09-03-2026), 66 beneficiarios', ingreso: '2026-04-24', rendidoAprobado: 60739606, memoControl: 'Memo Control 1332/2026 (30-10-2026), aprobado con observaciones',
  saldoPorRendir: 13246460, pendientes: ['Rendición oficial consolidada de Cosemar', 'Original del recibo de octubre', 'Respaldo de 4 finiquitados por $463.358', 'Conciliación de fondos y devolución del sobrante, si corresponde'],
  fuente: D + '1__P0Qfz6DuyiTLO2SaaoTngifd2KxSyT/view' });

// ---------- Antecedentes, comentarios y hechos por subsanar ----------
const A = [
  ['rec', '2026-11-18', 'Hecho por subsanar', 'Los pagos de diciembre de 2025 a septiembre de 2026 constan solo por tu confirmación: pedir a DAF los comprobantes de egreso.', 'Abierto'],
  ['rec', '2026-11-13', 'Antecedente', 'DAF no emite certificado presupuestario (saldo negativo): el anexo del reajuste IPC 4,3% queda suspendido.', 'Abierto'],
  ['rec', '2026-11-05', 'Antecedente', 'Memo 2211/2026 pide la OC de octubre al valor del D.A. 2.459. Sin presupuesto para octubre a diciembre: se pagan en 2027 según el plan de pago.', 'Abierto'],
  ['rec', '2026-07-01', 'Hecho por subsanar', 'Desde julio rige el D.A. 3.957 (aumento poblacional), pero las OC y facturas siguen al valor del D.A. 2.459.', 'Abierto'],
  ['rec', '2026-06-05', 'Hecho por subsanar', 'Resolución sanitaria de las instalaciones (manifold 28): no consta respuesta de Cosemar.', 'Abierto'],
  ['rec', '2026-09-16', 'Comentario', 'Cosemar espera respuesta al informe de variación de combustible desde el 16-09.', 'Abierto'],
  ['rec', '2026-01-01', 'Hecho por subsanar', 'La revisión de sanciones antes del memo de pago no consta en ningún mes.', 'Abierto'],
  ['rec', '2026-10-29', 'Antecedente', 'Endoso de la garantía por 419,57 UF entregado; la póliza vence el 28-10-2029.', 'Cerrado'],
  ['df', '2026-11-13', 'Antecedente', 'Cosemar pide la OC de octubre; el memo 2214/2026 la pidió el 05-11 y el plazo de 7 días ya venció.', 'Abierto'],
  ['df', '2026-11-13', 'Antecedente', 'Borrador del memo de reajuste de enero de 2027 por el IPC 2026, con el porcentaje en blanco hasta que el INE lo publique.', 'Abierto'],
  ['df', '2026-10-21', 'Comentario', 'El memo de pago llega entre uno y tres meses después del mes de servicio (septiembre: 21-10).', 'Abierto'],
  ['df', '2026-09-02', 'Hecho por subsanar', 'Falta el puesto de trabajo para el funcionario municipal en la garita de la báscula que exigen las bases.', 'Abierto'],
  ['df', '2026-01-01', 'Comentario', 'El D.A. 2.737 proyecta 4.657,85 t/mes y los documentos de 2025 promedian 4.574,38 t/mes: verificar la base usada.', 'Abierto']
];
w('antecedentes.json', A.map((r, i) => ({ id: 'AN' + String(i + 1).padStart(2, '0'), contrato: r[0], fecha: r[1], tipo: r[2], texto: r[3], estado: r[4] })));

// ---------- Fechas del ciclo que no están en el libro (disposición final y octubre de recolección) ----------
w('ciclo_fechas.json', [
  { contrato: 'df', periodo: '2026-10', hito: 'memo_oc', fecha: '2026-11-05', documento: 'Memo 2214/2026 · pide OC de octubre' },
  { contrato: 'df', periodo: '2026-10', hito: 'informe_trabajos', fecha: '2026-11-02', documento: 'Ingresos y tickets de octubre (relleno Santa Inés)' },
  { contrato: 'rec', periodo: '2026-10', hito: 'informe_trabajos', fecha: '2026-11-05', documento: 'Informe por los servicios de octubre 2026' }
], { reglas: { infoDesde: 1, infoHasta: 5, ocDias: 7, facturaDesde: 15, facturaHasta: 20, pagoDias: 30 },
  presupuesto: { cuenta: '215.22.08.001.001', basesRecMensualMin: 250000000, basesRecMensualMax: 260000000, basesRecMeses: 60, basesDf: 5200000000, basesDfMeses: 60, inicioRec: '2024-07', inicioDf: '2025-01' } });
fs.writeFileSync(path.join(OUT, 'resumenes.json'), JSON.stringify({ corte: '2026-11-20', rows: RES }, null, 1)); console.log('resumenes.json', RES.length);
