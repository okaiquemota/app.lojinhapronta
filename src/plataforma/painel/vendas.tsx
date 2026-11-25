import type { AppPainel, Ctx } from './comum'
import { tela } from './comum'
import { Botao, Cartao, Icone, Vazio, avisar } from '../ui'
import { EtiquetaStatus, TabelaPedidos } from './inicio'
import type { Pedido } from '../../tipos'
import { dataHoraBR, reais } from '../../lib/formato'
import { enviarEmailsDoPedido, itensDoPedido, sincronizarPedido } from '../../lib/pedidos'
import { urlDaLoja } from '../../lib/dominio'

const METODO: Record<string, string> = { pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto', gratis: 'Grátis' }

async function pedidoDa(c: Ctx, id: string): Promise<Pedido | null> {
  return c.env.DB.prepare('SELECT * FROM pedidos WHERE id = ? AND loja_id = ?').bind(id, c.get('loja').id).first<Pedido>()
}

export function rotasVendas(app: AppPainel) {
  app.get('/pedidos', async (c) => {
    const loja = c.get('loja')
    const filtro = c.req.query('ver') === 'pagos' ? 'pago' : c.req.query('ver') === 'pendentes' ? 'pendente' : null
    const busca = (c.req.query('q') ?? '').trim().slice(0, 80)
    const conds = ['loja_id = ?']
    const args: unknown[] = [loja.id]
    if (filtro) {
      conds.push('status = ?')
      args.push(filtro)
    }
    if (busca) {
      const n = Number(busca.replace('#', ''))
      if (Number.isInteger(n) && n > 0) {
        conds.push('numero = ?')
        args.push(n)
      } else {
        conds.push('(cliente_email LIKE ? OR cliente_nome LIKE ?)')
        args.push(`%${busca}%`, `%${busca}%`)
      }
    }
    const r = await c.env.DB.prepare(`SELECT * FROM pedidos WHERE ${conds.join(' AND ')} ORDER BY criado_em DESC LIMIT 200`)
      .bind(...args)
      .all<Pedido>()

    const aba = (valor: string | null, texto: string) => (
      <a href={`/painel/pedidos${valor ? `?ver=${valor}` : ''}`} class={(c.req.query('ver') ?? null) === valor ? 'ativo' : undefined}>
        {texto}
      </a>
    )
    return tela(
      c,
      { ativo: 'pedidos', titulo: 'Vendas' },
      <Cartao>
        <div class="barra-filtros">
          <nav class="abas">
            {aba(null, 'Todas')}
            {aba('pagos', 'Pagas')}
            {aba('pendentes', 'Aguardando pagamento')}
          </nav>
          <form method="get" class="busca-painel">
            {c.req.query('ver') && <input type="hidden" name="ver" value={c.req.query('ver')} />}
            <input type="search" name="q" value={busca} placeholder="Nº, nome ou e-mail" aria-label="Buscar venda" />
          </form>
        </div>
        {r.results.length ? (
          <TabelaPedidos pedidos={r.results} />
        ) : (
          <Vazio titulo={busca || filtro ? 'Nenhuma venda encontrada' : 'Nenhuma venda ainda'}>
            <p>Divulgue o link da loja no Instagram e no WhatsApp. Cada compra aparece aqui na hora.</p>
          </Vazio>
        )}
      </Cartao>,
    )
  })

  app.get('/pedidos/:id', async (c) => {
    const p = await pedidoDa(c, c.req.param('id'))
    if (!p) return c.notFound()
    const itens = await itensDoPedido(c.env, p.id)
    const link = `${urlDaLoja(c.env, c.get('loja'))}/pedido/${p.token}`
    return tela(
      c,
      { ativo: 'pedidos', titulo: `Pedido nº ${p.numero}`, voltar: { href: '/painel/pedidos', texto: 'Vendas' } },
      <div class="grade-pedido">
        <Cartao titulo="Itens">
          <ul class="itens-pedido">
            {itens.map((i) => (
              <li>
                <span>
                  <strong>{i.nome}</strong>
                  <small>
                    {i.arquivo_nome ?? 'sem arquivo'} · baixado {i.downloads}
                    {i.limite_downloads ? ` de ${i.limite_downloads}` : ''} {i.downloads === 1 ? 'vez' : 'vezes'}
                  </small>
                </span>
                <span>{reais(i.preco_centavos)}</span>
              </li>
            ))}
            <li class="itens-pedido__total">
              <span>Total</span>
              <strong>{reais(p.total_centavos)}</strong>
            </li>
            {p.taxa_centavos > 0 && (
              <li class="texto-suave">
                <span>Taxa da plataforma</span>
                <span>− {reais(p.taxa_centavos)}</span>
              </li>
            )}
          </ul>
        </Cartao>

        <div>
          <Cartao titulo="Situação">
            <p>
              <EtiquetaStatus status={p.status} />
            </p>
            <dl class="dados">
              <dt>Feito em</dt>
              <dd>{dataHoraBR(p.criado_em)}</dd>
              {p.pago_em && (
                <>
                  <dt>Pago em</dt>
                  <dd>{dataHoraBR(p.pago_em)}</dd>
                </>
              )}
              {p.metodo && (
                <>
                  <dt>Forma</dt>
                  <dd>{METODO[p.metodo] ?? p.metodo}</dd>
                </>
              )}
              {p.mp_pagamento_id && (
                <>
                  <dt>Nº no Mercado Pago</dt>
                  <dd>{p.mp_pagamento_id}</dd>
                </>
              )}
              {p.status === 'pendente' && p.mp_status && (
                <>
                  <dt>Mercado Pago diz</dt>
                  <dd>{p.mp_status}</dd>
                </>
              )}
            </dl>
            {p.status === 'pendente' && p.total_centavos > 0 && (
              <form method="post" action={`/painel/pedidos/${p.id}/verificar`}>
                <Botao tipo="secundario" pequeno>
                  Consultar o Mercado Pago agora
                </Botao>
              </form>
            )}
          </Cartao>

          <Cartao titulo="Cliente">
            <dl class="dados">
              <dt>Nome</dt>
              <dd>{p.cliente_nome}</dd>
              <dt>E-mail</dt>
              <dd>
                <a href={`mailto:${p.cliente_email}`}>{p.cliente_email}</a>
              </dd>
              <dt>E-mail com os arquivos</dt>
              <dd>{p.email_enviado_em ? `enviado em ${dataHoraBR(p.email_enviado_em)}` : p.status === 'pago' ? 'não enviado' : '—'}</dd>
            </dl>
            {p.status === 'pago' && (
              <div class="pilha">
                <button type="button" class="botao botao--secundario botao--pequeno" data-copiar={link}>
                  <Icone nome="copiar" /> Copiar link dos arquivos
                </button>
                <form method="post" action={`/painel/pedidos/${p.id}/reenviar`}>
                  <Botao tipo="fantasma" pequeno>
                    Reenviar e-mail para a cliente
                  </Botao>
                </form>
                <p class="campo__ajuda">O link leva direto aos downloads. Mande pelo WhatsApp se o e-mail não chegou.</p>
              </div>
            )}
          </Cartao>
        </div>
      </div>,
    )
  })

  app.post('/pedidos/:id/verificar', async (c) => {
    const p = await pedidoDa(c, c.req.param('id'))
    if (!p) return c.notFound()
    try {
      const novo = await sincronizarPedido(c.env, p)
      avisar(c, novo.status === 'pago' ? 'Pagamento confirmado! O arquivo foi liberado.' : 'O Mercado Pago ainda não confirmou este pagamento.', novo.status === 'pago' ? 'ok' : 'erro')
    } catch (e) {
      console.error('[verificar]', e)
      avisar(c, 'Não consegui falar com o Mercado Pago agora. Tente de novo em instantes.', 'erro')
    }
    return c.redirect(`/painel/pedidos/${p.id}`)
  })

  app.post('/pedidos/:id/reenviar', async (c) => {
    const p = await pedidoDa(c, c.req.param('id'))
    if (!p) return c.notFound()
    const ok = await enviarEmailsDoPedido(c.env, p.id, true)
    avisar(c, ok ? `E-mail reenviado para ${p.cliente_email}.` : 'O e-mail não saiu. Copie o link dos arquivos e mande pelo WhatsApp.', ok ? 'ok' : 'erro')
    return c.redirect(`/painel/pedidos/${p.id}`)
  })
}
