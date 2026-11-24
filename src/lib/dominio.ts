import type { AlvoLoja, Env, Loja } from '../tipos'

/**
 * Subdomínios que não podem virar loja: são da plataforma, de e-mail, ou
 * confundiriam a compradora ("suporte.lojinhapronta.com.br" parecendo oficial).
 */
const RESERVADOS = new Set(
  `app www www2 api admin administrador painel dashboard loja lojas store shop
   mail email smtp imap pop ftp webmail cpanel ns ns1 ns2 dns mx
   blog ajuda help suporte support status cdn static assets img imagens arquivos
   docs doc dev teste test staging homolog beta demo exemplo
   lojinha lojinhapronta pronta oficial conta minhaconta login entrar cadastro sair
   checkout pagamento pagamentos pagar mercadopago pix boleto financeiro
   root sistema site sites contato termos privacidade seguranca security
   google facebook instagram whatsapp`.split(/\s+/).filter(Boolean),
)

export function slugValido(slug: string): string | null {
  if (slug.length < 3) return 'Use pelo menos 3 letras.'
  if (slug.length > 40) return 'Use no máximo 40 caracteres.'
  if (!/^[a-z0-9-]+$/.test(slug)) return 'Só letras sem acento, números e hífen.'
  if (slug.startsWith('-') || slug.endsWith('-')) return 'Não pode começar nem terminar com hífen.'
  if (slug.includes('--')) return 'Não use dois hífens seguidos.'
  if (RESERVADOS.has(slug)) return 'Esse endereço é reservado. Escolha outro.'
  return null
}

/**
 * Decide, pelo endereço, se a requisição é da plataforma ou de uma loja.
 *
 *   app.lojinhapronta.com.br      → plataforma
 *   kiwi.lojinhapronta.com.br     → loja "kiwi"
 *   kiwi.localhost:8787           → loja "kiwi" (desenvolvimento)
 *   *.workers.dev, localhost      → plataforma (as lojas abrem em /loja/<slug>)
 *   qualquer outro domínio        → loja com domínio próprio
 */
export function resolverHost(hostname: string, env: Env): AlvoLoja | null {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  const raiz = env.DOMINIO_RAIZ.toLowerCase()

  if (h === raiz || h === `www.${raiz}` || h === `app.${raiz}`) return null
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.workers.dev')) return null

  if (h.endsWith(`.${raiz}`)) {
    const sub = h.slice(0, -(raiz.length + 1))
    if (sub.includes('.')) return null
    return { slug: sub, base: '' }
  }
  if (h.endsWith('.localhost')) {
    return { slug: h.slice(0, -'.localhost'.length).split('.').pop()!, base: '' }
  }
  return { dominio: h, base: '' }
}

/** Endereço público da loja, para mostrar no painel e mandar em e-mail. */
export function urlDaLoja(env: Env, loja: Pick<Loja, 'slug' | 'dominio'>): string {
  if (loja.dominio) return `https://${loja.dominio}`
  if (env.SUBDOMINIOS_ATIVOS === 'sim') return `https://${loja.slug}.${env.DOMINIO_RAIZ}`
  return `${env.APP_URL}/loja/${loja.slug}`
}

/** Como o endereço aparece escrito (sem https://). */
export function enderecoVisivel(env: Env, loja: Pick<Loja, 'slug' | 'dominio'>): string {
  if (loja.dominio) return loja.dominio
  return `${loja.slug}.${env.DOMINIO_RAIZ}`
}
