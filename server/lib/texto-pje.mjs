// Classificacao de texto do PJe. Nao modifica o texto original nem certifica leitura.
const CARIMBO = /^(Documento assinado eletronicamente.*|Assinado eletronicamente por.*|https?:\/\/pje\S*.*|N[úu]mero do (documento|processo):.*|Fls\.?\s*:?\s*\d+|ID\.?\s*[0-9a-f]{7}\s*-\s*P[áa]g\.\s*\d+|\d+)$/i;
const espacado = s => [...s.replace(/\s/g, '')].join('\\s*');
const SIGILO = new RegExp(espacado('documento em sigilo ou segredo de justica'), 'gi');
const VISIBILIDADE = new RegExp(espacado('usuario em visibilidade') + '\\s*:', 'gi');
const dobrar = t => String(t ?? '').normalize('NFD').replace(/\p{M}/gu, '');
export function analisarTextoPje(texto, { minimo = 20, imagens = 0 } = {}) {
  const original = String(texto ?? '');
  let t = dobrar(original).replace(/\r\n?/g, '\n');
  const marcaSigilo = new RegExp(SIGILO.source, 'i').test(t);
  // Retira somente a frase conhecida, nunca a pagina inteira; conserva o original para citacao.
  if (marcaSigilo) {
    t = t.replace(SIGILO, '');
    // Nome na marca d'agua pode vir letra a letra. Remova apenas a linha isolada
    // ou a sequencia de letras isoladas; nao consuma texto de outras linhas.
    t = t.replace(new RegExp(VISIBILIDADE.source + '(?:[ \\t]*\\n[ \\t]*[A-Z](?=[ \\t]*\\n|$))+', 'g'), '');
    t = t.replace(new RegExp('^\\s*' + VISIBILIDADE.source + '[ \\t]*[A-Z][A-Z \\t.-]*(?=\\n|$)', 'gm'), '');
    t = t.replace(VISIBILIDADE, '');
  }
  const textoUtil = t.split('\n').filter(l => !CARIMBO.test(l.trim())).join('\n').trim();
  const caracteresUteis = textoUtil.replace(/\s/g, '').length;
  const temTexto = caracteresUteis >= minimo;
  return { textoUtil, caracteresUteis, temTexto, marcaSigilo,
    revisaoVisual: !temTexto || (marcaSigilo && imagens > 0) };
}

export function carimboPje(texto) {
  const t = String(texto ?? '').replace(/\r\n?/g, '\n');
  const a = /Documento assinado eletronicamente por\s+(.+?),\s*em\s*(\d{2}\/\d{2}\/\d{4})[^\n]*?-\s*([0-9a-f]{7})\b/i.exec(t)
    || /Assinado eletronicamente por:\s*(.+?)\s*-\s*(\d{2}\/\d{2}\/\d{4})[^\n]*?-\s*([0-9a-f]{7})\b/i.exec(t);
  const ids = [...new Set([...t.matchAll(/(?:Documento assinado eletronicamente por|Assinado eletronicamente por:)[^\n]*?-\s*([0-9a-f]{7})\b/gi)].map(m => m[1].toLowerCase()))];
  const f = [...t.matchAll(/\bFls\.?\s*:\s*(\d+)/gi)];
  const folhas = [...new Set(f.map(m => Number(m[1])))];
  return { idPje: ids.length > 1 ? null : (a ? a[3].toLowerCase() : null), assinadoPor: a ? a[1].trim() : null,
    data: a ? a[2] : null, folha: folhas.length === 1 ? folhas[0] : null, ambiguo: ids.length > 1 || folhas.length > 1 };
}

// Intervalos consecutivos confirmados pelo ID; pagina sem ID nunca e atribuida por adivinhacao.
export function segmentarPaginasPje(paginas) {
  const pecas = [];
  const pendencias = [];
  for (const p of paginas) {
    const numero = p.numero;
    const c = carimboPje(p.texto);
    const id = c.ambiguo ? null : c.idPje;
    if (!id) pendencias.push(numero);
    const ultima = pecas.at(-1);
    if (id && ultima?.idPje === id && ultima.fim + 1 === numero) {
      ultima.fim = numero; ultima.folhaFim = c.folha;
    } else {
      pecas.push({ idPje: id, inicio: numero, fim: numero, folhaInicio: c.folha, folhaFim: c.folha,
        estado: id ? 'id_identificado' : 'a_conferir' });
    }
  }
  return { pecas, paginasSemIdConfirmado: pendencias, totalPaginas: paginas.length,
    lembrete: 'Segmentacao indicativa: confronte com o sumario do PJe e confira todas as paginas.' };
}
