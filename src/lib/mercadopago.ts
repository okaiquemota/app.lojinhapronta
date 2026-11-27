/**
 * Cliente mínimo da API do Mercado Pago, usado nas vendas das lojistas.
 * (A mensalidade da plataforma é no Stripe: src/lib/stripe.ts.)
 *
 * - Checkout Pro (preferência) para a venda da lojista — Pix, cartão e boleto
 * - consulta de pagamento, que é a ÚNICA fonte de verdade para liberar arquivo
 * - OAuth, para a lojista conectar a conta dela com um botão
 */

let API = 'https://api.mercadopago.com'

/** Só para teste local: aponta para um Mercado Pago de mentira (MP_API_TESTE no .dev.vars). */
export function usarApiDeTeste(url: string | undefined) {
  if (url && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) API = url
}

export class ErroMP extends Error {
  constructor(
    public status: number,
    public corpo: unknown,
  ) {
    super(`Mercado Pago respondeu ${status}: ${JSON.stringify(corpo).slice(0, 400)}`)
  }
}

/** Sem resposta em 15 s, desiste: quem chamou trata o erro como "tente de novo". */
const TEMPO_LIMITE = 15_000

async function chamar<T>(token: string, metodo: string, caminho: string, corpo?: unknown, idempotencia?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (idempotencia) headers['X-Idempotency-Key'] = idempotencia
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: AbortSignal.timeout(TEMPO_LIMITE),
  })
  const texto = await r.text()
  let json: unknown = texto
  try {
    json = JSON.parse(texto)
  } catch {}
  if (!r.ok) throw new ErroMP(r.status, json)
  return json as T
}

// ── venda da lojista ───────────────────────────────────────────────────────

export type ItemPreferencia = {
  id: string
  title: string
  quantity: number
  unit_price: number
  currency_id: 'BRL'
  picture_url?: string
}

export type Preferencia = { id: string; init_point: string; sandbox_init_point?: string }

export function criarPreferencia(
  token: string,
  dados: {
    items: ItemPreferencia[]
    payer: { name: string; email: string }
    external_reference: string
    notification_url?: string
    back_urls: { success: string; pending: string; failure: string }
    auto_return?: 'approved'
    statement_descriptor?: string
    marketplace_fee?: number
    metadata?: Record<string, string>
  },
): Promise<Preferencia> {
  return chamar<Preferencia>(token, 'POST', '/checkout/preferences', dados)
}

export type Pagamento = {
  id: number
  status: string // approved | pending | in_process | rejected | cancelled | refunded | charged_back
  status_detail: string
  external_reference: string | null
  transaction_amount: number
  currency_id: string
  payment_type_id: string // credit_card | debit_card | ticket | bank_transfer | account_money
  payment_method_id: string // pix | bolbradesco | visa…
  date_approved: string | null
  date_created: string
}

export function buscarPagamento(token: string, id: string | number): Promise<Pagamento> {
  return chamar<Pagamento>(token, 'GET', `/v1/payments/${encodeURIComponent(String(id))}`)
}

export async function pagamentosDaReferencia(token: string, referencia: string): Promise<Pagamento[]> {
  const r = await chamar<{ results: Pagamento[] }>(
    token,
    'GET',
    `/v1/payments/search?external_reference=${encodeURIComponent(referencia)}&sort=date_created&criteria=desc&limit=20`,
  )
  return r.results ?? []
}

export function metodoDoPagamento(p: Pagamento): string {
  if (p.payment_method_id === 'pix' || p.payment_type_id === 'bank_transfer') return 'pix'
  if (p.payment_type_id === 'ticket') return 'boleto'
  if (p.payment_type_id === 'credit_card' || p.payment_type_id === 'debit_card') return 'cartao'
  return p.payment_type_id
}

// ── conta conectada ────────────────────────────────────────────────────────

export type UsuarioMP = { id: number; nickname?: string; email?: string; site_id?: string }

export function quemSou(token: string): Promise<UsuarioMP> {
  return chamar<UsuarioMP>(token, 'GET', '/users/me')
}

export function urlAutorizacao(clientId: string, redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: redirectUri,
  })
  return `https://auth.mercadopago.com.br/authorization?${q}`
}

export type TokenOAuth = {
  access_token: string
  refresh_token: string
  public_key: string
  user_id: number
  expires_in: number
}

export async function trocarCodigo(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<TokenOAuth> {
  const r = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    signal: AbortSignal.timeout(TEMPO_LIMITE),
  })
  const j = await r.json()
  if (!r.ok) throw new ErroMP(r.status, j)
  return j as TokenOAuth
}

export async function renovarToken(clientId: string, clientSecret: string, refreshToken: string): Promise<TokenOAuth> {
  const r = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken }),
    signal: AbortSignal.timeout(TEMPO_LIMITE),
  })
  const j = await r.json()
  if (!r.ok) throw new ErroMP(r.status, j)
  return j as TokenOAuth
}

/** "Loja do Kiwi!" → "LOJADOKIWI": o que aparece na fatura do cartão. */
export function descritorFatura(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, 13)
    .toUpperCase()
}
