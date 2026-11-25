/**
 * Avisos de pagamento.
 *
 *   /webhooks/mercadopago?loja=<id>   venda de uma loja (o endereço vai em cada cobrança)
 *   /webhooks/stripe                  mensalidade da plataforma (cadastrado no painel do Stripe)
 *
 * Nenhum corpo de aviso é prova de nada. O do Mercado Pago só diz QUAL
 * pagamento olhar, e a resposta vem da consulta à API. O do Stripe tem a
 * assinatura HMAC conferida e, mesmo assim, a assinatura é consultada de novo.
 */
import { Hono } from 'hono'
import type { Env, Pedido } from './tipos'
import { agora } from './lib/formato'
import { buscarPagamento } from './lib/mercadopago'
import { contaDaLoja } from './lib/conta-mp'
import { sincronizarPedido } from './lib/pedidos'
import { tratarAvisoStripe } from './lib/assinaturas'
import { assinaturaDoAvisoValida } from './lib/stripe'

const app = new Hono<{ Bindings: Env }>()

async function registrar(env: Env, origem: string, tipo: string | null, id: string | null, corpo: string, resultado: string) {
  try {
    await env.DB.prepare('INSERT INTO avisos_mp (origem, tipo, recurso_id, corpo, resultado, criado_em) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(origem, tipo, id, corpo.slice(0, 4000), resultado.slice(0, 500), agora())
      .run()
  } catch {}
}

app.post('/mercadopago', async (c) => {
  const url = new URL(c.req.url)
  const texto = await c.req.text()
  let corpo: any = {}
  try {
    corpo = JSON.parse(texto || '{}')
  } catch {}

  // Dois formatos convivem: o webhook novo ({type, data:{id}}) e o IPN antigo (?topic=&id=).
  const tipo: string | null = corpo.type ?? corpo.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
  const id: string | null = String(corpo.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '') || null
  const lojaId = url.searchParams.get('loja')
  const env = c.env

  const trabalho = (async () => {
    let resultado = 'ignorado'
    try {
      if (lojaId && id && tipo === 'payment' && /^\d{1,20}$/.test(id)) {
        const conta = await contaDaLoja(env, lojaId)
        if (!conta) resultado = 'loja sem conta'
        else {
          const pg = await buscarPagamento(conta.token, id)
          const pedido = pg.external_reference
            ? await env.DB.prepare('SELECT * FROM pedidos WHERE id = ? AND loja_id = ?').bind(pg.external_reference, lojaId).first<Pedido>()
            : null
          if (!pedido) resultado = `pagamento ${pg.status} sem pedido`
          else {
            const novo = await sincronizarPedido(env, pedido, id)
            resultado = `pedido ${pedido.numero}: ${novo.status} (${pg.status})`
          }
        }
      }
    } catch (e) {
      resultado = `erro: ${(e as Error).message}`
      console.error('[webhook]', e)
    }
    await registrar(env, lojaId ? `loja:${lojaId}` : 'plataforma', tipo, id, texto, resultado)
  })()

  // Responde rápido: o Mercado Pago reenvia se demorar. O trabalho continua depois.
  c.executionCtx.waitUntil(trabalho)
  return c.text('ok')
})

app.post('/stripe', async (c) => {
  const corpo = await c.req.text()
  const segredo = c.env.STRIPE_WEBHOOK_SECRET
  if (!segredo || !(await assinaturaDoAvisoValida(segredo, c.req.header('stripe-signature'), corpo))) {
    return c.text('assinatura inválida', 400)
  }
  const evento = JSON.parse(corpo)
  const env = c.env
  c.executionCtx.waitUntil(
    (async () => {
      let resultado: string
      try {
        resultado = await tratarAvisoStripe(env, evento)
      } catch (e) {
        resultado = `erro: ${(e as Error).message}`
        console.error('[webhook stripe]', e)
      }
      await registrar(env, 'stripe', evento.type ?? null, evento.data?.object?.id ?? null, corpo, resultado)
    })(),
  )
  return c.json({ recebido: true })
})

// Alguns avisos antigos chegam por GET.
app.get('/mercadopago', (c) => c.text('ok'))

export default app
