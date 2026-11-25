import type { Child, PropsWithChildren } from 'hono/jsx'
import { raw } from 'hono/html'
import type { Env, Loja, Produto } from '../tipos'
import { linkWhatsapp, lista, reais } from '../lib/formato'
import { urlImagem } from '../lib/lojas'

const VERSAO = '1'

export type Meta = {
  titulo: string
  descricao?: string
  imagem?: string
  canonica?: string
  indexar?: boolean
  jsonld?: object
  /** Recarrega a página sozinha a cada N segundos (pedido esperando o Pix). */
  atualizar?: number
}

/** Link interno da vitrine, respeitando o modo (subdomínio ou /loja/<slug>). */
export const ir = (base: string, caminho: string) => (caminho === '/' ? base || '/' : `${base}${caminho}`)

function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" class="ic">
      <path d={d} />
    </svg>
  )
}

const ICONES = {
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.6-3.6',
  sacola: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  check: 'M4 12l5 5L20 6',
  cartao: 'M3 7h18v10H3zM3 11h18',
  baixar: 'M12 4v10m0 0l-4-4m4 4l4-4M5 19h14',
}

export function Vitrine(
  p: PropsWithChildren<{ env: Env; loja: Loja; base: string; meta: Meta; carrinho: number; categorias?: { nome: string; slug: string }[] }>,
) {
  const { loja, base, meta } = p
  const titulo = meta.titulo === loja.nome ? loja.nome : `${meta.titulo} · ${loja.nome}`
  const zap = loja.whatsapp ? linkWhatsapp(loja.whatsapp, `Oi! Vim pela loja ${loja.nome} e queria tirar uma dúvida.`) : ''
  const temSobre = loja.sobre.trim().length > 0
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <title>{titulo}</title>
          {meta.descricao && <meta name="description" content={meta.descricao} />}
          {meta.indexar === false && <meta name="robots" content="noindex" />}
          {meta.atualizar ? <meta http-equiv="refresh" content={String(meta.atualizar)} /> : null}
          {meta.canonica && <link rel="canonical" href={meta.canonica} />}
          <meta name="theme-color" content={loja.cor_marca} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={loja.nome} />
          <meta property="og:title" content={meta.titulo} />
          {meta.descricao && <meta property="og:description" content={meta.descricao} />}
          {meta.imagem && <meta property="og:image" content={meta.imagem} />}
          {meta.canonica && <meta property="og:url" content={meta.canonica} />}
          <meta name="twitter:card" content={meta.imagem ? 'summary_large_image' : 'summary'} />
          <link rel="icon" href={loja.logo_key ? urlImagem(loja.logo_key) : '/_lp/favicon-loja.svg'} />
          <link rel="stylesheet" href={`/_lp/loja.css?v=${VERSAO}`} />
          <style>{raw(`:root{--marca:${loja.cor_marca};--destaque:${loja.cor_destaque}}`)}</style>
          {meta.jsonld && <script type="application/ld+json">{raw(JSON.stringify(meta.jsonld).replace(/</g, '\\u003c'))}</script>}
          {loja.ga4 && /^G-[A-Z0-9]+$/.test(loja.ga4) && (
            <>
              <script async src={`https://www.googletagmanager.com/gtag/js?id=${loja.ga4}`}></script>
              <script>{raw(`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${loja.ga4}');`)}</script>
            </>
          )}
          <script src={`/_lp/loja.js?v=${VERSAO}`} defer></script>
        </head>
        <body>
          {loja.aviso && (
            <div class="faixa-aviso">
              {loja.aviso_link ? <a href={loja.aviso_link.startsWith('/') ? ir(base, loja.aviso_link) : loja.aviso_link}>{loja.aviso}</a> : <span>{loja.aviso}</span>}
            </div>
          )}
          <header class="cabecalho">
            <div class="cabecalho__topo envelope">
              <a class="cabecalho__marca" href={ir(base, '/')}>
                {loja.logo_key ? <img src={urlImagem(loja.logo_key)} alt={loja.nome} /> : <span>{loja.nome}</span>}
              </a>
              <form class="busca" role="search" method="get" action={ir(base, '/produtos')}>
                <input type="search" name="q" placeholder="Buscar na loja..." aria-label="Buscar na loja" autocomplete="off" />
                <button type="submit" aria-label="Buscar">
                  <Icone d={ICONES.busca} />
                </button>
              </form>
              <a class="cabecalho__sacola" href={ir(base, '/carrinho')} aria-label={`Carrinho, ${p.carrinho} itens`}>
                <Icone d={ICONES.sacola} />
                {p.carrinho > 0 && <span class="contador">{p.carrinho}</span>}
              </a>
            </div>
            <nav class="cabecalho__menu envelope" aria-label="Loja">
              <a href={ir(base, '/')}>Início</a>
              <a href={ir(base, '/produtos')}>Produtos</a>
              {temSobre && <a href={ir(base, '/sobre')}>Sobre</a>}
              <a href={ir(base, '/contato')}>Contato</a>
              <a href={ir(base, '/meus-pedidos')}>Meus pedidos</a>
            </nav>
          </header>

          <main class="miolo envelope">{p.children}</main>

          <footer class="rodape">
            <div class="envelope rodape__colunas">
              <div>
                <p class="rodape__nome">{loja.nome}</p>
                {loja.descricao && <p>{loja.descricao}</p>}
                {loja.instagram && (
                  <p>
                    <a href={`https://instagram.com/${loja.instagram}`} target="_blank" rel="noopener">
                      @{loja.instagram}
                    </a>
                  </p>
                )}
              </div>
              <div>
                <h2>A loja</h2>
                <ul>
                  <li>
                    <a href={ir(base, '/produtos')}>Todos os produtos</a>
                  </li>
                  {temSobre && (
                    <li>
                      <a href={ir(base, '/sobre')}>Sobre</a>
                    </li>
                  )}
                  <li>
                    <a href={ir(base, '/contato')}>Contato</a>
                  </li>
                  <li>
                    <a href={ir(base, '/meus-pedidos')}>Meus pedidos</a>
                  </li>
                </ul>
              </div>
              <div>
                <h2>Informações</h2>
                <ul>
                  <li>
                    <a href={ir(base, '/termos-de-uso')}>Termos de uso</a>
                  </li>
                  <li>
                    <a href={ir(base, '/politica-de-privacidade')}>Política de privacidade</a>
                  </li>
                  <li>
                    <a href={ir(base, '/politica-de-reembolso')}>Política de reembolso</a>
                  </li>
                </ul>
              </div>
            </div>
            <div class="rodape__base envelope">
              <span>
                © {new Date().getUTCFullYear()} {loja.nome}
                {loja.documento ? ` · ${loja.documento}` : ''}
              </span>
              <a href={`${p.env.SITE_URL}/?utm_source=loja&utm_medium=rodape&utm_campaign=${loja.slug}`} class="rodape__credito">
                Loja criada com Lojinha Pronta
              </a>
            </div>
          </footer>

          {zap && (
            <a class="zap" href={zap} target="_blank" rel="noopener" aria-label="Falar pelo WhatsApp">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8.9 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c0-.2-.3-.3-.5-.4z" />
              </svg>
            </a>
          )}
        </body>
      </html>
    </>
  )
}

export function CapaProduto({ produto, loja, grande }: { produto: Produto; loja: Loja; grande?: boolean }) {
  const capa = lista(produto.imagens)[0]
  if (capa) return <img src={urlImagem(capa)} alt={produto.nome} loading={grande ? 'eager' : 'lazy'} />
  // Sem foto: uma "folha" desenhada com as cores da loja, em vez de buraco cinza.
  return (
    <span class="capa-vazia" aria-hidden="true">
      <span class="capa-vazia__folha">
        <span></span>
        <span></span>
        <span></span>
        <em>{produto.nome.slice(0, 40)}</em>
      </span>
    </span>
  )
}

export function CartaoProduto({ produto, loja, base }: { produto: Produto; loja: Loja; base: string }) {
  return (
    <li class="produto">
      <a href={ir(base, `/produto/${produto.slug}`)}>
        <span class="produto__capa">
          <CapaProduto produto={produto} loja={loja} />
          {produto.preco_de_centavos && produto.preco_de_centavos > produto.preco_centavos ? <span class="selo">Oferta</span> : null}
        </span>
        <span class="produto__nome">{produto.nome}</span>
        <Preco produto={produto} />
      </a>
    </li>
  )
}

export function Preco({ produto, grande }: { produto: Produto; grande?: boolean }) {
  const de = produto.preco_de_centavos && produto.preco_de_centavos > produto.preco_centavos ? produto.preco_de_centavos : null
  return (
    <span class={`preco${grande ? ' preco--grande' : ''}`}>
      {de && <s>{reais(de)}</s>}
      <strong>{produto.preco_centavos === 0 ? 'Grátis' : reais(produto.preco_centavos)}</strong>
    </span>
  )
}

export function Garantias() {
  return (
    <ul class="garantias">
      <li>
        <Icone d={ICONES.check} />
        <span>
          <strong>Entrega na hora</strong> Assim que o pagamento é confirmado
        </span>
      </li>
      <li>
        <Icone d={ICONES.cartao} />
        <span>
          <strong>Pix, cartão ou boleto</strong> Pagamento seguro pelo Mercado Pago
        </span>
      </li>
      <li>
        <Icone d={ICONES.baixar} />
        <span>
          <strong>Baixe quando quiser</strong> O link chega no seu e-mail
        </span>
      </li>
    </ul>
  )
}

export function Bloco(p: PropsWithChildren<{ titulo?: Child; class?: string; acao?: Child }>) {
  return (
    <section class={`bloco ${p.class ?? ''}`}>
      {p.titulo && (
        <header class="bloco__topo">
          <h2>{p.titulo}</h2>
          {p.acao}
        </header>
      )}
      {p.children}
    </section>
  )
}

export { ICONES, Icone }
