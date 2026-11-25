/**
 * O ciclo de uma venda: pedido → Mercado Pago → confirmação → arquivo liberado.
 *
 * Regra de ouro: o arquivo só é liberado depois de CONSULTAR o pagamento na API
 * do Mercado Pago com o token da própria loja. O corpo do aviso (webhook) e os
 * parâmetros da volta do checkout servem só para dizer "vá olhar"; nunca são
 * prova de pagamento, porque qualquer um pode forjá-los.
 */
import type { Env, Loja, Pedido, PedidoItem, Produto } from '../tipos'
import { contaDaLoja } from './conta-mp'
import { urlDaLoja } from './dominio'
import { enviarEmail, escaparHtml, moldeEmail } from './email'
import { agora, reais } from './formato'
import { plano as buscarPlano } from './lojas'
import { criarPreferencia, descritorFatura, metodoDoPagamento, pagamentosDaReferencia, buscarPagamento, type Pagamento } from './mercadopago'
import { gerarId, gerarToken } from './seguranca'

export class ErroVenda extends Error {}

export async function pedidoPorToken(env: Env, lojaId: string, token: string): Promise<Pedido | null> {
  if (!token || token.length > 100) return null
  return env.DB.prepare('SELECT * FROM pedidos WHERE loja_id = ? AND token = ?').bind(lojaId, token).first<Pedido>()
}

export async function itensDoPedido(env: Env, pedidoId: string): Promise<PedidoItem[]> {
  const r = await env.DB.prepare('SELECT * FROM pedido_itens WHERE pedido_id = ? ORDER BY rowid').bind(pedidoId).all<PedidoItem>()
  return r.results
}

/**
 * Cria o pedido e devolve para onde mandar a compradora: o checkout do Mercado
 * Pago, ou direto a página do pedido quando tudo é grátis.
 *
 * `urlVitrine` é o endereço absoluto da loja como a compradora está vendo
 * (subdomínio, domínio próprio ou /loja/<slug>), para a volta do checkout cair
 * no mesmo lugar.
 */
export async function criarPedido(
  env: Env,
  loja: Loja,
  produtoIds: string[],
  cliente: { nome: string; email: string },
  urlVitrine: string,
): Promise<{ pedido: Pedido; destino: string }> {
  const ids = [...new Set(produtoIds)].slice(0, 50)
  if (!ids.length) throw new ErroVenda('Seu carrinho está vazio.')

  const marcas = ids.map(() => '?').join(',')
  const r = await env.DB.prepare(
    `SELECT * FROM produtos WHERE loja_id = ? AND ativo = 1 AND arquivado = 0 AND id IN (${marcas})`,
  )
    .bind(loja.id, ...ids)
    .all<Produto>()
  const produtos = r.results
  if (!produtos.length) throw new ErroVenda('Os produtos do carrinho não estão mais à venda.')

  const total = produtos.reduce((s, p) => s + p.preco_centavos, 0)
  const conta = total > 0 ? await contaDaLoja(env, loja.id) : null
  if (total > 0 && !conta) {
    throw new ErroVenda('Esta loja ainda não ativou os pagamentos. Fale com a loja pelo WhatsApp para comprar.')
  }

  // Número sequencial por loja, atômico: "Pedido nº 1", "nº 2"…
  const seq = await env.DB.prepare('UPDATE lojas SET ultimo_pedido = ultimo_pedido + 1 WHERE id = ? RETURNING ultimo_pedido')
    .bind(loja.id)
    .first<{ ultimo_pedido: number }>()

  const pedido: Pedido = {
    id: gerarId(),
    loja_id: loja.id,
    numero: seq!.ultimo_pedido,
    token: gerarToken(24),
    cliente_nome: cliente.nome,
    cliente_email: cliente.email.toLowerCase(),
    total_centavos: total,
    taxa_centavos: 0,
    status: 'pendente',
    metodo: null,
    mp_preferencia_id: null,
    mp_pagamento_id: null,
    mp_status: null,
    criado_em: agora(),
    pago_em: null,
    verificado_em: null,
    email_enviado_em: null,
  }

  // Taxa da plataforma: só existe com conta conectada pelo botão (OAuth), que é
  // o único jeito de o Mercado Pago repartir o pagamento.
  if (conta?.viaOauth) {
    const p = await buscarPlano(env, loja.plano_id)
    if (p && p.taxa_venda > 0) pedido.taxa_centavos = Math.round((total * p.taxa_venda) / 100)
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO pedidos (id, loja_id, numero, token, cliente_nome, cliente_email, total_centavos, taxa_centavos, status, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
    ).bind(pedido.id, loja.id, pedido.numero, pedido.token, pedido.cliente_nome, pedido.cliente_email, total, pedido.taxa_centavos, pedido.criado_em),
    ...produtos.map((p) =>
      env.DB.prepare(
        `INSERT INTO pedido_itens (id, pedido_id, produto_id, nome, preco_centavos, arquivo_key, arquivo_nome, limite_downloads)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(gerarId(), pedido.id, p.id, p.nome, p.preco_centavos, p.arquivo_key, p.arquivo_nome, p.limite_downloads),
    ),
  ])

  const urlPedido = `${urlVitrine}/pedido/${pedido.token}`

  if (total === 0) {
    await marcarPago(env, pedido, { metodo: 'gratis', mpPagamentoId: null, mpStatus: null })
    return { pedido, destino: urlPedido }
  }

  const https = urlPedido.startsWith('https://')
  const pref = await criarPreferencia(conta!.token, {
    items: produtos.map((p) => ({
      id: p.id,
      title: p.nome.slice(0, 250),
      quantity: 1,
      unit_price: p.preco_centavos / 100,
      currency_id: 'BRL',
    })),
    payer: { name: cliente.nome, email: pedido.cliente_email },
    external_reference: pedido.id,
    notification_url: env.APP_URL.startsWith('https://') ? `${env.APP_URL}/webhooks/mercadopago?loja=${loja.id}` : undefined,
    back_urls: { success: urlPedido, pending: urlPedido, failure: urlPedido },
    // O Mercado Pago recusa volta automática para endereço sem https.
    auto_return: https ? 'approved' : undefined,
    statement_descriptor: descritorFatura(loja.nome) || undefined,
    marketplace_fee: pedido.taxa_centavos > 0 ? pedido.taxa_centavos / 100 : undefined,
    metadata: { loja_id: loja.id, pedido_id: pedido.id },
  })
  await env.DB.prepare('UPDATE pedidos SET mp_preferencia_id = ? WHERE id = ?').bind(pref.id, pedido.id).run()
  pedido.mp_preferencia_id = pref.id
  return { pedido, destino: pref.init_point }
}

/**
 * Pergunta ao Mercado Pago como está o pedido e aplica a resposta. Chamado pelo
 * aviso (webhook), pela volta do checkout, pela página do pedido enquanto ela
 * espera, e pelo cron — quem chegar primeiro libera o arquivo.
 */
export async function sincronizarPedido(env: Env, pedido: Pedido, pagamentoId?: string | null): Promise<Pedido> {
  if (pedido.total_centavos === 0) return pedido
  const conta = await contaDaLoja(env, pedido.loja_id)
  if (!conta) return pedido

  let pagamentos: Pagamento[]
  if (pagamentoId && /^\d{1,20}$/.test(pagamentoId)) {
    pagamentos = [await buscarPagamento(conta.token, pagamentoId)]
  } else {
    pagamentos = await pagamentosDaReferencia(conta.token, pedido.id)
  }
  pagamentos = pagamentos.filter((p) => p.external_reference === pedido.id)

  await env.DB.prepare('UPDATE pedidos SET verificado_em = ? WHERE id = ?').bind(agora(), pedido.id).run()

  const escolhido =
    pagamentos.find((p) => p.status === 'approved') ??
    pagamentos.find((p) => p.status === 'refunded' || p.status === 'charged_back') ??
    pagamentos[0]
  if (!escolhido) return pedido
  return aplicarPagamento(env, pedido, escolhido)
}

async function aplicarPagamento(env: Env, pedido: Pedido, p: Pagamento): Promise<Pedido> {
  const pagoCerto =
    p.status === 'approved' && p.currency_id === 'BRL' && Math.round(p.transaction_amount * 100) >= pedido.total_centavos

  if (pagoCerto && pedido.status === 'pendente') {
    await marcarPago(env, pedido, { metodo: metodoDoPagamento(p), mpPagamentoId: String(p.id), mpStatus: p.status })
    return { ...pedido, status: 'pago', metodo: metodoDoPagamento(p), mp_pagamento_id: String(p.id), mp_status: p.status }
  }

  if ((p.status === 'refunded' || p.status === 'charged_back') && pedido.status !== 'reembolsado') {
    // Dinheiro devolvido, arquivo devolvido: o download para de funcionar.
    await env.DB.prepare(`UPDATE pedidos SET status = 'reembolsado', mp_status = ?, mp_pagamento_id = ? WHERE id = ?`)
      .bind(p.status, String(p.id), pedido.id)
      .run()
    return { ...pedido, status: 'reembolsado', mp_status: p.status }
  }

  if (pedido.status === 'pendente') {
    await env.DB.prepare('UPDATE pedidos SET mp_status = ?, mp_pagamento_id = ?, metodo = ? WHERE id = ?')
      .bind(p.status, String(p.id), metodoDoPagamento(p), pedido.id)
      .run()
    return { ...pedido, mp_status: p.status, mp_pagamento_id: String(p.id), metodo: metodoDoPagamento(p) }
  }
  return pedido
}

async function marcarPago(
  env: Env,
  pedido: Pedido,
  d: { metodo: string; mpPagamentoId: string | null; mpStatus: string | null },
): Promise<void> {
  // "AND status = 'pendente'" faz disto um interruptor: aviso repetido do
  // Mercado Pago não manda o e-mail duas vezes.
  const r = await env.DB.prepare(
    `UPDATE pedidos SET status = 'pago', pago_em = ?, metodo = ?, mp_pagamento_id = ?, mp_status = ?
     WHERE id = ? AND status = 'pendente'`,
  )
    .bind(agora(), d.metodo, d.mpPagamentoId, d.mpStatus, pedido.id)
    .run()
  if (r.meta.changes > 0) await enviarEmailsDoPedido(env, pedido.id)
}

/** E-mail da compradora (com o link dos arquivos) e aviso de venda para a lojista. */
export async function enviarEmailsDoPedido(env: Env, pedidoId: string, soCompradora = false): Promise<boolean> {
  const pedido = await env.DB.prepare('SELECT * FROM pedidos WHERE id = ?').bind(pedidoId).first<Pedido>()
  if (!pedido || pedido.status !== 'pago') return false
  const loja = await env.DB.prepare('SELECT * FROM lojas WHERE id = ?').bind(pedido.loja_id).first<Loja>()
  if (!loja) return false
  const dono = await env.DB.prepare('SELECT email FROM usuarios WHERE id = ?').bind(loja.dono_id).first<{ email: string }>()
  const itens = await itensDoPedido(env, pedido.id)
  const link = `${urlDaLoja(env, loja)}/pedido/${pedido.token}`
  const listaItens = itens.map((i) => `• ${escaparHtml(i.nome)}`).join('<br>')

  const ok = await enviarEmail(env, {
    para: pedido.cliente_email,
    nomeRemetente: loja.nome,
    responderPara: loja.email_contato || dono?.email,
    assunto: `Seu pedido nº ${pedido.numero} está liberado — ${loja.nome}`,
    html: moldeEmail({
      cor: loja.cor_marca,
      titulo: 'Pagamento confirmado. Seus arquivos estão prontos.',
      paragrafos: [
        `Oi, ${escaparHtml(pedido.cliente_nome.split(' ')[0] ?? '')}! Obrigada pela compra na <strong>${escaparHtml(loja.nome)}</strong>.`,
        listaItens,
        'Guarde este e-mail: o botão abaixo leva aos seus arquivos sempre que você precisar baixar de novo.',
      ],
      botao: { texto: 'Baixar meus arquivos', url: link },
      rodape: `Pedido nº ${pedido.numero} · ${reais(pedido.total_centavos)} · Dúvidas? Responda este e-mail.`,
    }),
  })
  if (ok) await env.DB.prepare('UPDATE pedidos SET email_enviado_em = ? WHERE id = ?').bind(agora(), pedido.id).run()

  if (!soCompradora && dono?.email) {
    await enviarEmail(env, {
      para: dono.email,
      nomeRemetente: 'Lojinha Pronta',
      assunto: `Nova venda na ${loja.nome}: ${reais(pedido.total_centavos)}`,
      html: moldeEmail({
        cor: '#124559',
        titulo: `Você vendeu ${reais(pedido.total_centavos)}!`,
        paragrafos: [
          `Pedido nº ${pedido.numero} de <strong>${escaparHtml(pedido.cliente_nome)}</strong> (${escaparHtml(pedido.cliente_email)}).`,
          listaItens,
          'O arquivo já foi entregue automaticamente. O dinheiro cai na sua conta do Mercado Pago.',
        ],
        botao: { texto: 'Ver no painel', url: `${env.APP_URL}/painel/pedidos/${pedido.id}` },
        rodape: 'Lojinha Pronta',
      }),
    })
  }
  return ok
}

/** Rede de segurança do cron: pedido pendente cujo aviso nunca chegou. */
export async function reconciliarPendentes(env: Env): Promise<number> {
  const agoraMs = Date.now()
  const r = await env.DB.prepare(
    `SELECT * FROM pedidos WHERE status = 'pendente' AND total_centavos > 0
       AND criado_em > ? AND criado_em < ? AND (verificado_em IS NULL OR verificado_em < ?)
     ORDER BY criado_em DESC LIMIT 40`,
  )
    .bind(
      new Date(agoraMs - 5 * 86_400_000).toISOString(),
      new Date(agoraMs - 5 * 60_000).toISOString(),
      new Date(agoraMs - 30 * 60_000).toISOString(),
    )
    .all<Pedido>()
  let pagos = 0
  for (const p of r.results) {
    try {
      const novo = await sincronizarPedido(env, p)
      if (novo.status === 'pago') pagos++
    } catch (e) {
      console.error(`[cron] pedido ${p.id}:`, e)
    }
  }
  return pagos
}
