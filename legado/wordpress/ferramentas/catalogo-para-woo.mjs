/**
 * Converte um catálogo em CSV de importação do WooCommerce.
 *
 * Existe porque cadastrar produto na mão é o item mais caro de cada entrega.
 * O WooCommerce importa CSV nativamente: dez produtos viram um upload de dois
 * minutos em vez de quarenta de digitação. O briefing do cliente deve ser
 * desenhado pra desembocar exatamente nas colunas que este script emite.
 *
 *   node ferramentas/catalogo-para-woo.mjs <produtos.js> <saida.csv> [--base URL]
 *
 * --base   prefixo público das imagens. O WooCommerce baixa a imagem da URL
 *          durante a importação, então dá pra apontar direto pro raw do GitHub
 *          e não subir nada à mão.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const [entrada, saida] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const baseImagens = (process.argv.find((a) => a.startsWith('--base=')) || '').slice(7)

if (!entrada || !saida) {
  console.error('uso: node catalogo-para-woo.mjs <produtos.js> <saida.csv> [--base=URL]')
  process.exit(1)
}

/* O catálogo é um arquivo de navegador: atribui a window. Damos a ele um
   window de mentira e lemos o resultado. */
globalThis.window = {}
await import(`file://${resolve(entrada)}`)
const catalogo = globalThis.window.produtosLojadoKiwi || []

/** Produto de afiliado não migra: a venda tem que acontecer no checkout do
    produtor pra comissão ser rastreada, e o arquivo não é nosso. */
const ehAfiliado = (p) => (p.linkCompra || '').includes('afid=')

/** "R$ 1.234,56" → "1234.56" */
function preco(texto) {
  const limpo = String(texto || '').replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '')
  return limpo.replace(',', '.')
}

function slug(texto) {
  return texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Dois produtos podem ter o mesmo nome; o subtítulo os distingue. */
function nomeCompleto(p) {
  const tema = (p.subtitulo || '').match(/^Tema:\s*(.+)$/i)
  return tema ? `${p.nome} — ${tema[1]}` : p.nome
}

const lista = (titulo, itens) =>
  itens?.length ? `<h3>${titulo}</h3>\n<ul>\n${itens.map((i) => `<li>${escaparHtml(i)}</li>`).join('\n')}\n</ul>` : ''

const escaparHtml = (t) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Junta os campos ricos do catálogo numa descrição só, sem perder texto. */
function descricao(p) {
  return [
    p.descricaoDetalhada ? `<p>${escaparHtml(p.descricaoDetalhada)}</p>` : '',
    lista('O que vem no arquivo', p.itens),
    lista('Ideal para', p.idealPara),
    lista('Como usar', p.comoUsar),
    lista('Observações', p.observacoes),
  ].filter(Boolean).join('\n\n')
}

function imagem(p) {
  if (!p.imagem) return ''
  const existe = existsSync(resolve(dirname(entrada), p.imagem))
  if (!existe) return '' // imagem ainda não produzida: melhor vazio que link quebrado
  return baseImagens ? `${baseImagens.replace(/\/$/, '')}/${p.imagem}` : p.imagem
}

/* Colunas do importador nativo do WooCommerce. */
const COLUNAS = [
  'Type', 'SKU', 'Name', 'Published', 'Is featured?', 'Visibility in catalog',
  'Short description', 'Description', 'Tax status', 'In stock?', 'Sold individually?',
  'Regular price', 'Categories', 'Images',
  'Download limit', 'Download expiry days', 'Download 1 name', 'Download 1 URL',
]

function linha(p) {
  const nome = nomeCompleto(p)
  return {
    // virtual + downloadable é o que faz o Woo entregar o arquivo sozinho —
    // não precisa de plugin de entrega automática.
    'Type': 'simple, virtual, downloadable',
    'SKU': slug(nome),
    'Name': nome,
    // -1 = rascunho. Entra escondido de propósito: sem o PDF anexado, um
    // produto publicado é um produto que vende e não entrega.
    'Published': '-1',
    'Is featured?': p.mostrarNaInicial ? '1' : '0',
    'Visibility in catalog': 'visible',
    'Short description': p.descricao || '',
    'Description': descricao(p),
    'Tax status': 'none',
    'In stock?': '1',
    'Sold individually?': '1',
    'Regular price': preco(p.preco),
    'Categories': p.categoriaNome || '',
    'Images': imagem(p),
    'Download limit': '5',
    'Download expiry days': '',
    'Download 1 name': nome,
    'Download 1 URL': '', // preencher depois de subir o PDF
  }
}

const aspas = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

const proprios = catalogo.filter((p) => !ehAfiliado(p))
const linhas = proprios.map(linha)
const csv = [COLUNAS.join(','), ...linhas.map((l) => COLUNAS.map((c) => aspas(l[c])).join(','))].join('\n')
writeFileSync(saida, csv + '\n', 'utf8')

/* Relatório: o que ainda falta pra esses produtos poderem ser publicados. */
const semImagem = linhas.filter((l) => !l['Images']).map((l) => l['Name'])
const semArquivo = linhas.map((l) => l['Name'])

console.log(`catálogo lido:      ${catalogo.length} produtos`)
console.log(`afiliados ignorados: ${catalogo.length - proprios.length}`)
console.log(`exportados:         ${proprios.length}  →  ${saida}`)
console.log()
if (semImagem.length) {
  console.log(`FALTA IMAGEM (${semImagem.length}):`)
  semImagem.forEach((n) => console.log('   - ' + n))
}
console.log()
console.log(`FALTA O PDF em todos os ${semArquivo.length} — coluna "Download 1 URL" vazia.`)
console.log('Suba os arquivos e preencha a URL, ou anexe no painel depois de importar.')
