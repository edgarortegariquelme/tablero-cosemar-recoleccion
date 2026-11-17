var M=require('../motor/motor.js'),C=require('../datos/catalogo.js'),L=require('../datos/semilla.js'),hoy='2026-11-16';
var bad=L.filter(e=>{var v=M.validar(e);return !v.ok||v.ambiguo.length}); console.log('registros',L.length,'inválidos',bad.length,bad.slice(0,3).map(e=>e.clave+JSON.stringify(M.validar(e))));
var ks={};L.forEach(e=>ks[e.clave]=(ks[e.clave]||0)+1);console.log('claves duplicadas',Object.keys(ks).filter(k=>ks[k]>1));
var p=M.portada(L,C,hoy);
p.sanciones.forEach(s=>console.log(s.id,'|',s.estado,'|',s.plazo.estado,'|',(s.plazo.falta||s.plazo.regla).slice(0,70),'| prop',s.montos.propuesto&&s.montos.propuesto.valor,'dec',s.montos.decretado&&s.montos.decretado.valor,'cob',s.montos.cobrado&&s.montos.cobrado.valor));
p.pagos.forEach(x=>console.log(x.periodo,'|',x.estado,'| esp',x.esperado&&x.esperado.valor,'rem',x.remitido,'pag',x.pagado,'| dif',x.diferencias.map(d=>d.tipo+(d.monto?':'+d.monto:'')).join(',')));
console.log('vence',p.vence.map(v=>v.entidad+' '+v.tipo+' '+v.dias),'atrasado',p.atrasado.length,'monto',p.montoPendiente);
console.log('cobertura',M.cobertura(C,L).reduce((a,c)=>(a[c.estado]=(a[c.estado]||0)+1,a),{}));
console.log('avisos',M.avisos(L,C,hoy).length, 'habiles 2026-10-30 +5 =',M.sumarHabiles('2026-10-30',5));
