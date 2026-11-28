/**
 * Cabeçalhos de segurança de toda resposta. Duas políticas, porque os dois
 * lados carregam coisas diferentes:
 *
 *   plataforma  painel, cadastro, apresentação — só o próprio Worker, o
 *               anti-robô do Cloudflare e as fontes do Google
 *   vitrine     loja — o próprio Worker e, se a lojista ligar, o Google
 *               Analytics. A vitrine pode estar no domínio da lojista, então
 *               o HSTS não se estende aos subdomínios dela.
 */
import type { Context, MiddlewareHandler } from 'hono'

const COMUNS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}

const CSP_PLATAFORMA = [
  "default-src 'self'",
  // static.cloudflareinsights.com: o Web Analytics do Cloudflare (contagem de
  // visitas sem cookie), ligado no painel do Cloudflare.
  "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://cloudflareinsights.com",
  'frame-src https://challenges.cloudflare.com',
  // Formulário só manda para cá ou para o checkout do Stripe (o redirect depois
  // do POST também passa por esta regra).
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com https://auth.mercadopago.com.br",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

// Sem form-action de propósito: o "Ir para o pagamento" responde com redirect
// para o checkout do Mercado Pago, e um domínio esquecido ali travaria a venda.
const CSP_VITRINE = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

function aplicar(c: Context, csp: string, hsts: string) {
  for (const [k, v] of Object.entries(COMUNS)) c.header(k, v)
  c.header('Content-Security-Policy', csp)
  if (new URL(c.req.url).protocol === 'https:') c.header('Strict-Transport-Security', hsts)
}

export const cabecalhosPlataforma: MiddlewareHandler = async (c, next) => {
  await next()
  aplicar(c, CSP_PLATAFORMA, 'max-age=31536000; includeSubDomains')
  c.header('Cross-Origin-Opener-Policy', 'same-origin')
}

export const cabecalhosVitrine: MiddlewareHandler = async (c, next) => {
  await next()
  aplicar(c, CSP_VITRINE, 'max-age=31536000')
}
