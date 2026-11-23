import assert from 'node:assert/strict';
import { prepararCenariosContingencia } from '../server/lib/contingencia.mjs';
const base={processo:{numero:'0001234-45.2015.5.08.0001'},calculo:{inicio:'2015-01-01',fim:'2015-12-31',cargaHoraria:220},verbas:[{verba:'HORAS EXTRAS 50%',quantidade:20,reflexos:['DSR']},{verba:'INDENIZACAO',valor:1000}],contrato:{aprovacao:{por:'Revisor',em:'2026-01-01',hashContrato:'abc'}}};
const original=structuredClone(base);
const r=prepararCenariosContingencia(base,[
 {id:'integral',nome:'Integral',justificativa:'Pedidos integrados',alteracoes:[]},
 {id:'alternativo',nome:'Alternativo',justificativa:'Jornada alternativa',alteracoes:[
  {tipo:'ajustar_verba',verba:'HORAS EXTRAS 50%',campo:'quantidade',valor:12,fundamento:'Cartao de ponto'},
  {tipo:'excluir_verba',verba:'INDENIZACAO',fundamento:'Hipotese expressa de improcedencia'},
  {tipo:'ajustar_calculo',campo:'cargaHoraria',valor:200,fundamento:'Carga horaria documentada'}
 ]}
]);
assert.equal(r.totalCenarios,2);
assert.deepEqual(base,original,'nao pode modificar a base');
assert.equal(r.cenarios[0].especificacao.verbas[0].quantidade,20);
assert.equal(r.cenarios[1].especificacao.verbas[0].quantidade,12);
assert.equal(r.cenarios[1].especificacao.verbas.length,1);
assert.equal(r.cenarios[1].especificacao.calculo.cargaHoraria,200);
assert.equal(r.cenarios[0].especificacao.contrato.aprovacao,undefined);
assert.equal(r.cenarios[1].aprovacaoAnteriorInvalidada,true);
const c=(a)=>[{id:'teste',nome:'Teste',justificativa:'Premissa',alteracoes:a}];
assert.throws(()=>prepararCenariosContingencia(base,c([{tipo:'ajustar_calculo',campo:'admissao',valor:'2020-01-01',fundamento:'Incorreto'}])),/nao permitido/);
assert.throws(()=>prepararCenariosContingencia(base,c([{tipo:'ajustar_verba',verba:'INEXISTENTE',campo:'quantidade',valor:10,fundamento:'Incorreto'}])),/nao encontrada/);
assert.throws(()=>prepararCenariosContingencia(base,c([{tipo:'ajustar_verba',verba:'HORAS EXTRAS 50%',campo:'quantidade',valor:10}])),/fundamento/);
assert.throws(()=>prepararCenariosContingencia(base,c([{tipo:'excluir_verba',verba:'HORAS EXTRAS 50%',fundamento:'Cenario'},{tipo:'excluir_verba',verba:'INDENIZACAO',fundamento:'Cenario'}])),/todas as verbas/);
assert.throws(()=>prepararCenariosContingencia(base,[{id:'rep',nome:'A',justificativa:'A',alteracoes:[]},{id:'rep',nome:'B',justificativa:'B',alteracoes:[]}]),/repetido/);
const ambiguo=structuredClone(base);ambiguo.verbas.push({verba:'HORAS EXTRAS 50%',quantidade:30});
assert.throws(()=>prepararCenariosContingencia(ambiguo,c([{tipo:'ajustar_verba',verba:'HORAS EXTRAS 50%',campo:'quantidade',valor:10,fundamento:'Duplicada'}])),/ambigua/);
console.log('Testes offline de contingencia: OK');
