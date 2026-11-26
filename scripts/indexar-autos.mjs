// Indexador local opcional, independente do PJe-Calc; nenhum upload ou instalacao automatica.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { analisarTextoPje, segmentarPaginasPje } from '../server/lib/texto-pje.mjs';
import { lerPdf } from '../server/lib/pdf.mjs';

const [arquivo, destino, ...args] = process.argv.slice(2);
if (!arquivo || !destino || (args.length && (args.length !== 2 || args[0] !== '--ocr-paginas'))) {
  console.error('Uso: node scripts/indexar-autos.mjs <autos.pdf> <pasta-local-nova> [--ocr-paginas 12,15-17]');
  process.exit(1);
}
function executar(cmd, argv) {
  const r = spawnSync(cmd, argv, { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024, timeout: 300000 });
  if (r.error || r.status !== 0) throw new Error(cmd + ': ' + (r.error?.message || r.stderr || 'falha'));
  return r.stdout;
}
function selecionar(s, total) {
  if (!s) return [];
  const out = new Set();
  for (const item of s.split(',')) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(item.trim());
    if (!m) throw new Error('Intervalo invalido: ' + item);
    const a = Number(m[1]), b = Number(m[2] || m[1]);
    if (a < 1 || b < a || b > total || b - a > 99) throw new Error('Intervalo fora dos limites: ' + item);
    for (let n = a; n <= b; n++) out.add(n);
  }
  if (out.size > 100) throw new Error('Maximo de 100 paginas por rodada de OCR.');
  return [...out].sort((a,b)=>a-b);
}
const pdf = path.resolve(arquivo);
const dir = path.resolve(destino);
if (fs.existsSync(dir)) throw new Error('Use uma pasta de destino nova, fora de repositorios sincronizados.');
const avisos = [];
let paginas;
let motor;
try {
  // -raw conserva a ordem do fluxo e separa a marca diagonal letra a letra.
  const texto = executar('pdftotext', ['-enc','UTF-8','-raw',pdf,'-']);
  const partes = texto.split('\f');
  if (partes.at(-1)?.trim() === '') partes.pop();
  if (!partes.length || partes.some(t => t.includes('\uFFFD'))) throw new Error('Texto vazio ou codificacao invalida.');
  paginas = partes.map((texto, i) => ({ numero: i+1, texto }));
  motor = 'pdftotext-utf8-raw';
} catch(e) {
  avisos.push('Extracao externa indisponivel: ' + e.message + '. Usando leitor nativo.');
  const r = lerPdf(fs.readFileSync(pdf));
  paginas = r.paginas; motor = 'nativo'; avisos.push(...r.avisos);
}
if (!paginas.length) throw new Error('Nenhuma pagina identificada.');
const ocr = selecionar(args[1], paginas.length);
fs.mkdirSync(dir, { recursive: false });
const resultado = { motor, totalPaginas: paginas.length, ...segmentarPaginasPje(paginas), avisos,
  paginas: paginas.map(p => {
    const m = analisarTextoPje(p.texto, { imagens: p.imagens ?? 0 });
    return { numero: p.numero, caracteresUteis: m.caracteresUteis, marcaSigilo: m.marcaSigilo, temTexto: m.temTexto,
      revisaoVisual: m.revisaoVisual || m.marcaSigilo || ocr.includes(p.numero), estadoLeitura: 'pendente' };
  }), ocr: [], lembrete: 'Texto extraido nao e leitura validada. Confira todas as paginas, o sumario e os valores visualmente.' };
fs.writeFileSync(path.join(dir,'paginas.jsonl'), paginas.map(p => JSON.stringify({numero:p.numero,texto:p.texto})).join('\n')+'\n','utf8');
for (const n of ocr) {
  const prefixo = path.join(dir,'pagina-'+n);
  try {
    executar('pdftoppm',['-f',String(n),'-l',String(n),'-r','300','-png','-singlefile',pdf,prefixo]);
    const texto = executar('tesseract',[prefixo+'.png','stdout','-l','por']);
    if (!texto.trim()) throw new Error('OCR vazio.');
    fs.writeFileSync(prefixo+'-ocr.txt',texto,'utf8');
    resultado.ocr.push({pagina:n,estado:'extraido_nao_validado',arquivo:path.basename(prefixo+'-ocr.txt')});
  } catch(e) { resultado.ocr.push({pagina:n,estado:'pendente',erro:e.message}); }
}
fs.writeFileSync(path.join(dir,'inventario.json'),JSON.stringify(resultado,null,2)+'\n','utf8');
console.log(JSON.stringify({motor,totalPaginas:paginas.length,pecas:resultado.pecas.length,paginasSemId:resultado.paginasSemIdConfirmado.length,paraRevisaoVisual:resultado.paginas.filter(p=>p.revisaoVisual).length,ocrSolicitado:ocr.length,ocrPendentes:resultado.ocr.filter(p=>p.estado==='pendente').length,destino:dir},null,2));
if (resultado.ocr.some(p=>p.estado==='pendente')) process.exitCode=2;
