import type { AppPainel } from './comum'
import { tela } from './comum'
import { Botao, Cartao, Etiqueta, Icone, Vazio } from '../ui'
import { urlDaLoja } from '../../lib/dominio'
import { contaConectada } from '../../lib/conta-mp'
import { contarProdutosAtivos, situacaoDaAssinatura } from '../../lib/lojas'
import { dataHoraBR, reais } from '../../lib/formato'
import type { Pedido } from '../../tipos'

/** Deixa o endereço quebrar antes de cada ponto, nunca no meio de uma palavra. */
function quebraNosPontos(texto: string) {
  return texto.split('.').map((parte, i) => (i ? <><wbr />.{parte}</> : parte))
}

export function EtiquetaStatus({ status }: { status: Pedido['status'] }) {
  const m = {
    pago: <Etiqueta cor="verde">Pago</Etiqueta>,
    pendente: <Etiqueta cor="amarelo">Aguardando pagamento</Etiqueta>,
    cancelado: <Etiqueta cor="cinza">Cancelado</Etiqueta>,
    reembolsado: <Etiqueta cor="vermelho">Reembolsado</Etiqueta>,
  }
  return m[status] ?? <Etiqueta>{status}</Etiqueta>
}

/** Tabela de pedidos. No celular cada linha vira um bloco com total e situação à vista. */
export function TabelaPedidos({ pedidos }: { pedidos: Pedido[] }) {
  return (
    <div class="tabela-rolagem">
      <table class="tabela tabela--pedidos">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Cliente</th>
            <th>Data</th>
            <th>Situação</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => (
            <tr>
              <td class="col-numero">
                <a href={`/painel/pedidos/${p.id}`} tabindex={-1} aria-hidden="true">
                  #{p.numero}
                </a>
              </td>
              <td class="col-cliente">
                <a href={`/painel/pedidos/${p.id}`} class="tabela__principal">
                  {p.cliente_nome}
                  <span class="sr-only">, pedido nº {p.numero}</span>
                </a>
                <small>{p.cliente_email}</small>
              </td>
              <td class="col-data">
                <span class="so-celular">#{p.numero} · </span>
                {dataHoraBR(p.criado_em)}
              </td>
              <td class="col-situacao">
                <EtiquetaStatus status={p.status} />
              </td>
              <td class="col-total num">{reais(p.total_centavos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function rotasInicio(app: AppPainel) {
  app.get('/', async (c) => {
    const loja = c.get('loja')
    const env = c.env
    const inicioMes = new Date()
    inicioMes.setUTCDate(1)
    inicioMes.setUTCHours(3, 0, 0, 0) // meia-noite em Brasília

    const [mes, pendentes, ultimos, ativos, totalProdutos, mp] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(total_centavos),0) AS soma FROM pedidos WHERE loja_id = ? AND status = 'pago' AND pago_em >= ?`)
        .bind(loja.id, inicioMes.toISOString())
        .first<{ n: number; soma: number }>(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM pedidos WHERE loja_id = ? AND status = 'pendente' AND criado_em > ?`)
        .bind(loja.id, new Date(Date.now() - 3 * 86_400_000).toISOString())
        .first<{ n: number }>(),
      env.DB.prepare('SELECT * FROM pedidos WHERE loja_id = ? ORDER BY criado_em DESC LIMIT 6').bind(loja.id).all<Pedido>(),
      contarProdutosAtivos(env, loja.id),
      env.DB.prepare('SELECT COUNT(*) AS n FROM produtos WHERE loja_id = ? AND arquivado = 0').bind(loja.id).first<{ n: number }>(),
      contaConectada(env, loja.id),
    ])

    const url = urlDaLoja(env, loja)
    const assinatura = situacaoDaAssinatura(loja)
    const passos = [
      { feito: ativos > 0, texto: 'Cadastre o primeiro produto com o arquivo', href: '/painel/produtos/novo', detalhe: 'Foto, preço e o PDF que a cliente recebe.' },
      { feito: !!mp, texto: 'Conecte o Mercado Pago', href: '/painel/pagamentos', detalhe: 'É por onde o dinheiro chega na sua conta.' },
      {
        feito: !!(loja.logo_key || loja.cor_marca !== '#124559' || loja.cor_destaque !== '#cf3f2b'),
        texto: 'Ponha sua logo e suas cores',
        href: '/painel/aparencia',
        detalhe: 'A loja fica com a sua cara.',
      },
      {
        feito: !!(loja.documento && loja.email_contato && loja.whatsapp),
        texto: 'Preencha os dados da loja',
        href: '/painel/configuracoes',
        detalhe: 'CPF ou CNPJ, e-mail e WhatsApp: entram nas páginas de privacidade, termos e contato.',
      },
      { feito: assinatura.tipo === 'assinante', texto: 'Escolha seu plano', href: '/painel/plano', detalhe: 'Para a loja continuar no ar depois do teste.' },
    ]
    const feitos = passos.filter((p) => p.feito).length

    return tela(
      c,
      { ativo: 'inicio', titulo: `Olá, ${c.get('usuario').nome.split(' ')[0]}` },
      <>
        <Cartao>
          <div class="link-loja">
            <div>
              <p class="rotulo-pequeno">Endereço da sua loja</p>
              <a href={url} target="_blank" rel="noopener" class="link-loja__url">
                {quebraNosPontos(url.replace(/^https?:\/\//, ''))}
                <span class="sr-only"> (abre em outra aba)</span>
              </a>
              <p class="campo__ajuda">É este o link para pôr na bio do Instagram e mandar no WhatsApp.</p>
            </div>
            <div class="link-loja__acoes">
              <button type="button" class="botao botao--secundario" data-copiar={url}>
                <Icone nome="copiar" /> Copiar link
              </button>
              <Botao href={url} alvo="_blank" tipo="principal" icone="externo">
                Abrir loja
              </Botao>
            </div>
          </div>
        </Cartao>

        {feitos < passos.length && (
          <Cartao titulo="Primeiros passos" acao={<span class="campo__ajuda">{`${feitos} de ${passos.length}`}</span>}>
            <div class="progresso" role="progressbar" aria-label="Primeiros passos" aria-valuemin={0} aria-valuemax={passos.length} aria-valuenow={feitos}>
              <span style={`width:${Math.round((feitos / passos.length) * 100)}%`}></span>
            </div>
            <ol class="passos-lista">
              {passos.map((p) => (
                <li class={p.feito ? 'feito' : undefined}>
                  <span class="passos-lista__marca">{p.feito ? <Icone nome="check" /> : null}</span>
                  <div>
                    {p.feito ? (
                      <strong>
                        {p.texto}
                        <span class="sr-only"> (feito)</span>
                      </strong>
                    ) : (
                      <a href={p.href}>
                        {/* A última palavra vai grudada na setinha: ela nunca desce sozinha. */}
                        {p.texto.slice(0, p.texto.lastIndexOf(' ') + 1)}
                        <span class="sem-quebra">
                          {p.texto.slice(p.texto.lastIndexOf(' ') + 1)}
                          <Icone nome="seguir" />
                        </span>
                      </a>
                    )}
                    <small>{p.detalhe}</small>
                  </div>
                </li>
              ))}
            </ol>
          </Cartao>
        )}

        <div class="numeros">
          <div class="numero">
            <span>Vendas no mês</span>
            <strong>{reais(mes?.soma ?? 0)}</strong>
          </div>
          <div class="numero">
            <span>Pedidos pagos no mês</span>
            <strong>{mes?.n ?? 0}</strong>
          </div>
          <div class="numero">
            <span>Aguardando pagamento</span>
            <strong>{pendentes?.n ?? 0}</strong>
          </div>
          <div class="numero">
            <span>Produtos à venda</span>
            <strong>
              {ativos}
              <small> de {totalProdutos?.n ?? 0}</small>
            </strong>
          </div>
        </div>

        <Cartao titulo="Últimas vendas" acao={ultimos.results.length ? <a href="/painel/pedidos">Ver todas</a> : undefined}>
          {ultimos.results.length ? (
            <TabelaPedidos pedidos={ultimos.results} />
          ) : (
            <Vazio titulo="Nenhuma venda ainda" icone="pedidos">
              <p>Quando alguém comprar, o pedido aparece aqui e você recebe um e-mail.</p>
            </Vazio>
          )}
        </Cartao>
      </>,
    )
  })
}
