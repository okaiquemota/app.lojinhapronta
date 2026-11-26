import type { Env } from '../tipos'

/**
 * E-mail transacional pelo Resend. Sem RESEND_API_KEY, nada é enviado e a
 * função devolve false — a loja continua funcionando: a página do pedido mostra
 * os arquivos e a lojista pode copiar o link no painel.
 */
export async function enviarEmail(
  env: Env,
  msg: { para: string; assunto: string; html: string; nomeRemetente: string; responderPara?: string },
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log(`[email desligado] para=${msg.para} assunto=${msg.assunto}`)
    return false
  }
  const nome = msg.nomeRemetente.replace(/["<>]/g, '').slice(0, 60)
  let r: Response
  try {
    r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${nome} <${env.EMAIL_REMETENTE}>`,
        to: [msg.para],
        subject: msg.assunto,
        html: msg.html,
        reply_to: msg.responderPara || undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (e) {
    // Rede fora ou Resend lento: quem chamou trata como "não saiu" (o painel
    // mostra "não enviado" e a lojista pode reenviar ou copiar o link).
    console.error('[email] sem resposta', e)
    return false
  }
  if (!r.ok) {
    console.error(`[email] falhou ${r.status}: ${(await r.text()).slice(0, 300)}`)
    return false
  }
  return true
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Molde único dos e-mails: simples, legível no celular, sem imagem externa. */
export function moldeEmail(o: { cor: string; titulo: string; paragrafos: string[]; botao?: { texto: string; url: string }; rodape: string }): string {
  const cor = /^#[0-9a-f]{6}$/i.test(o.cor) ? o.cor : '#124559'
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f2ef">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ef;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#12181b">
<tr><td>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:${cor}">${esc(o.titulo)}</h1>
${o.paragrafos.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55">${p}</p>`).join('\n')}
${o.botao ? `<p style="margin:24px 0 8px"><a href="${esc(o.botao.url)}" style="display:inline-block;background:${cor};color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">${esc(o.botao.texto)}</a></p>
<p style="margin:0 0 14px;font-size:13px;color:#5b6468">Se o botão não abrir, copie o endereço: <br><span style="word-break:break-all">${esc(o.botao.url)}</span></p>` : ''}
</td></tr></table>
<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#5b6468;margin:16px 0 0">${o.rodape}</p>
</td></tr></table></body></html>`
}

export { esc as escaparHtml }
