/**
 * CSS, JS e ícones servidos pelo próprio Worker, embutidos no build.
 *
 * São seis arquivos pequenos; embutir dispensa o upload separado de "assets"
 * e deixa o deploy num passo só. O ?v= nos links muda a cada versão, então o
 * cache pode ser longo.
 */
import plataformaCss from '../public/_lp/plataforma.css'
import plataformaJs from '../public/_lp/plataforma.js.txt'
import lojaCss from '../public/_lp/loja.css'
import lojaJs from '../public/_lp/loja.js.txt'
import favicon from '../public/_lp/favicon.svg'
import faviconLoja from '../public/_lp/favicon-loja.svg'

const ARQUIVOS: Record<string, { corpo: string; tipo: string }> = {
  'plataforma.css': { corpo: plataformaCss, tipo: 'text/css; charset=utf-8' },
  'plataforma.js': { corpo: plataformaJs, tipo: 'text/javascript; charset=utf-8' },
  'loja.css': { corpo: lojaCss, tipo: 'text/css; charset=utf-8' },
  'loja.js': { corpo: lojaJs, tipo: 'text/javascript; charset=utf-8' },
  'favicon.svg': { corpo: favicon, tipo: 'image/svg+xml' },
  'favicon-loja.svg': { corpo: faviconLoja, tipo: 'image/svg+xml' },
}

export function servirEstatico(nome: string): Response {
  const a = ARQUIVOS[nome]
  if (!a) return new Response('Não encontrado', { status: 404 })
  return new Response(a.corpo, {
    headers: {
      'Content-Type': a.tipo,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
