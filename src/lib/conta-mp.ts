/**
 * A conta do Mercado Pago de cada lojista. O dinheiro da venda cai direto
 * nela — a plataforma nunca toca no dinheiro da loja.
 */
import type { Env } from '../tipos'
import { agora } from './formato'
import { quemSou, renovarToken } from './mercadopago'
import { cifrar, decifrar } from './seguranca'

type LinhaMP = {
  loja_id: string
  mp_user_id: string
  conta: string
  access_token: string
  refresh_token: string | null
  public_key: string | null
  expira_em: string | null
  via_oauth: number
  conectado_em: string
}

export type ContaMP = { token: string; viaOauth: boolean; mpUserId: string; conta: string }

export async function contaConectada(env: Env, lojaId: string): Promise<{ conta: string; viaOauth: boolean; conectadoEm: string } | null> {
  const r = await env.DB.prepare('SELECT conta, via_oauth, conectado_em FROM lojas_mp WHERE loja_id = ?')
    .bind(lojaId)
    .first<{ conta: string; via_oauth: number; conectado_em: string }>()
  return r ? { conta: r.conta, viaOauth: !!r.via_oauth, conectadoEm: r.conectado_em } : null
}

/** Token pronto para usar. Renova sozinho quando o do OAuth está para vencer. */
export async function contaDaLoja(env: Env, lojaId: string): Promise<ContaMP | null> {
  const r = await env.DB.prepare('SELECT * FROM lojas_mp WHERE loja_id = ?').bind(lojaId).first<LinhaMP>()
  if (!r) return null
  let token = await decifrar(env, r.access_token)
  const venceLogo = r.expira_em && Date.parse(r.expira_em) - Date.now() < 7 * 86_400_000
  if (r.via_oauth && venceLogo && r.refresh_token && env.MP_CLIENT_ID && env.MP_CLIENT_SECRET) {
    try {
      token = await renovar(env, r)
    } catch (e) {
      console.error(`[mp] não renovou o token da loja ${lojaId}:`, e)
    }
  }
  return { token, viaOauth: !!r.via_oauth, mpUserId: r.mp_user_id, conta: r.conta }
}

async function renovar(env: Env, r: LinhaMP): Promise<string> {
  const novo = await renovarToken(env.MP_CLIENT_ID!, env.MP_CLIENT_SECRET!, await decifrar(env, r.refresh_token!))
  await env.DB.prepare('UPDATE lojas_mp SET access_token = ?, refresh_token = ?, expira_em = ? WHERE loja_id = ?')
    .bind(
      await cifrar(env, novo.access_token),
      await cifrar(env, novo.refresh_token),
      new Date(Date.now() + novo.expires_in * 1000).toISOString(),
      r.loja_id,
    )
    .run()
  return novo.access_token
}

/** Renova, no cron diário, todo token OAuth que vence nos próximos 30 dias. */
export async function renovarTokensVencendo(env: Env): Promise<number> {
  if (!env.MP_CLIENT_ID || !env.MP_CLIENT_SECRET) return 0
  const limite = new Date(Date.now() + 30 * 86_400_000).toISOString()
  const r = await env.DB.prepare('SELECT * FROM lojas_mp WHERE via_oauth = 1 AND expira_em < ? LIMIT 50').bind(limite).all<LinhaMP>()
  let n = 0
  for (const linha of r.results) {
    try {
      await renovar(env, linha)
      n++
    } catch (e) {
      console.error(`[cron] token da loja ${linha.loja_id} não renovou:`, e)
    }
  }
  return n
}

export async function salvarConta(
  env: Env,
  lojaId: string,
  dados: { token: string; refresh?: string; publicKey?: string; expiraEm?: string; viaOauth: boolean },
): Promise<{ conta: string }> {
  // Confere o token antes de guardar: token errado aqui é venda que não fecha.
  const eu = await quemSou(dados.token)
  const conta = eu.email || eu.nickname || String(eu.id)
  await env.DB.prepare(
    `INSERT INTO lojas_mp (loja_id, mp_user_id, conta, access_token, refresh_token, public_key, expira_em, via_oauth, conectado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(loja_id) DO UPDATE SET mp_user_id = excluded.mp_user_id, conta = excluded.conta,
       access_token = excluded.access_token, refresh_token = excluded.refresh_token, public_key = excluded.public_key,
       expira_em = excluded.expira_em, via_oauth = excluded.via_oauth, conectado_em = excluded.conectado_em`,
  )
    .bind(
      lojaId,
      String(eu.id),
      conta,
      await cifrar(env, dados.token),
      dados.refresh ? await cifrar(env, dados.refresh) : null,
      dados.publicKey ?? null,
      dados.expiraEm ?? null,
      dados.viaOauth ? 1 : 0,
      agora(),
    )
    .run()
  return { conta }
}

export async function desconectarConta(env: Env, lojaId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM lojas_mp WHERE loja_id = ?').bind(lojaId).run()
}
