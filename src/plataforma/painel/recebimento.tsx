import type { AppPainel } from './comum'
import { tela } from './comum'
import { Botao, Campo, Cartao, Etiqueta, avisar } from '../ui'
import { CartoesPlanos } from '../publico'
import { contaConectada, desconectarConta, salvarConta } from '../../lib/conta-mp'
import { trocarCodigo, urlAutorizacao, ErroMP } from '../../lib/mercadopago'
import { abrirAssinado, assinar } from '../../lib/seguranca'
import { dataBR, diasAte, emailValido, campo, plural, reais } from '../../lib/formato'
import { plano as buscarPlano, planos as listarPlanos, situacaoDaAssinatura } from '../../lib/lojas'
import { cancelarAssinatura, iniciarAssinatura, sincronizarAssinatura, trocarPlano } from '../../lib/assinaturas'

export function rotasRecebimento(app: AppPainel) {
  // ── Mercado Pago da lojista ──────────────────────────────────────────────
  app.get('/pagamentos', async (c) => {
    const l = c.get('loja')
    const conta = await contaConectada(c.env, l.id)
    const temBotao = !!(c.env.MP_CLIENT_ID && c.env.MP_CLIENT_SECRET)
    return tela(
      c,
      { ativo: 'pagamentos', titulo: 'Recebimento' },
      <>
        <Cartao titulo="Mercado Pago">
          {conta ? (
            <div class="conectado">
              <p>
                <Etiqueta cor="verde">Conectado</Etiqueta>
              </p>
              <p>
                As vendas caem na conta <strong>{conta.conta}</strong>, conectada em {dataBR(conta.conectadoEm)}
                {conta.viaOauth ? '' : ' pela chave de acesso'}.
              </p>
              <p class="texto-suave">Pix, cartão de crédito (em até 12×) e boleto. O arquivo é liberado no instante em que o Mercado Pago confirma o pagamento.</p>
              <form method="post" action="/painel/pagamentos/desconectar">
                <Botao tipo="fantasma" pequeno confirmar="Desconectar? A loja para de aceitar pagamento até você conectar de novo.">
                  Desconectar
                </Botao>
              </form>
            </div>
          ) : (
            <div class="conectar">
              <p>
                Conecte a <strong>sua</strong> conta do Mercado Pago. O dinheiro de cada venda vai direto para ela — a Lojinha Pronta nunca toca nele.
              </p>
              <ul class="lista-check">
                <li>Pix, cartão em até 12× e boleto</li>
                <li>Arquivo liberado sozinho quando o pagamento cai</li>
                <li>Taxas do Mercado Pago, sem nada a mais da nossa parte</li>
              </ul>
              {temBotao ? (
                <Botao href="/painel/pagamentos/conectar">Conectar Mercado Pago</Botao>
              ) : (
                <p class="aviso aviso--erro">A conexão com um clique ainda não foi ativada na plataforma. Use a chave de acesso abaixo.</p>
              )}
            </div>
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
            <form method="post" action="/painel/pagamentos/chave" class="form">
              <Campo rotulo="Access Token de produção" nome="token" obrigatorio placeholder="APP_USR-..." autocomplete="off" max={300} />
              <Botao tipo="secundario">Conectar</Botao>
            </form>
            <p class="campo__ajuda">A chave fica guardada cifrada e só é usada para criar cobranças e consultar pagamentos da sua loja.</p>
          </Cartao>
        )}
      </>,
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

  // ── plano da plataforma ──────────────────────────────────────────────────
  app.get('/plano', async (c) => {
    let l = c.get('loja')
    // Voltou do checkout de assinatura, ou tem uma pendente: pergunta como ficou.
    const voltou = c.req.query('preapproval_id')
    const idParaConferir = voltou && /^[\w-]{6,64}$/.test(voltou) ? voltou : l.assinatura_status === 'pending' ? l.assinatura_id : null
    if (idParaConferir && c.env.MP_ACCESS_TOKEN) {
      try {
        await sincronizarAssinatura(c.env, idParaConferir)
        l = (await c.env.DB.prepare('SELECT * FROM lojas WHERE id = ?').bind(l.id).first<any>()) ?? l
        c.set('loja', l)
      } catch (e) {
        console.error('[plano] sincronizar', e)
      }
    }
    const lista = await listarPlanos(c.env)
    const atual = await buscarPlano(c.env, l.plano_id)
    const s = situacaoDaAssinatura(l)
    const assinante = s.tipo === 'assinante'
    const cobrancaLigada = !!c.env.MP_ACCESS_TOKEN
    const email = c.get('usuario').email

    return tela(
      c,
      { ativo: 'plano', titulo: 'Plano' },
      <>
        <Cartao titulo="Situação">
          {s.tipo === 'assinante' && (
            <p>
              <Etiqueta cor="verde">Assinatura ativa</Etiqueta> Plano <strong>{atual?.nome}</strong>, {atual ? reais(atual.preco_centavos) : ''}/mês
              {l.assinatura_valida_ate ? ` · próxima cobrança em ${dataBR(l.assinatura_valida_ate)}` : ''}.
            </p>
          )}
          {s.tipo === 'teste' && (
            <p>
              <Etiqueta cor="azul">Teste grátis</Etiqueta> Termina em {dataBR(s.ate)} ({plural(diasAte(s.ate), 'dia', 'dias')}). Assinando agora, a primeira cobrança só
              acontece quando o teste acabar.
            </p>
          )}
          {s.tipo === 'cancelada' && (
            <p>
              <Etiqueta cor="amarelo">Cancelada</Etiqueta> A loja fica no ar até {dataBR(s.ate)}. Assine de novo para não sair do ar.
            </p>
          )}
          {s.tipo === 'vencida' && (
            <p>
              <Etiqueta cor="vermelho">Fora do ar</Etiqueta> Assine um plano e a loja volta na hora, do jeito que estava.
            </p>
          )}
          {l.assinatura_status === 'pending' && (
            <p class="texto-suave">Há uma assinatura iniciada e ainda não confirmada. Se você já pagou, ela aparece aqui em alguns minutos.</p>
          )}
          {!cobrancaLigada && <p class="aviso aviso--erro">A cobrança das assinaturas ainda não foi ativada na plataforma.</p>}
        </Cartao>

        <form method="post" action={assinante ? '/painel/plano/trocar' : '/painel/plano/assinar'} class="form">
          {!assinante && cobrancaLigada && (
            <Cartao>
              <Campo
                rotulo="E-mail da sua conta do Mercado Pago"
                nome="email_pagador"
                tipo="email"
                valor={email}
                obrigatorio
                ajuda="A assinatura é cobrada no cartão pelo Mercado Pago. Use o e-mail com que você entra lá."
              />
            </Cartao>
          )}
          <CartoesPlanos
            planos={lista}
            acao={(p) =>
              assinante && atual?.id === p.id ? (
                <span class="plano__atual">Seu plano</span>
              ) : (
                <Botao nome="plano" valor={p.id} tipo={assinante ? 'secundario' : 'principal'}>
                  {assinante ? `Mudar para ${p.nome}` : `Assinar ${p.nome}`}
                </Botao>
              )
            }
          />
        </form>

        {assinante && (
          <Cartao titulo="Cancelar">
            <p class="texto-suave">A loja continua no ar até o fim do mês já pago. Depois sai do ar, mas nada é apagado: assinando de novo, volta igual.</p>
            <form method="post" action="/painel/plano/cancelar">
              <Botao tipo="fantasma" pequeno confirmar="Cancelar a assinatura?">
                Cancelar assinatura
              </Botao>
            </form>
          </Cartao>
        )}
      </>,
    )
  })

  app.post('/plano/assinar', async (c) => {
    const f = await c.req.parseBody()
    const p = await buscarPlano(c.env, campo(f.plano, 40))
    const email = campo(f.email_pagador, 200).toLowerCase() || c.get('usuario').email
    if (!p || !p.ativo || !emailValido(email)) {
      avisar(c, 'Escolha um plano e confira o e-mail.', 'erro')
      return c.redirect('/painel/plano')
    }
    try {
      const url = await iniciarAssinatura(c.env, c.get('loja'), p, email, `${c.env.APP_URL}/painel/plano`)
      return c.redirect(url)
    } catch (e) {
      console.error('[assinar]', e)
      avisar(c, 'Não consegui abrir a assinatura no Mercado Pago agora. Tente de novo em instantes.', 'erro')
      return c.redirect('/painel/plano')
    }
  })

  app.post('/plano/trocar', async (c) => {
    const p = await buscarPlano(c.env, campo((await c.req.parseBody()).plano, 40))
    if (!p || !p.ativo) return c.redirect('/painel/plano')
    try {
      await trocarPlano(c.env, c.get('loja'), p)
      avisar(c, `Plano trocado para ${p.nome}. O novo valor vale a partir da próxima cobrança.`)
    } catch (e) {
      console.error('[trocar plano]', e)
      avisar(c, 'Não consegui trocar o plano agora. Tente de novo.', 'erro')
    }
    return c.redirect('/painel/plano')
  })

  app.post('/plano/cancelar', async (c) => {
    try {
      await cancelarAssinatura(c.env, c.get('loja'))
      avisar(c, 'Assinatura cancelada. A loja fica no ar até o fim do período pago.')
    } catch (e) {
      console.error('[cancelar]', e)
      avisar(c, 'Não consegui cancelar agora. Tente de novo.', 'erro')
    }
    return c.redirect('/painel/plano')
  })
}
