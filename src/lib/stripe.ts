/**
 * Cliente mínimo da API do Stripe, só para a mensalidade da plataforma:
 * Checkout de assinatura, consulta e alteração da assinatura, portal de
 * cobrança (trocar cartão, ver faturas) e conferência da assinatura do webhook.
 *
 * Sem SDK: o Stripe é uma API de formulário (application/x-www-form-urlencoded)
 * com chaves aninhadas — `line_items[0][price]` — e isso cabe em 20 linhas.
 */
import type { Env, Plano } from '../tipos'

let API = 'https://api.stripe.com'

/** Só para teste local: aponta para um Stripe de mentira (STRIPE_API_TESTE no .dev.vars). */
export function usarStripeDeTeste(url: string | undefined) {
  if (url && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) API = url
}

export class ErroStripe extends Error {
  constructor(
    public status: number,
    public corpo: any,
  ) {
    super(`Stripe respondeu ${status}: ${corpo?.error?.message ?? JSON.stringify(corpo).slice(0, 300)}`)
  }
}

export function stripeLigado(env: Env): boolean {
  return !!env.STRIPE_SECRET_KEY
}

/** { a: { b: [1, 2] } } → a[b][0]=1&a[b][1]=2 */
function formulario(obj: Record<string, unknown>, prefixo = '', saida = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    const chave = prefixo ? `${prefixo}[${k}]` : k
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === 'object') formulario(item as Record<string, unknown>, `${chave}[${i}]`, saida)
        else saida.append(`${chave}[${i}]`, String(item))
      })
    } else if (typeof v === 'object') {
      formulario(v as Record<string, unknown>, chave, saida)
    } else {
      saida.append(chave, String(v))
    }
  }
  return saida
}

async function chamar<T>(env: Env, metodo: 'GET' | 'POST', caminho: string, dados?: Record<string, unknown>, idempotencia?: string): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY não configurada: a cobrança da mensalidade está desligada.')
  const headers: Record<string, string> = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  let url = `${API}${caminho}`
  let body: string | undefined
  if (dados && metodo === 'GET') url += `${url.includes('?') ? '&' : '?'}${formulario(dados)}`
  if (dados && metodo === 'POST') {
    body = formulario(dados).toString()
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  if (idempotencia) headers['Idempotency-Key'] = idempotencia
  // Sem resposta em 15 s, desiste; a chave de idempotência torna seguro tentar de novo.
  const r = await fetch(url, { method: metodo, headers, body, signal: AbortSignal.timeout(15_000) })
  const json: any = await r.json().catch(() => ({}))
  if (!r.ok) throw new ErroStripe(r.status, json)
  return json as T
}

// ── preço de cada plano ────────────────────────────────────────────────────

type Preco = { id: string; unit_amount: number; currency: string }

/**
 * O preço do plano no Stripe, criado na primeira vez que alguém assina.
 * A chave de busca leva o valor: mudou o preço no banco, nasce um preço novo
 * no Stripe, e quem já assina continua no antigo até trocar de plano.
 */
export async function precoDoPlano(env: Env, plano: Plano): Promise<string> {
  const chave = `lojinha_${plano.id}_${plano.preco_centavos}_brl_mes`
  const achados = await chamar<{ data: Preco[] }>(env, 'GET', '/v1/prices', { lookup_keys: [chave], active: 'true', limit: 1 })
  if (achados.data[0]) return achados.data[0].id
  const novo = await chamar<Preco>(
    env,
    'POST',
    '/v1/prices',
    {
      currency: 'brl',
      unit_amount: plano.preco_centavos,
      recurring: { interval: 'month' },
      lookup_key: chave,
      product_data: { name: `Lojinha Pronta ${plano.nome}`, metadata: { plano_id: plano.id } },
      metadata: { plano_id: plano.id },
    },
    `preco-${chave}`,
  )
  return novo.id
}

// ── checkout e portal ──────────────────────────────────────────────────────

export type SessaoCheckout = {
  id: string
  url: string
  client_reference_id: string | null
  customer: string | null
  subscription: string | null
  status: string
  metadata: Record<string, string>
}

export function criarCheckout(env: Env, dados: Record<string, unknown>, idempotencia?: string): Promise<SessaoCheckout> {
  return chamar<SessaoCheckout>(env, 'POST', '/v1/checkout/sessions', dados, idempotencia)
}

export function buscarCheckout(env: Env, id: string): Promise<SessaoCheckout> {
  return chamar<SessaoCheckout>(env, 'GET', `/v1/checkout/sessions/${encodeURIComponent(id)}`)
}

export async function urlPortal(env: Env, cliente: string, voltar: string): Promise<string> {
  const s = await chamar<{ url: string }>(env, 'POST', '/v1/billing_portal/sessions', { customer: cliente, return_url: voltar, locale: 'pt-BR' })
  return s.url
}

// ── assinatura ─────────────────────────────────────────────────────────────

export type AssinaturaStripe = {
  id: string
  status: string // trialing | active | past_due | canceled | unpaid | incomplete | incomplete_expired | paused
  customer: string
  cancel_at_period_end: boolean
  current_period_end?: number
  trial_end: number | null
  metadata: Record<string, string>
  items: { data: { id: string; current_period_end?: number; price: { id: string; unit_amount: number } }[] }
}

export function buscarAssinaturaStripe(env: Env, id: string): Promise<AssinaturaStripe> {
  return chamar<AssinaturaStripe>(env, 'GET', `/v1/subscriptions/${encodeURIComponent(id)}`)
}

export function alterarAssinaturaStripe(env: Env, id: string, dados: Record<string, unknown>): Promise<AssinaturaStripe> {
  return chamar<AssinaturaStripe>(env, 'POST', `/v1/subscriptions/${encodeURIComponent(id)}`, dados)
}

/** Desde a versão 2025-03-31 da API o fim do período mora no item, não na assinatura. */
export function fimDoPeriodo(a: AssinaturaStripe): string | null {
  const s = a.current_period_end ?? a.items?.data?.[0]?.current_period_end
  return s ? new Date(s * 1000).toISOString() : null
}

// ── webhook ────────────────────────────────────────────────────────────────

const enc = new TextEncoder()

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Confere o cabeçalho Stripe-Signature (t=…,v1=…): HMAC-SHA256 de "t.corpo"
 * com o segredo do webhook, e no máximo 5 minutos de idade contra replay.
 */
export async function assinaturaDoAvisoValida(segredo: string, cabecalho: string | null | undefined, corpo: string): Promise<boolean> {
  if (!segredo || !cabecalho) return false
  const partes = cabecalho.split(',').map((p) => p.split('=') as [string, string])
  const t = partes.find(([k]) => k === 't')?.[1]
  const v1 = partes.filter(([k]) => k === 'v1').map(([, v]) => v)
  if (!t || !v1.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
  const chave = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const esperado = hex(await crypto.subtle.sign('HMAC', chave, enc.encode(`${t}.${corpo}`)))
  return v1.some((v) => v.length === esperado.length && [...v].reduce((d, ch, i) => d | (ch.charCodeAt(0) ^ esperado.charCodeAt(i)), 0) === 0)
}
