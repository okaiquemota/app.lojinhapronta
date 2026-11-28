/**
 * Defesas das telas de acesso (entrar, criar loja, esqueci a senha):
 *
 * - limite por IP, além do limite por e-mail que já existia
 * - Turnstile (anti-robô do Cloudflare), ligado quando TURNSTILE_SITEKEY e
 *   TURNSTILE_SECRET existem
 * - senha curta ou óbvia demais é recusada (a consulta de senha vazada foi
 *   desligada a pedido do dono)
 * - mesmo tempo de resposta para e-mail que existe e que não existe
 */
import type { Context } from 'hono'
import type { Env } from '../tipos'
import { conferirSenha } from './seguranca'
import { registrarTentativa, tentativasRecentes } from './sessao'

type C = Context<any>

export function ipDe(c: C): string {
  return (c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0] || 'local').trim().slice(0, 64)
}

/** Quantas vezes, nos últimos `minutos`, este IP fez esta ação. */
export async function excedeuPorIp(c: C, acao: string, limite: number, minutos: number): Promise<boolean> {
  return (await tentativasRecentes(c.env, `ip:${acao}:${ipDe(c)}`, minutos)) >= limite
}

export async function contarPorIp(c: C, acao: string): Promise<void> {
  await registrarTentativa(c.env, `ip:${acao}:${ipDe(c)}`)
}

export function turnstileLigado(env: Env): boolean {
  return !!(env.TURNSTILE_SITEKEY && env.TURNSTILE_SECRET)
}

/** Confere o desafio anti-robô. Sem Turnstile configurado, deixa passar. */
export async function passouNoTurnstile(c: C, token: unknown): Promise<boolean> {
  const env: Env = c.env
  if (!turnstileLigado(env)) return true
  if (typeof token !== 'string' || !token || token.length > 2048) return false
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET!, response: token, remoteip: ipDe(c) }),
      signal: AbortSignal.timeout(5_000),
    })
    const j = (await r.json()) as { success?: boolean; hostname?: string }
    return j.success === true
  } catch (e) {
    // Se o Cloudflare não responder, não tranca a porta de todo mundo: os
    // limites por IP e por e-mail continuam valendo.
    console.error('[turnstile]', e)
    return true
  }
}

/** Senha fraca demais? Devolve o motivo, ou null se está boa. */
export async function problemaNaSenha(senha: string, email?: string): Promise<string | null> {
  if (senha.length < 8) return 'A senha precisa de pelo menos 8 caracteres.'
  if (senha.length > 128) return 'A senha pode ter no máximo 128 caracteres.'
  if (/^(.)\1+$/.test(senha) || /^(?:0123456789|12345678|123456789|87654321|abcdefgh|qwertyui|senha123|password)/i.test(senha)) {
    return 'Essa senha é fácil demais de adivinhar. Misture palavras e números.'
  }
  if (email && senha.toLowerCase().includes(email.split('@')[0]!.toLowerCase()) && email.split('@')[0]!.length >= 4) {
    return 'A senha não pode conter o seu e-mail.'
  }
  return null
}

// Hash válido de uma senha que ninguém usa: conferir contra ele gasta o mesmo
// tempo que conferir uma senha de verdade.
let hashFalso: string | null = null
export async function gastarTempoDeSenha(senha: string): Promise<void> {
  if (!hashFalso) {
    const { hashSenha } = await import('./seguranca')
    hashFalso = await hashSenha(crypto.randomUUID())
  }
  await conferirSenha(senha, hashFalso)
}
