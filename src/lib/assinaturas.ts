/**
 * A mensalidade da plataforma, cobrada pelo Stripe na conta da Lojinha Pronta.
 * (As vendas das lojas continuam no Mercado Pago de cada lojista — ver pedidos.ts.)
 *
 * Fluxo: a lojista escolhe o plano → Checkout do Stripe → o Stripe avisa
 * (webhook) e a volta do checkout também confere → a loja guarda o estado.
 * Trocar cartão e ver faturas é no portal do Stripe; trocar de plano e
 * cancelar é aqui no painel.
 */
import type { Env, Loja, Plano } from '../tipos'
import { agora } from './formato'
import {
  alterarAssinaturaStripe,
  buscarAssinaturaStripe,
  buscarCheckout,
  criarCheckout,
  fimDoPeriodo,
  precoDoPlano,
  stripeLigado,
  urlPortal,
  type AssinaturaStripe,
} from './stripe'

/** Status do Stripe em que a loja fica no ar. past_due: o Stripe ainda está tentando cobrar. */
export const STATUS_EM_DIA = ['active', 'trialing', 'past_due']

/** Abre o Checkout do Stripe. Se ainda há teste grátis, a 1ª cobrança só acontece quando ele acaba. */
export async function iniciarAssinatura(env: Env, loja: Loja, plano: Plano, emailDono: string, appUrl: string): Promise<string> {
  const preco = await precoDoPlano(env, plano)
  // O Checkout exige período de teste de pelo menos 48 h; menos que isso, cobra já.
  const fimTeste = Math.floor(Date.parse(loja.teste_ate) / 1000)
  const comTeste = fimTeste - Date.now() / 1000 > 49 * 3600
  const s = await criarCheckout(env, {
    mode: 'subscription',
    line_items: [{ price: preco, quantity: 1 }],
    client_reference_id: loja.id,
    customer: loja.stripe_cliente_id ?? undefined,
    customer_email: loja.stripe_cliente_id ? undefined : emailDono,
    metadata: { loja_id: loja.id, plano_id: plano.id },
    subscription_data: {
      metadata: { loja_id: loja.id, plano_id: plano.id },
      description: `${plano.nome} — ${loja.nome}`.slice(0, 200),
      trial_end: comTeste ? fimTeste : undefined,
    },
    allow_promotion_codes: 'true',
    locale: 'pt-BR',
    success_url: `${appUrl}/painel/plano?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/painel/plano`,
  })
  return s.url
}

/** Volta do Checkout: confere a sessão e traz a assinatura, sem esperar o webhook. */
export async function concluirCheckout(env: Env, loja: Loja, sessaoId: string): Promise<boolean> {
  const s = await buscarCheckout(env, sessaoId)
  if (s.client_reference_id !== loja.id || !s.subscription) return false
  await sincronizarAssinatura(env, s.subscription)
  return true
}

/** Traz a assinatura do Stripe para a loja dona dela. */
export async function sincronizarAssinatura(env: Env, assinaturaId: string): Promise<AssinaturaStripe | null> {
  const a = await buscarAssinaturaStripe(env, assinaturaId)
  return aplicarAssinatura(env, a)
}

async function aplicarAssinatura(env: Env, a: AssinaturaStripe): Promise<AssinaturaStripe | null> {
  const lojaId = a.metadata?.loja_id
  if (!lojaId) return null
  const loja = await env.DB.prepare('SELECT * FROM lojas WHERE id = ?').bind(lojaId).first<Loja>()
  if (!loja) return null

  const emDia = STATUS_EM_DIA.includes(a.status)
  // Uma assinatura antiga encerrada não derruba a nova que está em dia.
  if (loja.assinatura_id && loja.assinatura_id !== a.id && STATUS_EM_DIA.includes(loja.assinatura_status ?? '') && !emDia) {
    return a
  }
  await env.DB.prepare(
    `UPDATE lojas SET stripe_cliente_id = ?, assinatura_id = ?, assinatura_status = ?, assinatura_valida_ate = ?,
       assinatura_cancelada = ?, assinatura_atrasada_desde = ?, plano_id = ?, atualizada_em = ? WHERE id = ?`,
  )
    .bind(
      a.customer,
      a.id,
      a.status,
      fimDoPeriodo(a) ?? loja.assinatura_valida_ate,
      a.cancel_at_period_end ? 1 : 0,
      a.status === 'past_due' ? (loja.assinatura_status === 'past_due' && loja.assinatura_atrasada_desde) || agora() : null,
      emDia ? (a.metadata?.plano_id ?? loja.plano_id) : loja.plano_id,
      agora(),
      loja.id,
    )
    .run()
  return a
}

/** Troca de plano no mesmo cartão. O valor novo vale a partir da próxima cobrança. */
export async function trocarPlano(env: Env, loja: Loja, plano: Plano): Promise<void> {
  if (!loja.assinatura_id) throw new Error('sem assinatura')
  const a = await buscarAssinaturaStripe(env, loja.assinatura_id)
  const item = a.items.data[0]
  if (!item) throw new Error('assinatura sem item')
  const novo = await alterarAssinaturaStripe(env, a.id, {
    items: [{ id: item.id, price: await precoDoPlano(env, plano) }],
    proration_behavior: 'none',
    metadata: { loja_id: loja.id, plano_id: plano.id },
  })
  await aplicarAssinatura(env, novo)
}

/** Cancela no fim do período já pago: a loja fica no ar até lá. */
export async function cancelarAssinatura(env: Env, loja: Loja): Promise<void> {
  if (!loja.assinatura_id) return
  await aplicarAssinatura(env, await alterarAssinaturaStripe(env, loja.assinatura_id, { cancel_at_period_end: 'true' }))
}

/** Desfaz o cancelamento enquanto o período pago não acabou. */
export async function reativarAssinatura(env: Env, loja: Loja): Promise<void> {
  if (!loja.assinatura_id) return
  await aplicarAssinatura(env, await alterarAssinaturaStripe(env, loja.assinatura_id, { cancel_at_period_end: 'false' }))
}

/** Portal do Stripe: trocar cartão, ver e baixar faturas. */
export async function portalDeCobranca(env: Env, loja: Loja, appUrl: string): Promise<string | null> {
  if (!loja.stripe_cliente_id) return null
  return urlPortal(env, loja.stripe_cliente_id, `${appUrl}/painel/plano`)
}

/** Webhook do Stripe, com assinatura já conferida. Devolve o que foi feito, para o registro. */
export async function tratarAvisoStripe(env: Env, evento: { type: string; data: { object: any } }): Promise<string> {
  const o = evento.data.object
  if (evento.type === 'checkout.session.completed' && o.mode === 'subscription' && o.subscription) {
    const a = await sincronizarAssinatura(env, o.subscription)
    return a ? `checkout → assinatura ${a.status}` : 'checkout sem loja'
  }
  if (evento.type.startsWith('customer.subscription.')) {
    // Consulta de novo em vez de usar o objeto do aviso: avisos chegam fora de ordem.
    const a = await sincronizarAssinatura(env, o.id)
    return a ? `assinatura ${a.status}${a.cancel_at_period_end ? ' (cancela no fim)' : ''}` : 'assinatura sem loja'
  }
  if (evento.type === 'invoice.paid' || evento.type === 'invoice.payment_failed') {
    const sub = o.subscription ?? o.parent?.subscription_details?.subscription
    if (sub) {
      const a = await sincronizarAssinatura(env, sub)
      return `fatura ${evento.type === 'invoice.paid' ? 'paga' : 'recusada'} → assinatura ${a?.status}`
    }
  }
  return 'ignorado'
}

/** Cron: confere toda assinatura que não está encerrada, caso algum aviso tenha se perdido. */
export async function reconciliarAssinaturas(env: Env): Promise<number> {
  if (!stripeLigado(env)) return 0
  const r = await env.DB.prepare(
    `SELECT assinatura_id FROM lojas WHERE assinatura_id IS NOT NULL
       AND assinatura_status NOT IN ('canceled', 'incomplete_expired') AND atualizada_em < ? LIMIT 100`,
  )
    .bind(new Date(Date.now() - 20 * 3_600_000).toISOString())
    .all<{ assinatura_id: string }>()
  let n = 0
  for (const l of r.results) {
    try {
      await sincronizarAssinatura(env, l.assinatura_id)
      n++
    } catch (e) {
      console.error(`[cron] assinatura ${l.assinatura_id}:`, e)
    }
  }
  return n
}
