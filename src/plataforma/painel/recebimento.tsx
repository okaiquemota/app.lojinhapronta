import type { AppPainel, Ctx } from './comum'
import { tela } from './comum'
import { Botao, Campo, Cartao, Etiqueta, Icone, Nota, avisar } from '../ui'
import { CartoesPlanos } from '../publico'
import { contaConectada, desconectarConta, salvarConta } from '../../lib/conta-mp'
import { trocarCodigo, urlAutorizacao, ErroMP } from '../../lib/mercadopago'
import { abrirAssinado, assinar } from '../../lib/seguranca'
import { dataBR, diasAte, campo, plural, reais } from '../../lib/formato'
import { plano as buscarPlano, planos as listarPlanos, situacaoDaAssinatura } from '../../lib/lojas'
import {
  cancelarAssinatura,
  concluirCheckout,
  iniciarAssinatura,
  portalDeCobranca,
  reativarAssinatura,
  sincronizarAssinatura,
  trocarPlano,
} from '../../lib/assinaturas'
import { stripeLigado } from '../../lib/stripe'
import type { Loja } from '../../tipos'

/** Pedido inválido da própria lojista (não é falha do Stripe). */
class ErroDeEscolha extends Error {}

function EtiquetaPlano({ s, status }: { s: ReturnType<typeof situacaoDaAssinatura>; status: string | null }) {
  if (s.tipo === 'assinante') return s.atrasada ? <Etiqueta cor="amarelo">Pagamento atrasado</Etiqueta> : <Etiqueta cor="verde">Assinatura ativa</Etiqueta>
  if (s.tipo === 'teste') return <Etiqueta cor="azul">Teste grátis</Etiqueta>
  if (s.tipo === 'cancelada') return <Etiqueta cor="amarelo">Cancelada</Etiqueta>
  return <Etiqueta cor="vermelho">{status === 'past_due' ? 'Fora do ar: pagamento atrasado' : 'Fora do ar'}</Etiqueta>
}

export function rotasRecebimento(app: AppPainel) {
  // ── Mercado Pago da lojista ──────────────────────────────────────────────
  app.get('/pagamentos', async (c) => {
    const l = c.get('loja')
    const conta = await contaConectada(c.env, l.id)
    const temBotao = !!(c.env.MP_CLIENT_ID && c.env.MP_CLIENT_SECRET)
    return tela(
      c,
      { ativo: 'pagamentos', titulo: 'Recebimento' },
      <div class="pilha pilha--texto">
        <Cartao titulo="Mercado Pago" acao={conta ? <Etiqueta cor="verde">Conectado</Etiqueta> : <Etiqueta cor="amarelo">Não conectado</Etiqueta>}>
          {conta ? (
            <>
              <p>
                As vendas caem na conta <strong>{conta.conta}</strong>, conectada em {dataBR(conta.conectadoEm)}
                {conta.viaOauth ? '' : ' pela chave de acesso'}.
              </p>
              <p class="texto-suave">Pix, cartão de crédito (em até 12×) e boleto. O arquivo é liberado no instante em que o Mercado Pago confirma o pagamento.</p>
              <form method="post" action="/painel/pagamentos/desconectar">
                <Botao tipo="perigo" pequeno confirmar="Desconectar o Mercado Pago? A loja para de aceitar pagamento até você conectar de novo." confirmarCom="Desconectar">
                  Desconectar
                </Botao>
              </form>
            </>
          ) : (
            <>
              <p>
                Conecte a <strong>sua</strong> conta do Mercado Pago. O dinheiro de cada venda vai direto para ela: a Lojinha Pronta nunca toca nele.
              </p>
              <ul class="lista-check">
                <li>
                  <Icone nome="check" />
                  Pix, cartão em até 12× e boleto
                </li>
                <li>
                  <Icone nome="check" />
                  Arquivo liberado sozinho quando o pagamento cai
                </li>
                <li>
                  <Icone nome="check" />
                  Taxas do Mercado Pago, sem nada a mais da nossa parte
                </li>
              </ul>
              {temBotao ? (
                <div>
                  <Botao href="/painel/pagamentos/conectar">Conectar Mercado Pago</Botao>
                </div>
              ) : (
                <Nota tipo="info">A conexão com um clique ainda não foi ativada na plataforma. Use a chave de acesso abaixo.</Nota>
              )}
            </>
          )}
        </Cartao>

        {!conta && (
          <Cartao titulo={temBotao ? 'Prefere colar a chave de acesso?' : 'Conectar pela chave de acesso'}>
            <ol class="passo-a-passo">
              <li>
                Entre em{' '}
                <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener">
                  mercadopago.com.br/developers
                </a>{' '}
                com a conta que vai receber.
              </li>
              <li>
                Crie uma aplicação (qualquer nome, ex.: “Minha loja”), tipo <strong>Pagamentos online</strong>.
              </li>
              <li>
                Abra <strong>Credenciais de produção</strong> e copie o <strong>Access Token</strong> — começa com <code>APP_USR-</code>.
              </li>
            </ol>
            <form method="post" action="/painel/pagamentos/chave" class="form" data-enviando="Conferindo a chave…">
              <Campo
                rotulo="Access Token de produção"
                nome="token"
                obrigatorio
                placeholder="APP_USR-..."
                autocomplete="off"
                max={300}
                ajuda="A chave fica guardada cifrada e só é usada para criar cobranças e consultar pagamentos da sua loja."
              />
              <div>
                <Botao tipo="secundario">Conectar</Botao>
              </div>
            </form>
          </Cartao>
        )}
      </div>,
    )
  })

  app.get('/pagamentos/conectar', async (c) => {
    if (!c.env.MP_CLIENT_ID) return c.redirect('/painel/pagamentos')
    const state = await assinar(c.env, `${c.get('loja').id}|${Date.now()}`)
    return c.redirect(urlAutorizacao(c.env.MP_CLIENT_ID, `${c.env.APP_URL}/painel/pagamentos/retorno`, state))
  })

  app.get('/pagamentos/retorno', async (c) => {
    const l = c.get('loja')
    const code = c.req.query('code')
    const estado = await abrirAssinado(c.env, c.req.query('state') ?? '')
    const [lojaId, quando] = (estado ?? '').split('|')
    if (!code || lojaId !== l.id || Date.now() - Number(quando) > 30 * 60_000) {
      avisar(c, 'A conexão não foi concluída. Tente de novo.', 'erro')
      return c.redirect('/painel/pagamentos')
    }
    try {
      const t = await trocarCodigo(c.env.MP_CLIENT_ID!, c.env.MP_CLIENT_SECRET!, code, `${c.env.APP_URL}/painel/pagamentos/retorno`)
      const { conta } = await salvarConta(c.env, l.id, {
        token: t.access_token,
        refresh: t.refresh_token,
        publicKey: t.public_key,
        expiraEm: new Date(Date.now() + t.expires_in * 1000).toISOString(),
        viaOauth: true,
      })
      avisar(c, `Mercado Pago conectado (${conta}). Sua loja já pode vender!`)
    } catch (e) {
      console.error('[oauth mp]', e)
      avisar(c, 'O Mercado Pago não confirmou a conexão. Tente de novo.', 'erro')
    }
    return c.redirect('/painel/pagamentos')
  })

  app.post('/pagamentos/chave', async (c) => {
    const token = campo((await c.req.parseBody()).token, 300)
    if (!/^APP_USR-[\w-]{20,}$/.test(token)) {
      avisar(c, token.startsWith('TEST-') ? 'Essa é a chave de teste. Use a de produção, que começa com APP_USR-.' : 'Essa chave não parece um Access Token de produção (começa com APP_USR-).', 'erro')
      return c.redirect('/painel/pagamentos')
    }
    try {
      const { conta } = await salvarConta(c.env, c.get('loja').id, { token, viaOauth: false })
      avisar(c, `Mercado Pago conectado (${conta}). Sua loja já pode vender!`)
    } catch (e) {
      const recusada = e instanceof ErroMP && (e.status === 401 || e.status === 403)
      avisar(c, recusada ? 'O Mercado Pago recusou essa chave. Confira se copiou inteira.' : 'Não consegui falar com o Mercado Pago agora. Tente de novo.', 'erro')
    }
    return c.redirect('/painel/pagamentos')
  })

  app.post('/pagamentos/desconectar', async (c) => {
    await desconectarConta(c.env, c.get('loja').id)
    avisar(c, 'Mercado Pago desconectado. A loja não aceita pagamento até conectar de novo.')
    return c.redirect('/painel/pagamentos')
  })

  // ── plano da plataforma (Stripe) ────────────────────────────────────────
  app.get('/plano', async (c) => {
    let l = c.get('loja')
    const ligado = stripeLigado(c.env)
    // Voltou do Checkout, ou a assinatura pode ter mudado no Stripe: confere antes de mostrar.
    const sessao = c.req.query('checkout')
    if (ligado) {
      try {
        if (sessao && /^cs_[\w]{8,200}$/.test(sessao)) await concluirCheckout(c.env, l, sessao)
        else if (l.assinatura_id && Date.now() - Date.parse(l.atualizada_em) > 60_000) await sincronizarAssinatura(c.env, l.assinatura_id)
        l = (await c.env.DB.prepare('SELECT * FROM lojas WHERE id = ?').bind(l.id).first<Loja>()) ?? l
        c.set('loja', l)
      } catch (e) {
        console.error('[plano] conferir no Stripe', e)
      }
    }
    const lista = await listarPlanos(c.env)
    const atual = await buscarPlano(c.env, l.plano_id)
    const s = situacaoDaAssinatura(l)
    // Tem assinatura valendo (mesmo cancelada no fim do período): troca de plano, não assina de novo.
    // Atrasada há mais de 14 dias também: o caminho é trocar o cartão, não abrir uma segunda assinatura.
    const comAssinatura = s.tipo === 'assinante' || (s.tipo === 'cancelada' && l.assinatura_status !== 'canceled') || l.assinatura_status === 'past_due'
    const noTesteDoStripe = l.assinatura_status === 'trialing'

    return tela(
      c,
      { ativo: 'plano', titulo: 'Plano' },
      <>
        <Cartao titulo="Situação" acao={<EtiquetaPlano s={s} status={l.assinatura_status} />}>
          {s.tipo === 'assinante' && (
            <p>
              Plano <strong>{atual?.nome}</strong>, {atual ? reais(atual.preco_centavos) : ''}/mês
              {l.assinatura_valida_ate ? ` · ${noTesteDoStripe ? 'primeira cobrança' : 'próxima cobrança'} em ${dataBR(l.assinatura_valida_ate)}` : ''}.
            </p>
          )}
          {s.tipo === 'assinante' && s.atrasada && (
            <Nota tipo="erro">O cartão foi recusado. O Stripe vai tentar de novo nos próximos dias: atualize o cartão para não perder a loja.</Nota>
          )}
          {s.tipo === 'teste' && (
            <p>
              O teste termina em {dataBR(s.ate)} ({plural(diasAte(s.ate), 'dia', 'dias')}). Assinando agora, a primeira cobrança só acontece quando o teste acabar.
            </p>
          )}
          {s.tipo === 'cancelada' && <p>A loja fica no ar até {dataBR(s.ate)} e a assinatura não renova.</p>}
          {s.tipo === 'vencida' && l.assinatura_status === 'past_due' && (
            <p>A mensalidade está atrasada há mais de 14 dias. Atualize o cartão: assim que o Stripe conseguir cobrar, a loja volta do jeito que estava.</p>
          )}
          {s.tipo === 'vencida' && l.assinatura_status !== 'past_due' && <p>Assine um plano e a loja volta na hora, do jeito que estava.</p>}
          {!ligado && <Nota tipo="info">A cobrança das assinaturas ainda não foi ativada na plataforma. Os botões de assinar ficam desligados até lá.</Nota>}
          {ligado && l.stripe_cliente_id && (
            <div>
              <Botao href="/painel/plano/cartao" tipo="secundario" pequeno icone="pagamentos">
                Trocar cartão e ver faturas
              </Botao>
            </div>
          )}
        </Cartao>

        <form method="post" action={comAssinatura ? '/painel/plano/trocar' : '/painel/plano/assinar'} data-enviando={comAssinatura ? 'Trocando…' : 'Abrindo o pagamento…'}>
          <CartoesPlanos
            planos={lista}
            acao={(p, destaque) =>
              comAssinatura && atual?.id === p.id ? (
                <span class="plano__atual">
                  <Icone nome="check" /> Seu plano
                </span>
              ) : (
                <Botao
                  nome="plano"
                  valor={p.id}
                  largo
                  tipo={destaque && !comAssinatura ? 'principal' : 'secundario'}
                  desabilitado={!ligado}
                  confirmar={comAssinatura ? `Mudar para o plano ${p.nome}? O novo valor, ${reais(p.preco_centavos)}/mês, vale a partir da próxima cobrança.` : undefined}
                  confirmarCom={comAssinatura ? `Mudar para ${p.nome}` : undefined}
                >
                  {comAssinatura ? `Mudar para ${p.nome}` : `Assinar ${p.nome}`}
                </Botao>
              )
            }
          />
        </form>
        {!comAssinatura && ligado && <p class="campo__ajuda">Pagamento no cartão de crédito, pelo ambiente seguro do Stripe. Cancele quando quiser.</p>}

        {s.tipo === 'assinante' && (
          <Cartao class="cartao--perigo" titulo="Cancelar assinatura" descricao="A loja continua no ar até o fim do período já pago. Depois sai do ar, mas nada é apagado: assinando de novo, volta igual.">
            <form method="post" action="/painel/plano/cancelar">
              <Botao tipo="perigo" confirmar="Cancelar a assinatura? A loja fica no ar até o fim do período pago." confirmarCom="Cancelar assinatura">
                Cancelar assinatura
              </Botao>
            </form>
          </Cartao>
        )}
        {s.tipo === 'cancelada' && comAssinatura && (
          <Cartao titulo="Mudou de ideia?" descricao="A assinatura volta a renovar e nada muda na loja.">
            <form method="post" action="/painel/plano/reativar">
              <Botao>Continuar assinando</Botao>
            </form>
          </Cartao>
        )}
      </>,
    )
  })

  app.post('/plano/assinar', async (c) => {
    const p = await buscarPlano(c.env, campo((await c.req.parseBody()).plano, 40))
    if (!p || !p.ativo) {
      avisar(c, 'Escolha um plano.', 'erro')
      return c.redirect('/painel/plano')
    }
    try {
      return c.redirect(await iniciarAssinatura(c.env, c.get('loja'), p, c.get('usuario').email, c.env.APP_URL))
    } catch (e) {
      console.error('[assinar]', e)
      avisar(c, 'Não consegui abrir o pagamento agora. Tente de novo em instantes.', 'erro')
      return c.redirect('/painel/plano')
    }
  })

  const acao = (caminho: string, fazer: (c: Ctx) => Promise<string>, erro: string) =>
    app.post(caminho, async (c) => {
      try {
        avisar(c, await fazer(c))
      } catch (e) {
        if (e instanceof ErroDeEscolha) avisar(c, e.message, 'erro')
        else {
          console.error(`[${caminho}]`, e)
          avisar(c, erro, 'erro')
        }
      }
      return c.redirect('/painel/plano')
    })

  acao(
    '/plano/trocar',
    async (c) => {
      const p = await buscarPlano(c.env, campo((await c.req.parseBody()).plano, 40))
      if (!p || !p.ativo) throw new ErroDeEscolha('Escolha um plano.')
      await trocarPlano(c.env, c.get('loja'), p)
      return `Plano trocado para ${p.nome}. O novo valor vale a partir da próxima cobrança.`
    },
    'Não consegui trocar o plano agora. Tente de novo.',
  )
  acao(
    '/plano/cancelar',
    async (c) => {
      await cancelarAssinatura(c.env, c.get('loja'))
      return 'Assinatura cancelada. A loja fica no ar até o fim do período pago.'
    },
    'Não consegui cancelar agora. Tente de novo.',
  )
  acao(
    '/plano/reativar',
    async (c) => {
      await reativarAssinatura(c.env, c.get('loja'))
      return 'Pronto, a assinatura continua.'
    },
    'Não consegui reativar agora. Tente de novo.',
  )

  // Portal do Stripe: a lojista troca o cartão e baixa as faturas lá.
  app.get('/plano/cartao', async (c) => {
    try {
      const url = await portalDeCobranca(c.env, c.get('loja'), c.env.APP_URL)
      if (url) return c.redirect(url)
    } catch (e) {
      console.error('[portal]', e)
    }
    avisar(c, 'Não consegui abrir a página de cobrança agora. Tente de novo.', 'erro')
    return c.redirect('/painel/plano')
  })
}
