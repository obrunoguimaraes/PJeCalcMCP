// Contingencia assistida: cenarios tecnicos sem liquidacao ou estimativa de probabilidade.
const VERBA = new Set(['quantidade','valor','periodo','data','base','divisor','multiplicador','valorPago','reflexos','incidencias','ocorrencias','proporcionalizar','gerarPrincipal','gerarReflexo','zerarNegativo']);
const CALCULO = new Set(['inicio','fim','cargaHoraria','maiorRemuneracao','ultimaRemuneracao','prescricaoQuinquenal','prescricaoFgts','limitarAvos']);
const TIPOS = new Set(['ajustar_verba','excluir_verba','ajustar_calculo']);
const clonar = (x) => structuredClone(x);
const proprio = (x,k) => Object.prototype.hasOwnProperty.call(x,k);
function exigir(ok,msg) { if (!ok) throw new Error(msg); }
function indiceDaVerba(verbas, nome) {
  exigir(typeof nome === 'string' && nome.trim(), 'Informe a verba que deseja alterar.');
  const indices = verbas.map((v,i) => v.verba === nome || v.nome === nome ? i : -1).filter(i => i >= 0);
  exigir(indices.length > 0, 'Verba nao encontrada na especificacao-base: ' + nome);
  exigir(indices.length === 1, 'Verba ambigua na especificacao-base: ' + nome + '. Identifique o lancamento por nome unico.');
  return indices[0];
}
export function prepararCenariosContingencia(especificacaoBase, cenarios) {
  exigir(especificacaoBase && typeof especificacaoBase === 'object' && !Array.isArray(especificacaoBase), 'Informe uma especificacao-base.');
  exigir(especificacaoBase.calculo && typeof especificacaoBase.calculo === 'object', 'Falta o bloco calculo na especificacao-base.');
  exigir(Array.isArray(especificacaoBase.verbas) && especificacaoBase.verbas.length, 'A especificacao-base precisa de verbas.');
  exigir(Array.isArray(cenarios) && cenarios.length > 0 && cenarios.length <= 10, 'Informe de 1 a 10 cenarios.');
  const ids = new Set();
  const saida = [];
  for (const [i,c] of cenarios.entries()) {
    const ref = 'Cenario ' + (i+1);
    exigir(c && typeof c === 'object', ref + ': objeto invalido.');
    exigir(typeof c.id === 'string' && /^[a-z0-9][a-z0-9_-]{0,39}$/.test(c.id), ref + ': id invalido.');
    exigir(!ids.has(c.id), 'ID de cenario repetido: ' + c.id);
    ids.add(c.id);
    exigir(typeof c.nome === 'string' && c.nome.trim(), ref + ': nome obrigatorio.');
    exigir(typeof c.justificativa === 'string' && c.justificativa.trim(), ref + ': justificativa obrigatoria.');
    exigir(Array.isArray(c.alteracoes), ref + ': informe lista de alteracoes, mesmo vazia.');
    const spec = clonar(especificacaoBase);
    const aprovacaoAnteriorInvalidada = Boolean(spec.contrato && spec.contrato.aprovacao);
    if (spec.contrato) delete spec.contrato.aprovacao;
    const alteradas = c.premissasAlteradas ?? [];
    const fixas = c.premissasFixas ?? [];
    const pendencias = c.pendencias ?? [];
    exigir(Array.isArray(alteradas) && Array.isArray(fixas) && Array.isArray(pendencias), ref + ': premissas e pendencias devem ser listas.');
    const idsPremissas = new Set();
    for (const [tipo, itens] of [['alterada', alteradas], ['fixa', fixas]]) {
      for (const x of itens) {
        exigir(x && typeof x.id === 'string' && x.id.trim(), ref + ': id de premissa obrigatorio.');
        exigir(!idsPremissas.has(x.id), ref + ': premissa repetida ou simultaneamente fixa e alterada: ' + x.id);
        idsPremissas.add(x.id);
        exigir(tipo === 'fixa' ? typeof x.motivo === 'string' && x.motivo.trim() : proprio(x,'valor') && typeof x.descricao === 'string' && x.descricao.trim(), ref + ': fundamento da premissa obrigatorio: ' + x.id);
      }
    }
    exigir(pendencias.every(x => typeof x === 'string' && x.trim()), ref + ': pendencia sem descricao.');
    spec.cenario = { nome:c.nome, descricao:c.justificativa, premissasAlteradas:clonar(alteradas), premissasFixas:clonar(fixas), pendencias:clonar(pendencias) };
    const diferencas = [];
    for (const [j,a] of c.alteracoes.entries()) {
      const item = ref + ', alteracao ' + (j+1);
      exigir(a && typeof a === 'object' && TIPOS.has(a.tipo), item + ': tipo invalido.');
      exigir(typeof a.fundamento === 'string' && a.fundamento.trim(), item + ': fundamento obrigatorio.');
      if (a.tipo === 'excluir_verba') {
        const removida = spec.verbas.splice(indiceDaVerba(spec.verbas,a.verba),1)[0];
        diferencas.push({tipo:a.tipo,verba:a.verba,anterior:clonar(removida),novo:null,fundamento:a.fundamento});
        continue;
      }
      const campos = a.tipo === 'ajustar_verba' ? VERBA : CALCULO;
      exigir(typeof a.campo === 'string' && campos.has(a.campo), item + ': campo nao permitido: ' + a.campo);
      exigir(proprio(a,'valor') && a.valor !== undefined, item + ': informe novo valor.');
      const alvo = a.tipo === 'ajustar_calculo' ? spec.calculo : spec.verbas[indiceDaVerba(spec.verbas,a.verba)];
      const anterior = proprio(alvo,a.campo) ? clonar(alvo[a.campo]) : null;
      alvo[a.campo] = clonar(a.valor);
      diferencas.push({tipo:a.tipo,...(a.tipo === 'ajustar_verba' ? {verba:a.verba} : {}),campo:a.campo,anterior,novo:clonar(a.valor),semEfeito:JSON.stringify(anterior) === JSON.stringify(a.valor),fundamento:a.fundamento});
    }
    exigir(spec.verbas.length > 0, ref + ': todas as verbas foram excluidas.');
    saida.push({id:c.id,nome:c.nome,justificativa:c.justificativa,alteracoes:diferencas,aprovacaoAnteriorInvalidada,revisaoHumanaObrigatoria:true,especificacao:spec});
  }
  return {versao:'contingencia-assistida-v2',processo:especificacaoBase.processo?.numero || null,totalCenarios:saida.length,
    observacoes:['Os cenarios representam hipoteses tecnicas, nao probabilidades de condenacao.',
      'Exposicao tecnica nao e provisao contabil.',
      'Exclusoes podem afetar bases e reflexos: valide cada especificacao.',
      'Aprovacoes anteriores nao sao herdadas; cada cenario exige nova revisao.'],cenarios:saida};
}

/** Compara resultados alternativos, sem somar exposicoes do mesmo processo. */
export function compararCenariosContingencia(itens, dataBase) {
  exigir(typeof dataBase === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataBase) && Number.isFinite(Date.parse(dataBase)) && new Date(dataBase).toISOString().slice(0,10) === dataBase, 'Data-base ISO invalida.');
  exigir(Array.isArray(itens) && itens.length >= 2 && itens.length <= 10, 'Informe de 2 a 10 cenarios.');
  const ids = new Set();
  const numero = itens[0]?.processo;
  exigir(typeof numero === 'string' && numero.trim(), 'Processo obrigatorio.');
  const campos = ['brutoDevidoAoReclamante','liquidoDevidoAoReclamante','totalDevidoPeloReclamado'];
  const linhas = itens.map(i => {
    exigir(i && i.processo === numero, 'Compare somente cenarios do mesmo processo.');
    exigir(typeof i.id === 'string' && i.id.trim() && !ids.has(i.id), 'Identificador ausente ou repetido.');
    ids.add(i.id);
    const r = i.resultado;
    exigir(r && r.dataLiquidacao === dataBase, 'Resultado ausente ou data-base divergente: ' + i.id);
    exigir(campos.every(k => typeof r[k] === 'number' && Number.isFinite(r[k]) && Number.isSafeInteger(Math.round(r[k]*100))), 'Total ausente ou invalido: ' + i.id);
    return {id:i.id, totais:Object.fromEntries(campos.map(k=>[k,Math.round(r[k]*100)]))};
  });
  const ref = linhas[0];
  return {processo:numero,dataBase,referencia:ref.id,cenarios:linhas.map(i=>({id:i.id,totais:Object.fromEntries(campos.map(k=>[k,i.totais[k]/100])),diferencas:Object.fromEntries(campos.map(k=>[k,(i.totais[k]-ref.totais[k])/100]))})),revisaoHumanaObrigatoria:true,observacao:'Comparacao aritmetica de resultados informados, sem certificacao de origem ou soma de cenarios; nao representa provisao contabil.'};
}
