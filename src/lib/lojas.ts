import type { Env, Loja, Plano } from '../tipos'
import { agora } from './formato'

export async function lojaPorSlug(env: Env, slug: string): Promise<Loja | null> {
  return env.DB.prepare('SELECT * FROM lojas WHERE slug = ?').bind(slug).first<Loja>()
}

export async function lojaPorDominio(env: Env, dominio: string): Promise<Loja | null> {
  const d = dominio.replace(/^www\./, '')
  return env.DB.prepare('SELECT * FROM lojas WHERE dominio = ? OR dominio = ?').bind(d, `www.${d}`).first<Loja>()
}

export async function lojaDoDono(env: Env, usuarioId: string): Promise<Loja | null> {
  return env.DB.prepare('SELECT * FROM lojas WHERE dono_id = ?').bind(usuarioId).first<Loja>()
}

export async function planos(env: Env): Promise<Plano[]> {
  const r = await env.DB.prepare('SELECT * FROM planos WHERE ativo = 1 ORDER BY ordem').all<Plano>()
  return r.results
}

export async function plano(env: Env, id: string | null): Promise<Plano | null> {
  if (!id) return null
  return env.DB.prepare('SELECT * FROM planos WHERE id = ?').bind(id).first<Plano>()
}

export type Situacao =
  | { noAr: true; tipo: 'teste'; ate: string }
  | { noAr: true; tipo: 'assinante' }
  | { noAr: true; tipo: 'cancelada'; ate: string }
  | { noAr: false; tipo: 'vencida' }
  | { noAr: false; tipo: 'fechada' }

/** A assinatura em dia (ou o teste grátis) é o que mantém a vitrine no ar. */
export function situacaoDaAssinatura(loja: Loja): Exclude<Situacao, { tipo: 'fechada' }> {
  const hoje = agora()
  if (loja.assinatura_status === 'authorized') return { noAr: true, tipo: 'assinante' }
  // Cancelou ou pausou: fica no ar até o fim do período que já pagou.
  if (loja.assinatura_valida_ate && loja.assinatura_valida_ate > hoje && loja.assinatura_status !== 'pending') {
    return { noAr: true, tipo: 'cancelada', ate: loja.assinatura_valida_ate }
  }
  if (loja.teste_ate > hoje) return { noAr: true, tipo: 'teste', ate: loja.teste_ate }
  return { noAr: false, tipo: 'vencida' }
}

export function situacao(loja: Loja): Situacao {
  const s = situacaoDaAssinatura(loja)
  if (s.noAr && !loja.aberta) return { noAr: false, tipo: 'fechada' }
  return s
}

/** Limite de produtos ativos do plano atual. Durante o teste vale o maior plano. */
export async function limiteDeProdutos(env: Env, loja: Loja): Promise<number | null> {
  const s = situacaoDaAssinatura(loja)
  if (s.tipo === 'teste') return null
  const p = await plano(env, loja.plano_id)
  return p ? p.limite_produtos : 0
}

export async function contarProdutosAtivos(env: Env, lojaId: string): Promise<number> {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM produtos WHERE loja_id = ? AND ativo = 1 AND arquivado = 0')
    .bind(lojaId)
    .first<{ n: number }>()
  return r?.n ?? 0
}

/** Endereço público de uma imagem guardada no R2. */
export function urlImagem(key: string | null | undefined): string {
  if (!key) return ''
  return `/i/${key.replace(/^img\//, '')}`
}
