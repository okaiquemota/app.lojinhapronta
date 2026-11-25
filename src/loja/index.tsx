/**
 * A vitrine: a mesma aplicação serve todas as lojas. Quem é a loja vem do
 * endereço (subdomínio, domínio próprio ou /loja/<slug>), resolvido em
 * src/index.tsx e entregue aqui pelos cabeçalhos x-lp-*.
 */
import { Hono } from 'hono'
import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { raw } from 'hono/html'
import type { Categoria, Env, Loja, Pedido, Produto, VarsLoja } from '../tipos'
import { Bloco, CapaProduto, CartaoProduto, Garantias, Preco, Vitrine, ir, type Meta } from './layout'
import { Contato, Privacidade, Reembolso, Termos } from './legal'
import { TextoRico, resumir } from '../lib/texto'
import { lojaPorDominio, lojaPorSlug, situacao, urlImagem } from '../lib/lojas'
import { campo, dataHoraBR, emailValido, linkWhatsapp, lista, reais, tamanhoArquivo } from '../lib/formato'
import { contaConectada } from '../lib/conta-mp'
import { ErroVenda, criarPedido, itensDoPedido, pedidoPorToken, sincronizarPedido } from '../lib/pedidos'
import { enviarEmail, escaparHtml, moldeEmail } from '../lib/email'
import { registrarTentativa, tentativasRecentes } from '../lib/sessao'
import { urlDaLoja } from '../lib/dominio'

type C = Context<{ Bindings: Env; Variables: VarsLoja }>
const app = new Hono<{ Bindings: Env; Variables: VarsLoja }>()

// ── qual loja? ─────────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  const slug = c.req.header('x-lp-slug')
  const dominio = c.req.header('x-lp-dominio')
  const loja = slug ? await lojaPorSlug(c.env, slug) : dominio ? await lojaPorDominio(c.env, dominio) : null
  if (!loja) return c.html(<NaoExiste env={c.env} />, 404)
  c.set('loja', loja)
  c.set('base', c.req.header('x-lp-base') ?? '')

  // Fora do ar, a vitrine fecha — mas quem já pagou continua baixando.
  const s = situacao(loja)
  const caminho = new URL(c.req.url).pathname
  const sempreAberto = caminho.startsWith('/pedido/') || caminho === '/meus-pedidos' || caminho === '/robots.txt'
  if (!s.noAr && !sempreAberto) return c.html(<ForaDoAr loja={loja} />, 503)
  await next()
})

function NaoExiste({ env }: { env: Env }) {
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="robots" content="noindex" />
          <title>Loja não encontrada</title>
          <link rel="stylesheet" href="/_lp/loja.css" />
        </head>
        <body class="tela-simples">
          <div>
            <h1>Não encontramos esta loja.</h1>
            <p>Confira o endereço. Quer criar a sua?</p>
            <a class="btn" href={env.SITE_URL}>
              Conhecer a Lojinha Pronta
            </a>
          </div>
        </body>
      </html>
    </>
  )
}

function ForaDoAr({ loja }: { loja: Loja }) {
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="robots" content="noindex" />
          <title>{loja.nome}</title>
          <link rel="stylesheet" href="/_lp/loja.css" />
          <style>{raw(`:root{--marca:${loja.cor_marca};--destaque:${loja.cor_destaque}}`)}</style>
        </head>
        <body class="tela-simples">
          <div>
            {loja.logo_key ? <img src={urlImagem(loja.logo_key)} alt={loja.nome} class="tela-simples__logo" /> : <p class="tela-simples__nome">{loja.nome}</p>}
            <h1>Voltamos logo.</h1>
            <p>A loja está fechada por um momento.</p>
            {loja.whatsapp && (
              <a class="btn" href={linkWhatsapp(loja.whatsapp, `Oi! Tentei entrar na loja ${loja.nome}.`)}>
                Falar pelo WhatsApp
              </a>
            )}
            <p class="tela-simples__rodape">
              Já comprou? O link dos seus arquivos está no e-mail de confirmação.
            </p>
          </div>
        </body>
      </html>
    </>
  )
}

// ── apoio ──────────────────────────────────────────────────────────────────

/** Endereço absoluto da vitrine como a compradora está vendo. */
function origemVitrine(c: C): string {
  return `${new URL(c.req.url).origin}${c.get('base')}`
}

function absoluta(c: C, caminho: string): string {
  return `${new URL(c.req.url).origin}${c.get('base')}${caminho === '/' ? '' : caminho}`
}

// O carrinho é um cookie com os ids dos produtos. Produto digital não tem
// quantidade — ninguém compra o mesmo PDF duas vezes.
const COOKIE_CARRINHO = 'lp_carrinho'
function lerCarrinho(c: C): string[] {
  const v = getCookie(c, COOKIE_CARRINHO) ?? ''
  return v.split('.').filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 30)
}
function gravarCarrinho(c: C, ids: string[]) {
  setCookie(c, COOKIE_CARRINHO, ids.join('.'), {
    path: c.get('base') || '/',
    maxAge: 30 * 86400,
    sameSite: 'Lax',
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
  })
}

async function categorias(c: C): Promise<Categoria[]> {
  const r = await c.env.DB.prepare(
    `SELECT k.* FROM categorias k WHERE k.loja_id = ?
       AND EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id = k.id AND p.ativo = 1 AND p.arquivado = 0)
     ORDER BY k.ordem, k.nome`,
  )
    .bind(c.get('loja').id)
    .all<Categoria>()
  return r.results
}

const VITRINE = 'loja_id = ? AND ativo = 1 AND arquivado = 0'

function pagina(c: C, meta: Meta, conteudo: any, status = 200) {
  const loja = c.get('loja')
  const s = situacao(loja)
  return c.html(
    <Vitrine env={c.env} loja={loja} base={c.get('base')} meta={{ ...meta, indexar: meta.indexar !== false && s.noAr }} carrinho={lerCarrinho(c).length}>
      {conteudo}
    </Vitrine>,
    status as any,
  )
}

// ── início ─────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  const loja = c.get('loja')
  const base = c.get('base')
  const [cats, novidades] = await Promise.all([
    categorias(c),
    c.env.DB.prepare(`SELECT * FROM produtos WHERE ${VITRINE} ORDER BY destaque DESC, criado_em DESC LIMIT 12`).bind(loja.id).all<Produto>(),
  ])
  const linkBanner = loja.banner_link ? (loja.banner_link.startsWith('/') ? ir(base, loja.banner_link) : loja.banner_link) : ir(base, '/produtos')
  const contagem = new Map<string, number>()
  if (cats.length) {
    const r = await c.env.DB.prepare(`SELECT categoria_id, COUNT(*) AS n FROM produtos WHERE ${VITRINE} GROUP BY categoria_id`).bind(loja.id).all<{ categoria_id: string; n: number }>()
    for (const x of r.results) contagem.set(x.categoria_id, x.n)
  }

  return pagina(
    c,
    {
      titulo: loja.nome,
      descricao: loja.descricao || `Material digital da ${loja.nome}, para baixar na hora.`,
      canonica: absoluta(c, '/'),
      imagem: loja.banner_key ? `${new URL(c.req.url).origin}${urlImagem(loja.banner_key)}` : undefined,
      jsonld: { '@context': 'https://schema.org', '@type': 'Store', name: loja.nome, url: absoluta(c, '/'), description: loja.descricao || undefined },
    },
    <>
      {loja.banner_key ? (
        <a class="banner" href={linkBanner}>
          <picture>
            {loja.banner_celular_key && <source media="(max-width: 640px)" srcset={urlImagem(loja.banner_celular_key)} />}
            <img src={urlImagem(loja.banner_key)} alt={loja.chamada_titulo || loja.nome} />
          </picture>
        </a>
      ) : (
        <section class="chamada">
          <h1>{loja.chamada_titulo || loja.nome}</h1>
          <p>{loja.chamada_texto || loja.descricao || 'Material digital para baixar na hora.'}</p>
          <a class="btn btn--claro" href={linkBanner}>
            Ver os produtos
          </a>
        </section>
      )}

      {cats.length > 0 && (
        <Bloco titulo="Categorias">
          <ul class="categorias">
            {cats.map((k) => (
              <li>
                <a href={ir(base, `/categoria/${k.slug}`)}>
                  <strong>{k.nome}</strong> <span>({contagem.get(k.id) ?? 0})</span>
                </a>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      <Bloco titulo={novidades.results.length ? 'Novidades' : undefined}>
        {novidades.results.length ? (
          <>
            <ul class="grade">
              {novidades.results.map((p) => (
                <CartaoProduto produto={p} loja={loja} base={base} />
              ))}
            </ul>
            <p class="centro">
              <a class="btn btn--vazado" href={ir(base, '/produtos')}>
                Ver a loja inteira
              </a>
            </p>
          </>
        ) : (
          <div class="vazio">
            <h2>Os produtos estão chegando.</h2>
            <p>Volte em breve{loja.instagram ? ` ou acompanhe no Instagram @${loja.instagram}` : ''}.</p>
          </div>
        )}
      </Bloco>

      <Bloco class="bloco--fino">
        <Garantias />
      </Bloco>
    </>,
  )
})

// ── listagem ───────────────────────────────────────────────────────────────

async function listar(c: C, o: { categoria?: Categoria; q?: string }) {
  const loja = c.get('loja')
  const base = c.get('base')
  const conds = [VITRINE]
  const args: unknown[] = [loja.id]
  if (o.categoria) {
    conds.push('categoria_id = ?')
    args.push(o.categoria.id)
  }
  if (o.q) {
    conds.push('(nome LIKE ? OR resumo LIKE ? OR descricao LIKE ?)')
    const t = `%${o.q.replace(/[%_]/g, '')}%`
    args.push(t, t, t)
  }
  const ordem = c.req.query('ordem')
  const orderBy = ordem === 'menor' ? 'preco_centavos ASC' : ordem === 'maior' ? 'preco_centavos DESC' : 'destaque DESC, criado_em DESC'
  const [r, cats] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM produtos WHERE ${conds.join(' AND ')} ORDER BY ${orderBy} LIMIT 300`)
      .bind(...args)
      .all<Produto>(),
    categorias(c),
  ])
  const titulo = o.categoria ? o.categoria.nome : o.q ? `Busca: ${o.q}` : 'Todos os produtos'
  return pagina(
    c,
    {
      titulo,
      descricao: o.categoria ? `${o.categoria.nome} na ${loja.nome}: material digital para baixar na hora.` : `Todos os produtos da ${loja.nome}.`,
      canonica: absoluta(c, o.categoria ? `/categoria/${o.categoria.slug}` : '/produtos'),
      indexar: !o.q,
    },
    <Bloco>
      <nav class="trilha">
        <a href={ir(base, '/')}>Início</a> / <span>{titulo}</span>
      </nav>
      <header class="listagem__topo">
        <h1>{titulo}</h1>
        <form method="get" class="ordem">
          {o.q && <input type="hidden" name="q" value={o.q} />}
          <label>
            Ordenar
            <select name="ordem" data-enviar-ao-mudar>
              <option value="">Relevância</option>
              <option value="menor" selected={ordem === 'menor'}>
                Menor preço
              </option>
              <option value="maior" selected={ordem === 'maior'}>
                Maior preço
              </option>
            </select>
          </label>
          <noscript>
            <button type="submit">Ok</button>
          </noscript>
        </form>
      </header>
      {cats.length > 0 && (
        <nav class="filtros" aria-label="Categorias">
          <a href={ir(base, '/produtos')} class={!o.categoria ? 'ativo' : undefined}>
            Todos
          </a>
          {cats.map((k) => (
            <a href={ir(base, `/categoria/${k.slug}`)} class={o.categoria?.id === k.id ? 'ativo' : undefined}>
              {k.nome}
            </a>
          ))}
        </nav>
      )}
      {r.results.length ? (
        <ul class="grade">
          {r.results.map((p) => (
            <CartaoProduto produto={p} loja={loja} base={base} />
          ))}
        </ul>
      ) : (
        <div class="vazio">
          <h2>{o.q ? `Nada encontrado para “${o.q}”.` : 'Nenhum produto aqui ainda.'}</h2>
          <p>
            <a href={ir(base, '/produtos')}>Ver todos os produtos</a>
          </p>
        </div>
      )}
    </Bloco>,
  )
}

app.get('/produtos', (c) => listar(c, { q: campo(c.req.query('q'), 80) || undefined }))

app.get('/categoria/:slug', async (c) => {
  const k = await c.env.DB.prepare('SELECT * FROM categorias WHERE loja_id = ? AND slug = ?').bind(c.get('loja').id, c.req.param('slug')).first<Categoria>()
  if (!k) return naoEncontrado(c)
  return listar(c, { categoria: k })
})

// ── produto ────────────────────────────────────────────────────────────────

app.get('/produto/:slug', async (c) => {
  const loja = c.get('loja')
  const base = c.get('base')
  const p = await c.env.DB.prepare(`SELECT * FROM produtos WHERE ${VITRINE} AND slug = ?`).bind(loja.id, c.req.param('slug')).first<Produto>()
  if (!p) return naoEncontrado(c)
  const [cat, relacionados] = await Promise.all([
    p.categoria_id ? c.env.DB.prepare('SELECT * FROM categorias WHERE id = ?').bind(p.categoria_id).first<Categoria>() : null,
    c.env.DB.prepare(`SELECT * FROM produtos WHERE ${VITRINE} AND id != ? ORDER BY (categoria_id IS ?) DESC, destaque DESC, criado_em DESC LIMIT 4`)
      .bind(loja.id, p.id, p.categoria_id)
      .all<Produto>(),
  ])
  const imagens = lista(p.imagens)
  const origem = new URL(c.req.url).origin
  const noCarrinho = lerCarrinho(c).includes(p.id)
  const ext = (p.arquivo_nome ?? '').split('.').pop()?.toUpperCase()

  return pagina(
    c,
    {
      titulo: p.nome,
      descricao: p.resumo || resumir(p.descricao) || `${p.nome} — ${loja.nome}`,
      canonica: absoluta(c, `/produto/${p.slug}`),
      imagem: imagens[0] ? `${origem}${urlImagem(imagens[0])}` : undefined,
      jsonld: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.nome,
        description: p.resumo || resumir(p.descricao),
        image: imagens.map((k) => `${origem}${urlImagem(k)}`),
        offers: {
          '@type': 'Offer',
          price: (p.preco_centavos / 100).toFixed(2),
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
          url: absoluta(c, `/produto/${p.slug}`),
        },
      },
    },
    <>
      <Bloco>
        <nav class="trilha">
          <a href={ir(base, '/')}>Início</a> /{' '}
          {cat ? (
            <>
              <a href={ir(base, `/categoria/${cat.slug}`)}>{cat.nome}</a> /{' '}
            </>
          ) : null}
          <span>{p.nome}</span>
        </nav>
        <div class="produto-pagina">
          <div class="galeria" data-galeria>
            <div class="galeria__principal">
              <CapaProduto produto={p} loja={loja} grande />
            </div>
            {imagens.length > 1 && (
              <ul class="galeria__miniaturas">
                {imagens.map((k, i) => (
                  <li>
                    <button type="button" data-imagem={urlImagem(k)} aria-label={`Foto ${i + 1}`} class={i === 0 ? 'ativa' : undefined}>
                      <img src={urlImagem(k)} alt="" loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="compra">
            <h1>{p.nome}</h1>
            <Preco produto={p} grande />
            {p.resumo && <p class="compra__resumo">{p.resumo}</p>}
            <form method="post" action={ir(base, '/carrinho')}>
              <input type="hidden" name="produto" value={p.id} />
              <button class="btn btn--comprar" name="ir" value="carrinho">
                {p.preco_centavos === 0 ? 'Baixar grátis' : 'Comprar agora'}
              </button>
              {!noCarrinho && (
                <button class="btn btn--vazado btn--largo" name="ir" value="ficar">
                  Adicionar ao carrinho
                </button>
              )}
            </form>
            <ul class="compra__fatos">
              <li>
                Arquivo digital{ext ? ` · ${ext}` : ''}
                {p.arquivo_tamanho ? ` · ${tamanhoArquivo(p.arquivo_tamanho)}` : ''}
              </li>
              <li>Liberado na hora, depois do pagamento</li>
              <li>Pix, cartão em até 12× ou boleto</li>
            </ul>
          </div>
        </div>
        {p.descricao && (
          <div class="descricao">
            <h2>Descrição</h2>
            <TextoRico texto={p.descricao} />
          </div>
        )}
      </Bloco>
      {relacionados.results.length > 0 && (
        <Bloco titulo="Você também pode gostar">
          <ul class="grade grade--4">
            {relacionados.results.map((r) => (
              <CartaoProduto produto={r} loja={loja} base={base} />
            ))}
          </ul>
        </Bloco>
      )}
    </>,
  )
})

// ── carrinho e finalização ─────────────────────────────────────────────────

app.post('/carrinho', async (c) => {
  const f = await c.req.parseBody()
  const id = campo(f.produto, 40)
  const base = c.get('base')
  const p = await c.env.DB.prepare(`SELECT id, slug FROM produtos WHERE ${VITRINE} AND id = ?`).bind(c.get('loja').id, id).first<{ id: string; slug: string }>()
  if (!p) return c.redirect(ir(base, '/carrinho'))
  const atual = lerCarrinho(c)
  if (f.remover) {
    gravarCarrinho(c, atual.filter((x) => x !== p.id))
    return c.redirect(ir(base, '/carrinho'))
  }
  if (!atual.includes(p.id)) gravarCarrinho(c, [...atual, p.id])
  return c.redirect(ir(base, f.ir === 'ficar' ? `/produto/${p.slug}?adicionado=1` : '/carrinho'))
})

async function produtosDoCarrinho(c: C): Promise<Produto[]> {
  const ids = lerCarrinho(c)
  if (!ids.length) return []
  const r = await c.env.DB.prepare(`SELECT * FROM produtos WHERE ${VITRINE} AND id IN (${ids.map(() => '?').join(',')})`)
    .bind(c.get('loja').id, ...ids)
    .all<Produto>()
  return r.results
}

function TelaCarrinho({ c, produtos, erro, nome, email, pagamentosOk }: { c: C; produtos: Produto[]; erro?: string; nome?: string; email?: string; pagamentosOk: boolean }) {
  const base = c.get('base')
  const loja = c.get('loja')
  const total = produtos.reduce((s, p) => s + p.preco_centavos, 0)
  if (!produtos.length) {
    return (
      <Bloco>
        <div class="vazio">
          <h1>Seu carrinho está vazio.</h1>
          <p>
            <a class="btn" href={ir(base, '/produtos')}>
              Ver os produtos
            </a>
          </p>
        </div>
      </Bloco>
    )
  }
  const podePagar = total === 0 || pagamentosOk
  return (
    <Bloco>
      <h1>Carrinho</h1>
      <div class="carrinho">
        <ul class="carrinho__itens">
          {produtos.map((p) => (
            <li>
              <a href={ir(base, `/produto/${p.slug}`)} class="carrinho__capa">
                <CapaProduto produto={p} loja={loja} />
              </a>
              <div>
                <a href={ir(base, `/produto/${p.slug}`)}>{p.nome}</a>
                <small>Arquivo digital</small>
              </div>
              <strong>{p.preco_centavos === 0 ? 'Grátis' : reais(p.preco_centavos)}</strong>
              <form method="post" action={ir(base, '/carrinho')}>
                <input type="hidden" name="produto" value={p.id} />
                <button name="remover" value="1" class="carrinho__remover" aria-label={`Remover ${p.nome}`}>
                  ×
                </button>
              </form>
            </li>
          ))}
          <li class="carrinho__total">
            <span>Total</span>
            <strong>{total === 0 ? 'Grátis' : reais(total)}</strong>
          </li>
        </ul>

        <div class="carrinho__finalizar">
          {podePagar ? (
            <form method="post" action={ir(base, '/finalizar')} class="formulario" data-enviando="Indo para o pagamento…">
              <h2>Para quem enviamos os arquivos?</h2>
              {erro && (
                <p class="erro" role="alert">
                  {erro}
                </p>
              )}
              <label>
                Seu nome
                <input name="nome" value={nome ?? ''} required maxlength={80} autocomplete="name" />
              </label>
              <label>
                E-mail
                <input name="email" type="email" value={email ?? ''} required maxlength={200} autocomplete="email" />
              </label>
              <label>
                Confirme o e-mail
                <input name="email2" type="email" required maxlength={200} autocomplete="off" />
              </label>
              <p class="nota">O link dos arquivos chega neste e-mail. Confira com atenção.</p>
              <button class="btn btn--comprar">{total === 0 ? 'Receber meus arquivos' : 'Ir para o pagamento'}</button>
              {total > 0 && <p class="nota centro">Você paga no ambiente seguro do Mercado Pago: Pix, cartão ou boleto.</p>}
              <p class="nota centro">
                Ao continuar, você concorda com os <a href={ir(base, '/termos-de-uso')}>termos de uso</a>.
              </p>
            </form>
          ) : (
            <div class="formulario">
              <h2>Pagamento indisponível</h2>
              <p>Esta loja ainda está ativando os pagamentos online.</p>
              {loja.whatsapp && (
                <a class="btn btn--comprar" href={linkWhatsapp(loja.whatsapp, `Oi! Quero comprar: ${produtos.map((p) => p.nome).join(', ')}`)}>
                  Comprar pelo WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </Bloco>
  )
}

app.get('/carrinho', async (c) => {
  const produtos = await produtosDoCarrinho(c)
  const ok = !!(await contaConectada(c.env, c.get('loja').id))
  return pagina(c, { titulo: 'Carrinho', indexar: false }, <TelaCarrinho c={c} produtos={produtos} pagamentosOk={ok} />)
})

app.post('/finalizar', async (c) => {
  const f = await c.req.parseBody()
  const nome = campo(f.nome, 80)
  const email = campo(f.email, 200).toLowerCase()
  const email2 = campo(f.email2, 200).toLowerCase()
  const produtos = await produtosDoCarrinho(c)
  const ok = !!(await contaConectada(c.env, c.get('loja').id))
  const refazer = (erro: string) => pagina(c, { titulo: 'Carrinho', indexar: false }, <TelaCarrinho c={c} produtos={produtos} erro={erro} nome={nome} email={email} pagamentosOk={ok} />, 422)

  if (nome.length < 2) return refazer('Escreva seu nome.')
  if (!emailValido(email)) return refazer('Esse e-mail parece errado.')
  if (email !== email2) return refazer('Os dois e-mails não são iguais. É por ele que os arquivos chegam.')

  try {
    const { destino } = await criarPedido(c.env, c.get('loja'), produtos.map((p) => p.id), { nome, email }, origemVitrine(c))
    gravarCarrinho(c, [])
    return c.redirect(destino)
  } catch (e) {
    if (e instanceof ErroVenda) return refazer(e.message)
    console.error('[finalizar]', e)
    return refazer('Não conseguimos abrir o pagamento agora. Tente de novo em instantes.')
  }
})

// ── pedido e downloads ─────────────────────────────────────────────────────

app.get('/pedido/:token', async (c) => {
  const loja = c.get('loja')
  const base = c.get('base')
  let pedido = await pedidoPorToken(c.env, loja.id, c.req.param('token'))
  if (!pedido) return naoEncontrado(c)

  // Voltou do checkout ou está esperando: pergunta ao Mercado Pago, sem martelar.
  if (pedido.status === 'pendente' && pedido.total_centavos > 0) {
    const pid = c.req.query('payment_id') ?? c.req.query('collection_id')
    const ultima = pedido.verificado_em ? Date.parse(pedido.verificado_em) : 0
    if ((pid && pid !== pedido.mp_pagamento_id) || Date.now() - ultima > 15_000) {
      try {
        pedido = await sincronizarPedido(c.env, pedido, pid)
      } catch (e) {
        console.error('[pedido] sincronizar', e)
      }
    }
  }
  const itens = await itensDoPedido(c.env, pedido.id)
  const recente = Date.now() - Date.parse(pedido.criado_em) < 3 * 3_600_000
  const esperando = pedido.status === 'pendente'

  return c.html(
    <Vitrine env={c.env} loja={loja} base={base} meta={{ titulo: `Pedido nº ${pedido.numero}`, indexar: false, atualizar: esperando && recente ? 8 : undefined }} carrinho={lerCarrinho(c).length}>
      <Bloco>
        <div class="pedido">
          {pedido.status === 'pago' && (
            <>
              <p class="pedido__selo pedido__selo--ok">Pagamento confirmado</p>
              <h1>Seus arquivos estão prontos, {pedido.cliente_nome.split(' ')[0]}!</h1>
              <p>
                Guarde esta página nos favoritos — ela é o seu acesso aos arquivos. {pedido.email_enviado_em ? `Também mandamos o link para ${pedido.cliente_email}.` : ''}
              </p>
              <ul class="downloads">
                {itens.map((i) => {
                  const esgotou = i.limite_downloads != null && i.downloads >= i.limite_downloads
                  return (
                    <li>
                      <div>
                        <strong>{i.nome}</strong>
                        <small>
                          {i.arquivo_nome}
                          {i.limite_downloads != null ? ` · ${Math.max(0, i.limite_downloads - i.downloads)} de ${i.limite_downloads} downloads restantes` : ''}
                        </small>
                      </div>
                      {esgotou ? (
                        <span class="nota">Limite atingido — fale com a loja</span>
                      ) : (
                        <a class="btn" href={ir(base, `/pedido/${pedido!.token}/baixar/${i.id}`)} rel="nofollow">
                          Baixar
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {esperando && (
            <>
              <p class="pedido__selo">Aguardando pagamento</p>
              <h1>Quase lá!</h1>
              <p>
                {pedido.metodo === 'boleto'
                  ? 'Boleto leva até 3 dias úteis para compensar. Assim que cair, os arquivos aparecem aqui e chegam no seu e-mail.'
                  : 'Assim que o Mercado Pago confirmar, os arquivos aparecem aqui sozinhos e chegam no seu e-mail. Pix costuma levar segundos.'}
              </p>
              {pedido.mp_preferencia_id && (
                <p>
                  <a class="btn btn--comprar" href={`https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${encodeURIComponent(pedido.mp_preferencia_id)}`}>
                    {pedido.mp_status === 'rejected' ? 'Tentar pagar de novo' : 'Ir para o pagamento'}
                  </a>
                </p>
              )}
              {pedido.mp_status === 'rejected' && <p class="erro">O pagamento foi recusado. Tente outro cartão ou pague com Pix.</p>}
              {!recente && (
                <p>
                  <a href="">Atualizar a página</a>
                </p>
              )}
            </>
          )}
          {(pedido.status === 'reembolsado' || pedido.status === 'cancelado') && (
            <>
              <p class="pedido__selo pedido__selo--erro">{pedido.status === 'reembolsado' ? 'Pedido reembolsado' : 'Pedido cancelado'}</p>
              <h1>Este pedido não está mais ativo.</h1>
              <p>Os arquivos deixaram de estar disponíveis. Dúvidas? Fale com a loja.</p>
            </>
          )}
          <dl class="pedido__dados">
            <dt>Pedido</dt>
            <dd>nº {pedido.numero}</dd>
            <dt>Data</dt>
            <dd>{dataHoraBR(pedido.criado_em)}</dd>
            <dt>Total</dt>
            <dd>{pedido.total_centavos === 0 ? 'Grátis' : reais(pedido.total_centavos)}</dd>
          </dl>
          <p class="nota">
            Problema com o arquivo? <a href={ir(base, '/contato')}>Fale com a loja</a> informando o pedido nº {pedido.numero}.
          </p>
        </div>
      </Bloco>
    </Vitrine>,
  )
})

app.get('/pedido/:token/baixar/:item', async (c) => {
  const loja = c.get('loja')
  const pedido = await pedidoPorToken(c.env, loja.id, c.req.param('token'))
  if (!pedido || pedido.status !== 'pago') return naoEncontrado(c)
  const item = await c.env.DB.prepare(
    `SELECT i.*, p.arquivo_key AS atual_key, p.arquivo_nome AS atual_nome
       FROM pedido_itens i LEFT JOIN produtos p ON p.id = i.produto_id
      WHERE i.id = ? AND i.pedido_id = ?`,
  )
    .bind(c.req.param('item'), pedido.id)
    .first<{ id: string; downloads: number; limite_downloads: number | null; arquivo_key: string | null; arquivo_nome: string | null; atual_key: string | null; atual_nome: string | null }>()
  if (!item) return naoEncontrado(c)
  if (item.limite_downloads != null && item.downloads >= item.limite_downloads) {
    return c.text('O limite de downloads deste arquivo foi atingido. Fale com a loja.', 403)
  }
  // Vale o arquivo de agora (a lojista pode ter corrigido); se sumiu, o da compra.
  let key = item.atual_key ?? item.arquivo_key
  let nome = item.atual_key ? item.atual_nome : item.arquivo_nome
  let obj = key ? await c.env.ARQUIVOS.get(key) : null
  if (!obj && item.arquivo_key && item.arquivo_key !== key) {
    key = item.arquivo_key
    nome = item.arquivo_nome
    obj = await c.env.ARQUIVOS.get(key)
  }
  if (!obj) return c.text('Arquivo indisponível no momento. Fale com a loja.', 404)

  // Só conta o download que de fato começou.
  await c.env.DB.prepare('UPDATE pedido_itens SET downloads = downloads + 1 WHERE id = ?').bind(item.id).run()
  const arquivo = (nome ?? 'arquivo').replace(/["\\\r\n]/g, '')
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Length': String(obj.size),
      'Content-Disposition': `attachment; filename="${arquivo.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(arquivo)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  })
})

// ── meus pedidos (sem senha: o link vai para o e-mail) ─────────────────────

function TelaMeusPedidos({ c, msg }: { c: C; msg?: { tipo: 'ok' | 'erro'; texto: string } }) {
  return (
    <Bloco>
      <div class="estreito">
        <h1>Meus pedidos</h1>
        <p>Comprou aqui e perdeu o e-mail com os arquivos? Escreva o e-mail usado na compra e mandamos os links de novo.</p>
        {msg && <p class={msg.tipo === 'ok' ? 'sucesso' : 'erro'}>{msg.texto}</p>}
        <form method="post" class="formulario">
          <label>
            E-mail da compra
            <input name="email" type="email" required maxlength={200} autocomplete="email" />
          </label>
          <button class="btn">Enviar meus links</button>
        </form>
      </div>
    </Bloco>
  )
}

app.get('/meus-pedidos', (c) => pagina(c, { titulo: 'Meus pedidos', indexar: false }, <TelaMeusPedidos c={c} />))

app.post('/meus-pedidos', async (c) => {
  const loja = c.get('loja')
  const email = campo((await c.req.parseBody()).email, 200).toLowerCase()
  if (!emailValido(email)) return pagina(c, { titulo: 'Meus pedidos', indexar: false }, <TelaMeusPedidos c={c} msg={{ tipo: 'erro', texto: 'E-mail inválido.' }} />, 422)
  if (!c.env.RESEND_API_KEY) {
    return pagina(
      c,
      { titulo: 'Meus pedidos', indexar: false },
      <TelaMeusPedidos c={c} msg={{ tipo: 'erro', texto: 'O envio automático está indisponível. Fale com a loja pela página de contato.' }} />,
    )
  }
  const chave = `meus:${loja.id}:${email}`
  if ((await tentativasRecentes(c.env, chave)) < 3) {
    await registrarTentativa(c.env, chave)
    const r = await c.env.DB.prepare(`SELECT * FROM pedidos WHERE loja_id = ? AND cliente_email = ? AND status = 'pago' ORDER BY criado_em DESC LIMIT 20`)
      .bind(loja.id, email)
      .all<Pedido>()
    if (r.results.length) {
      const url = urlDaLoja(c.env, loja)
      await enviarEmail(c.env, {
        para: email,
        nomeRemetente: loja.nome,
        responderPara: loja.email_contato || undefined,
        assunto: `Seus pedidos na ${loja.nome}`,
        html: moldeEmail({
          cor: loja.cor_marca,
          titulo: 'Seus arquivos',
          paragrafos: r.results.map(
            (p) => `<a href="${escaparHtml(`${url}/pedido/${p.token}`)}">Pedido nº ${p.numero}</a> · ${dataHoraBR(p.criado_em)} · ${reais(p.total_centavos)}`,
          ),
          rodape: `${escaparHtml(loja.nome)} · Você recebeu este e-mail porque pediu os links na loja.`,
        }),
      })
    }
  }
  return pagina(
    c,
    { titulo: 'Meus pedidos', indexar: false },
    <TelaMeusPedidos c={c} msg={{ tipo: 'ok', texto: 'Se houver compras com esse e-mail, os links chegam em alguns minutos. Confira o spam.' }} />,
  )
})

// ── páginas institucionais ─────────────────────────────────────────────────

const INSTITUCIONAIS: Record<string, { titulo: string; corpo: (l: Loja, base: string) => any }> = {
  'politica-de-privacidade': { titulo: 'Política de privacidade', corpo: (l, b) => <Privacidade l={l} base={b} /> },
  'politica-de-reembolso': { titulo: 'Política de reembolso', corpo: (l, b) => <Reembolso l={l} base={b} /> },
  'termos-de-uso': { titulo: 'Termos de uso', corpo: (l, b) => <Termos l={l} base={b} /> },
  contato: { titulo: 'Contato', corpo: (l, b) => <Contato l={l} base={b} /> },
}

app.get('/sobre', (c) => {
  const l = c.get('loja')
  if (!l.sobre.trim()) return naoEncontrado(c)
  return pagina(
    c,
    { titulo: `Sobre a ${l.nome}`, descricao: resumir(l.sobre), canonica: absoluta(c, '/sobre') },
    <Bloco>
      <article class="texto">
        <h1>Sobre a {l.nome}</h1>
        <TextoRico texto={l.sobre} />
        <h2>Como funciona a compra</h2>
        <p>
          Você escolhe o material, paga por Pix, cartão ou boleto, e recebe o arquivo na hora em que o pagamento é confirmado. Não tem frete, porque não tem entrega
          física.
        </p>
        <p>
          <a href={ir(c.get('base'), '/contato')}>Fale com a gente</a>
        </p>
      </article>
    </Bloco>,
  )
})

app.get('/:pagina{politica-de-privacidade|politica-de-reembolso|termos-de-uso|contato}', (c) => {
  const p = INSTITUCIONAIS[c.req.param('pagina')]!
  const l = c.get('loja')
  return pagina(
    c,
    { titulo: p.titulo, canonica: absoluta(c, `/${c.req.param('pagina')}`) },
    <Bloco>
      <article class="texto">
        <h1>{p.titulo}</h1>
        {p.corpo(l, c.get('base'))}
      </article>
    </Bloco>,
  )
})

// ── para o Google ──────────────────────────────────────────────────────────

app.get('/robots.txt', (c) => {
  const s = situacao(c.get('loja'))
  const corpo = s.noAr
    ? `User-agent: *\nDisallow: /carrinho\nDisallow: /pedido/\nDisallow: /meus-pedidos\nSitemap: ${absoluta(c, '/sitemap.xml')}\n`
    : 'User-agent: *\nDisallow: /\n'
  return c.text(corpo)
})

app.get('/sitemap.xml', async (c) => {
  const loja = c.get('loja')
  const [ps, cats] = await Promise.all([
    c.env.DB.prepare(`SELECT slug, atualizado_em FROM produtos WHERE ${VITRINE}`).bind(loja.id).all<{ slug: string; atualizado_em: string }>(),
    categorias(c),
  ])
  const urls = [
    { loc: absoluta(c, '/'), mod: loja.atualizada_em },
    { loc: absoluta(c, '/produtos') },
    ...cats.map((k) => ({ loc: absoluta(c, `/categoria/${k.slug}`) })),
    ...ps.results.map((p) => ({ loc: absoluta(c, `/produto/${p.slug}`), mod: p.atualizado_em })),
    ...(loja.sobre ? [{ loc: absoluta(c, '/sobre') }] : []),
    { loc: absoluta(c, '/contato') },
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `<url><loc>${escaparHtml(u.loc)}</loc>${u.mod ? `<lastmod>${u.mod.slice(0, 10)}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>`
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

function naoEncontrado(c: C) {
  const base = c.get('base')
  return pagina(
    c,
    { titulo: 'Página não encontrada', indexar: false },
    <Bloco>
      <div class="vazio">
        <h1>Não encontramos esta página.</h1>
        <p>
          <a class="btn" href={ir(base, '/produtos')}>
            Ver os produtos
          </a>
        </p>
      </div>
    </Bloco>,
    404,
  )
}

app.notFound((c) => naoEncontrado(c as C))

export default app
