import type { Env, Loja, Plano } from '../tipos'
import { agora } from './formato'
import { limiteDoPlano } from './limites'

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
  | { noAr: true; tipo: 'assinante'; atrasada: boolean }
  | { noAr: true; tipo: 'cancelada'; ate: string }
  | { noAr: false; tipo: 'vencida' }
  | { noAr: false; tipo: 'fechada' }

// Status do Stripe em que a assinatura está valendo. past_due: o cartão falhou e
// o Stripe ainda está tentando — a loja não sai do ar no meio das tentativas.
const EM_DIA = ['active', 'trialing', 'past_due']
// Trava própria: mesmo que o Stripe fique em past_due para sempre (depende da
// configuração de cobrança falha no painel dele), 14 dias sem pagar tira do ar.
const TOLERANCIA_ATRASO = 14 * 86_400_000

/** A assinatura em dia (ou o teste grátis) é o que mantém a vitrine no ar. */
export function situacaoDaAssinatura(loja: Loja): Exclude<Situacao, { tipo: 'fechada' }> {
  const hoje = agora()
  const status = loja.assinatura_status ?? ''
  const validaAte = loja.assinatura_valida_ate
  const atrasoEstourou =
    status === 'past_due' && !!loja.assinatura_atrasada_desde && Date.now() - Date.parse(loja.assinatura_atrasada_desde) > TOLERANCIA_ATRASO
  if (EM_DIA.includes(status) && !atrasoEstourou) {
    // Cancelou: fica no ar até o fim do período que já pagou, e não renova.
    if (loja.assinatura_cancelada && validaAte) return { noAr: true, tipo: 'cancelada', ate: validaAte }
    return { noAr: true, tipo: 'assinante', atrasada: status === 'past_due' }
  }
  // Encerrada pelo Stripe antes do fim do período pago (ex.: cancelada no painel dele).
  if (status === 'canceled' && validaAte && validaAte > hoje) return { noAr: true, tipo: 'cancelada', ate: validaAte }
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

/** Tamanho máximo de cada arquivo à venda, pelo plano atual. Durante o teste vale o maior plano. */
export async function limiteDeArquivo(env: Env, loja: Loja): Promise<{ max: number; podeSubir: boolean }> {
  const todos = await planos(env)
  return limiteDoPlano(todos, loja.plano_id, situacaoDaAssinatura(loja).tipo === 'teste')
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
