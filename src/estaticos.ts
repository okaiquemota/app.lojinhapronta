/**
 * CSS, JS e ícones servidos pelo próprio Worker, embutidos no build.
 *
 * São poucos arquivos pequenos; embutir dispensa o upload separado de "assets"
 * e deixa o deploy num passo só.
 *
 * tokens.css (a escala de tipo, espaço, raio e cor) vai na frente de cada
 * folha de estilo: um pedido só, e as três superfícies falam a mesma língua.
 *
 * A versão de cada arquivo é um resumo do conteúdo, calculado quando o Worker
 * sobe. O link sai com ?v=<versão>; pedido com a versão certa pode ficar um ano
 * em cache, porque qualquer mudança no arquivo muda o endereço.
 */
import tokensCss from '../public/_lp/tokens.css'
import plataformaCss from '../public/_lp/plataforma.css'
import plataformaJs from '../public/_lp/plataforma.js.txt'
import lojaCss from '../public/_lp/loja.css'
import lojaJs from '../public/_lp/loja.js.txt'
import favicon from '../public/_lp/favicon.svg'
import faviconLoja from '../public/_lp/favicon-loja.svg'
import siteCss from '../public/_lp/site.css'
import siteJs from '../public/_lp/site.js.txt'

const CSS = 'text/css; charset=utf-8'
const JS = 'text/javascript; charset=utf-8'
const SVG = 'image/svg+xml'

const FONTES: Record<string, { corpo: string; tipo: string }> = {
  'plataforma.css': { corpo: `${tokensCss}\n${plataformaCss}`, tipo: CSS },
  'plataforma.js': { corpo: plataformaJs, tipo: JS },
  'loja.css': { corpo: `${tokensCss}\n${lojaCss}`, tipo: CSS },
  'loja.js': { corpo: lojaJs, tipo: JS },
  'site.css': { corpo: `${tokensCss}\n${siteCss}`, tipo: CSS },
  'site.js': { corpo: siteJs, tipo: JS },
  'favicon.svg': { corpo: favicon, tipo: SVG },
  'favicon-loja.svg': { corpo: faviconLoja, tipo: SVG },
}

/** FNV-1a de 32 bits: rápido, síncrono e bom o bastante para versão de cache. */
function resumo(texto: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

const ARQUIVOS = Object.fromEntries(Object.entries(FONTES).map(([nome, a]) => [nome, { ...a, versao: resumo(a.corpo) }]))

/** Endereço de um arquivo estático, já com a versão: `/_lp/loja.css?v=1x2y3z`. */
export function urlEstatico(nome: keyof typeof FONTES & string): string {
  const a = ARQUIVOS[nome]
  return a ? `/_lp/${nome}?v=${a.versao}` : `/_lp/${nome}`
}

export function servirEstatico(nome: string, versao?: string | null): Response {
  const a = ARQUIVOS[nome]
  if (!a) return new Response('Não encontrado', { status: 404 })
  return new Response(a.corpo, {
    headers: {
      'Content-Type': a.tipo,
      // Versão certa: o conteúdo daquele endereço nunca muda. Sem versão (ou
      // uma antiga, de página em cache), guarda pouco.
      'Cache-Control': versao === a.versao ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
