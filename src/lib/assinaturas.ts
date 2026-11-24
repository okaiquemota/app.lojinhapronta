/**
 * A mensalidade da plataforma: assinatura recorrente no cartão pelo Mercado Pago,
 * cobrada na conta da Lojinha Pronta (MP_ACCESS_TOKEN).
 */
import type { Env, Loja, Plano } from '../tipos'
import { agora } from './formato'
import { alterarAssinatura, buscarAssinatura, criarAssinatura, type Assinatura } from './mercadopago'

function tokenDaPlataforma(env: Env): string {
  if (!env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado: a cobrança da mensalidade está desligada.')
  return env.MP_ACCESS_TOKEN
}

/** Gera o link de assinatura. Se ainda está no teste grátis, a 1ª cobrança só acontece quando ele acaba. */
export async function iniciarAssinatura(env: Env, loja: Loja, plano: Plano, emailPagador: string, urlVolta: string): Promise<string> {
  const inicio = Date.parse(loja.teste_ate) - Date.now() > 3_600_000 ? loja.teste_ate : undefined
  const a = await criarAssinatura(tokenDaPlataforma(env), {
    reason: `Lojinha Pronta ${plano.nome} — ${loja.nome}`.slice(0, 120),
    external_reference: `${loja.id}|${plano.id}`,
    payer_email: emailPagador,
    back_url: urlVolta,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: plano.preco_centavos / 100,
      currency_id: 'BRL',
      start_date: inicio,
    },
    status: 'pending',
  })
  // Guarda já: se a pessoa pagar e o aviso atrasar, o cron e a volta acham por aqui.
  await env.DB.prepare('UPDATE lojas SET assinatura_id = ?, assinatura_status = ?, atualizada_em = ? WHERE id = ? AND (assinatura_status IS NULL OR assinatura_status != ?)')
    .bind(a.id, a.status, agora(), loja.id, 'authorized')
    .run()
  return a.init_point
}

/** Traz a assinatura do Mercado Pago para a loja. Devolve a loja atualizada (ou null). */
export async function sincronizarAssinatura(env: Env, assinaturaId: string): Promise<Assinatura | null> {
  const a = await buscarAssinatura(tokenDaPlataforma(env), assinaturaId)
  const [lojaId, planoId] = (a.external_reference ?? '').split('|')
  if (!lojaId) return null
  const loja = await env.DB.prepare('SELECT * FROM lojas WHERE id = ?').bind(lojaId).first<Loja>()
  if (!loja) return null

  // Uma assinatura pendente antiga não pode derrubar uma autorizada mais nova.
  if (loja.assinatura_id && loja.assinatura_id !== a.id && loja.assinatura_status === 'authorized' && a.status !== 'authorized') {
    return a
  }

  const validaAte = a.next_payment_date ?? loja.assinatura_valida_ate
  if (a.status === 'authorized') {
    await env.DB.prepare(
      `UPDATE lojas SET assinatura_id = ?, assinatura_status = 'authorized', assinatura_valida_ate = ?, plano_id = ?, atualizada_em = ? WHERE id = ?`,
    )
      .bind(a.id, validaAte, planoId || loja.plano_id, agora(), loja.id)
      .run()
  } else {
    await env.DB.prepare('UPDATE lojas SET assinatura_id = ?, assinatura_status = ?, assinatura_valida_ate = ?, atualizada_em = ? WHERE id = ?')
      .bind(a.id, a.status, validaAte, agora(), loja.id)
      .run()
  }
  return a
}

/** Troca de plano mantendo o mesmo cartão: muda o valor da assinatura existente. */
export async function trocarPlano(env: Env, loja: Loja, plano: Plano): Promise<void> {
  if (!loja.assinatura_id) throw new Error('sem assinatura')
  await alterarAssinatura(tokenDaPlataforma(env), loja.assinatura_id, {
    reason: `Lojinha Pronta ${plano.nome} — ${loja.nome}`.slice(0, 120),
    external_reference: `${loja.id}|${plano.id}`,
    auto_recurring: { transaction_amount: plano.preco_centavos / 100, currency_id: 'BRL' },
  })
  await env.DB.prepare('UPDATE lojas SET plano_id = ?, atualizada_em = ? WHERE id = ?').bind(plano.id, agora(), loja.id).run()
}

export async function cancelarAssinatura(env: Env, loja: Loja): Promise<void> {
  if (!loja.assinatura_id) return
  await alterarAssinatura(tokenDaPlataforma(env), loja.assinatura_id, { status: 'cancelled' })
  await sincronizarAssinatura(env, loja.assinatura_id)
}

/** Cron: confere toda assinatura que não está parada. */
export async function reconciliarAssinaturas(env: Env): Promise<number> {
  if (!env.MP_ACCESS_TOKEN) return 0
  const ontem = new Date(Date.now() - 20 * 3_600_000).toISOString()
  const r = await env.DB.prepare(
    `SELECT assinatura_id FROM lojas WHERE assinatura_id IS NOT NULL AND assinatura_status IN ('pending','authorized','paused')
       AND atualizada_em < ? LIMIT 100`,
  )
    .bind(ontem)
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
