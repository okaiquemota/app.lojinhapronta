/**
 * Lojinha Pronta — um Worker só para a plataforma inteira.
 *
 *   app.lojinhapronta.com.br        painel, cadastro, assinatura, avisos do MP
 *   <loja>.lojinhapronta.com.br     vitrine da loja
 *   dominiodaloja.com.br            vitrine da loja (domínio próprio)
 *   …/loja/<slug>/…                 vitrine pelo caminho, enquanto não há DNS
 *   …/i/<loja>/<arquivo>            imagens públicas, em qualquer endereço
 *   …/_lp/<arquivo>                 CSS, JS e ícones, em qualquer endereço
 */
import { Hono } from 'hono'
import type { Env } from './tipos'
import publico from './plataforma/publico'
import painel from './plataforma/painel'
import admin from './plataforma/admin'
import webhooks from './webhooks'
import vitrine from './loja'
import { resolverHost } from './lib/dominio'
import { servirImagem } from './lib/arquivos'
import { servirEstatico } from './estaticos'
import { renovarTokensVencendo } from './lib/conta-mp'
import { reconciliarPendentes } from './lib/pedidos'
import { reconciliarAssinaturas } from './lib/assinaturas'
import { usarApiDeTeste } from './lib/mercadopago'
import { usarStripeDeTeste } from './lib/stripe'
import { cabecalhosPlataforma } from './lib/cabecalhos'
import { PaginaErro } from './plataforma/layout'

const plataforma = new Hono<{ Bindings: Env }>()

plataforma.use('*', cabecalhosPlataforma)

// Formulário enviado de outro site não age em nome de quem está logado.
plataforma.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && !c.req.path.startsWith('/webhooks/')) {
    const origem = c.req.header('origin')
    if (origem && origem !== new URL(c.req.url).origin) return c.text('Origem não permitida', 403)
  }
  await next()
})

plataforma.route('/', publico)
plataforma.route('/painel', painel)
plataforma.route('/admin', admin)
plataforma.route('/webhooks', webhooks)
plataforma.notFound((c) =>
  c.html(<PaginaErro titulo="Página não encontrada" texto="O endereço pode ter mudado ou o item foi excluído." />, 404),
)
plataforma.onError((e, c) => {
  console.error('[plataforma]', e)
  return c.html(<PaginaErro titulo="Algo deu errado" texto="O erro foi do nosso lado. Tente de novo em instantes." />, 500)
})

vitrine.onError((e, c) => {
  console.error('[vitrine]', e)
  return c.text('Algo deu errado do nosso lado. Tente de novo em instantes.', 500)
})

/** Repassa a requisição para a vitrine dizendo qual loja e qual prefixo de link. */
function paraVitrine(req: Request, caminho: string, alvo: { slug?: string; dominio?: string; base: string }, env: Env, ctx: ExecutionContext) {
  const url = new URL(req.url)
  url.pathname = caminho || '/'
  const headers = new Headers(req.headers)
  for (const h of ['x-lp-slug', 'x-lp-dominio', 'x-lp-base']) headers.delete(h)
  if (alvo.slug) headers.set('x-lp-slug', alvo.slug)
  if (alvo.dominio) headers.set('x-lp-dominio', alvo.dominio)
  headers.set('x-lp-base', alvo.base)
  return vitrine.fetch(new Request(url, { method: req.method, headers, body: req.body, redirect: 'manual' }), env, ctx)
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    usarApiDeTeste(env.MP_API_TESTE)
    usarStripeDeTeste(env.STRIPE_API_TESTE)
    const url = new URL(req.url)

    if (url.pathname.startsWith('/_lp/')) return servirEstatico(url.pathname.slice(5), url.searchParams.get('v'))
    if (url.pathname.startsWith('/i/')) return servirImagem(env, url.pathname.slice(3), req)

    // Domínio principal: www vai para a raiz; a raiz mostra a apresentação, e o
    // resto (cadastro, entrar, painel) mora em app., onde fica a sessão.
    const host = url.hostname.toLowerCase()
    const raiz = env.DOMINIO_RAIZ.toLowerCase()
    if (host === `www.${raiz}`) return Response.redirect(`https://${raiz}${url.pathname}${url.search}`, 301)
    if (host === raiz && url.pathname !== '/') return Response.redirect(`${env.APP_URL}${url.pathname}${url.search}`, 301)

    const alvo = resolverHost(url.hostname, env)
    if (alvo) {
      // A vitrine num subdomínio não tem painel: /painel ali é página de loja.
      return paraVitrine(req, url.pathname, alvo, env, ctx)
    }

    const m = url.pathname.match(/^\/loja\/([a-z0-9-]{3,40})(\/.*)?$/)
    if (m) {
      const slug = m[1]!
      // Com os subdomínios ligados, o endereço antigo leva ao novo.
      if (env.SUBDOMINIOS_ATIVOS === 'sim' && req.method === 'GET') {
        return Response.redirect(`https://${slug}.${env.DOMINIO_RAIZ}${m[2] ?? '/'}${url.search}`, 301)
      }
      return paraVitrine(req, m[2] ?? '/', { slug, base: `/loja/${slug}` }, env, ctx)
    }

    return plataforma.fetch(req, env, ctx)
  },

  async scheduled(_evento: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    usarApiDeTeste(env.MP_API_TESTE)
    usarStripeDeTeste(env.STRIPE_API_TESTE)
    ctx.waitUntil(
      (async () => {
        const agora = new Date().toISOString()
        await env.DB.batch([
          env.DB.prepare('DELETE FROM sessoes WHERE expira_em < ?').bind(agora),
          env.DB.prepare('DELETE FROM redefinicoes_senha WHERE expira_em < ?').bind(agora),
          env.DB.prepare('DELETE FROM tentativas_login WHERE criado_em < ?').bind(new Date(Date.now() - 86_400_000).toISOString()),
          env.DB.prepare('DELETE FROM avisos_mp WHERE criado_em < ?').bind(new Date(Date.now() - 90 * 86_400_000).toISOString()),
        ])
        const tokens = await renovarTokensVencendo(env)
        const pedidos = await reconciliarPendentes(env)
        const assinaturas = await reconciliarAssinaturas(env)
        console.log(`[cron] tokens renovados=${tokens} pedidos pagos achados=${pedidos} assinaturas conferidas=${assinaturas}`)
      })(),
    )
  },
} satisfies ExportedHandler<Env>
