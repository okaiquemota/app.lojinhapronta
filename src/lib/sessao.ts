import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Env, Usuario } from '../tipos'
import { agora, somarDias } from './formato'
import { gerarToken, sha256 } from './seguranca'

// "__Host-": o navegador só aceita esse cookie com Secure, Path=/ e sem
// Domain — ninguém num subdomínio consegue plantar ou ler a sessão do painel.
const COOKIE_SEGURO = '__Host-lp_sessao'
const COOKIE_LOCAL = 'lp_sessao' // http://localhost, no desenvolvimento
const DIAS = 30

type C = Context<{ Bindings: Env }> | Context<{ Bindings: Env; Variables: any }>
// O painel e as telas públicas têm Variables diferentes; aqui só se usa env e cookie.

function seguro(c: C): boolean {
  return new URL(c.req.url).protocol === 'https:'
}

function nomeCookie(c: C): string {
  return seguro(c) ? COOKIE_SEGURO : COOKIE_LOCAL
}

export async function abrirSessao(c: C, usuarioId: string): Promise<void> {
  const token = gerarToken()
  const criado = agora()
  await c.env.DB.prepare('INSERT INTO sessoes (id, usuario_id, expira_em, criado_em) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), usuarioId, somarDias(criado, DIAS), criado)
    .run()
  // Sem Domain: o cookie fica só no host do painel. As lojas, em outros
  // subdomínios, não enxergam a sessão de quem administra.
  setCookie(c, nomeCookie(c), token, { httpOnly: true, secure: seguro(c), sameSite: 'Lax', path: '/', maxAge: DIAS * 86400 })
}

export async function usuarioDaSessao(c: C): Promise<Usuario | null> {
  const token = getCookie(c, nomeCookie(c))
  if (!token || token.length > 100) return null
  return c.env.DB.prepare(
    `SELECT u.id, u.email, u.nome, u.criado_em FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.id = ? AND s.expira_em > ?`,
  )
    .bind(await sha256(token), agora())
    .first<Usuario>()
}

export async function fecharSessao(c: C): Promise<void> {
  const token = getCookie(c, nomeCookie(c))
  if (token) await c.env.DB.prepare('DELETE FROM sessoes WHERE id = ?').bind(await sha256(token)).run()
  deleteCookie(c, nomeCookie(c), { path: '/', secure: seguro(c) })
}

/** Senha trocada: derruba todas as outras sessões, mantém só a de quem trocou. */
export async function fecharOutrasSessoes(c: C, usuarioId: string): Promise<void> {
  const token = getCookie(c, nomeCookie(c))
  const atual = token ? await sha256(token) : ''
  await c.env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ? AND id != ?').bind(usuarioId, atual).run()
}

/** Quantas tentativas com esta chave (e-mail, ou ip:ação:endereço) nos últimos minutos. */
export async function tentativasRecentes(env: Env, email: string, minutos = 15): Promise<number> {
  const desde = new Date(Date.now() - minutos * 60_000).toISOString()
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM tentativas_login WHERE chave = ? AND criado_em > ?')
    .bind(email.toLowerCase(), desde)
    .first<{ n: number }>()
  return r?.n ?? 0
}

export async function registrarTentativa(env: Env, email: string): Promise<void> {
  await env.DB.prepare('INSERT INTO tentativas_login (chave, criado_em) VALUES (?, ?)').bind(email.toLowerCase(), agora()).run()
}

export async function limparTentativas(env: Env, email: string): Promise<void> {
  await env.DB.prepare('DELETE FROM tentativas_login WHERE chave = ?').bind(email.toLowerCase()).run()
}

export function ehAdmin(env: Env, email: string): boolean {
  return (env.ADMIN_EMAILS ?? "").split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase())
}
