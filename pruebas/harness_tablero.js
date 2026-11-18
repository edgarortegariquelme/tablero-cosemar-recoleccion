const comprobarVista = require('./harness_borrador');
process.exitCode = comprobarVista('store', process.argv[2]);
