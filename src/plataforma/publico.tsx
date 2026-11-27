/**
 * O que se vê sem login no endereço da plataforma: apresentação com os planos,
 * criar loja, entrar e recuperar senha.
 */
import { Hono } from 'hono'
import type { Env, Plano } from '../tipos'
import { TelaCentral } from './layout'
import { PaginaInicial } from './site'
import { Botao, Campo, Etiqueta, Icone, avisar, lerAviso, type Aviso } from './ui'
import { planos as listarPlanos } from '../lib/lojas'
import { agora, campo, emailValido, lista, reais, slugificar, somarDias } from '../lib/formato'
import { enderecoVisivel, slugDoNome, slugValido } from '../lib/dominio'
import { conferirSenha, gerarId, gerarToken, hashSenha, sha256 } from '../lib/seguranca'
import { abrirSessao, fecharSessao, limparTentativas, registrarTentativa, tentativasRecentes, usuarioDaSessao } from '../lib/sessao'
import { contarPorIp, excedeuPorIp, gastarTempoDeSenha, passouNoTurnstile, problemaNaSenha, turnstileLigado } from '../lib/protecao'
import { enviarEmail, moldeEmail } from '../lib/email'

const app = new Hono<{ Bindings: Env }>()

// ── apresentação ───────────────────────────────────────────────────────────

/** O plano em destaque é o último (o mais completo). `acao` desenha o botão de cada um. */
export function CartoesPlanos({ planos, acao }: { planos: Plano[]; acao?: (p: Plano, destaque: boolean) => any }) {
  return (
    <div class="planos">
      {planos.map((p, i) => {
        const destaque = i === planos.length - 1 && planos.length > 1
        return (
          <article class={`plano${destaque ? ' plano--destaque' : ''}`}>
            <div class="plano__topo">
              <h3>{p.nome}</h3>
              {destaque && <Etiqueta cor="azul">Recomendado</Etiqueta>}
            </div>
            <p class="plano__desc">{p.descricao}</p>
            <p class="plano__preco">
              <strong>{reais(p.preco_centavos)}</strong>
              <span>/mês</span>
            </p>
            <ul class="lista-check">
              {lista(p.recursos).map((r) => (
                <li>
                  <Icone nome="check" />
                  {r}
                </li>
              ))}
            </ul>
            {acao ? acao(p, destaque) : <Botao href="/cadastro" largo tipo={destaque ? 'principal' : 'secundario'}>Começar teste grátis</Botao>}
          </article>
        )
      })}
    </div>
  )
}

app.get('/', async (c) => {
  if (await usuarioDaSessao(c)) return c.redirect('/painel')
  // A apresentação só existe no domínio raiz (lojinhapronta.com.br). Em app. a
  // raiz leva para lá. No computador (APP_URL em localhost) ela continua aqui.
  const raiz = c.env.DOMINIO_RAIZ.toLowerCase()
  const host = new URL(c.req.url).hostname.toLowerCase()
  const appNoAr = new URL(c.env.APP_URL).hostname.toLowerCase().endsWith(`.${raiz}`)
  if (appNoAr && host !== raiz) return c.redirect(`${c.env.SITE_URL}/${new URL(c.req.url).search}`, 302)
  return c.html(<PaginaInicial env={c.env} planos={await listarPlanos(c.env)} />)
})

// ── criar loja ─────────────────────────────────────────────────────────────

/** Desafio anti-robô do Cloudflare. Quase sempre invisível para gente de verdade. */
function AntiRobo({ env }: { env: Env }) {
  if (!turnstileLigado(env)) return null
  return (
    <>
      <div class="cf-turnstile" data-sitekey={env.TURNSTILE_SITEKEY} data-language="pt-br" data-theme="light" data-size="flexible"></div>
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    </>
  )
}

const AJUDA_SLUG = 'Se deixar em branco, criamos a partir do nome da loja. Só letras sem acento, números e hífen.'

const MSG_ROBO = 'Não conseguimos confirmar que é você. Recarregue a página e tente de novo.'

type DadosCadastro = { nome: string; email: string; email2: string; loja: string; slug: string }

const ETAPAS = ['Sua loja', 'Seus dados', 'Senha']
/** Em qual etapa cada campo mora: um erro devolve a pessoa direto para ela. */
const ETAPA_DO_CAMPO: Record<string, number> = { loja: 1, slug: 1, nome: 2, email: 2, email2: 2, senha: 3, senha2: 3, robo: 3 }

function FormCadastro({ env, d, erros, aviso }: { env: Env; d: DadosCadastro; erros: Record<string, string>; aviso?: Aviso | null }) {
  const comErro = Object.keys(erros).map((k) => ETAPA_DO_CAMPO[k] ?? 1)
  const inicial = comErro.length ? Math.min(...comErro) : 1
  return (
    <TelaCentral
      titulo="Crie sua loja"
      subtitulo={`${env.DIAS_TESTE} dias grátis, sem cartão. Você pode mudar tudo depois.`}
      aviso={aviso}
      rodape={
        <>
          Já tem loja? <a href="/entrar">Entrar</a>
        </>
      }
    >
      <form method="post" action="/cadastro" class="form form--etapas" data-etapas data-etapa-inicial={String(inicial)} data-enviando="Criando a loja…">
        <ol class="etapas" aria-label="Etapas do cadastro">
          {ETAPAS.map((t, i) => (
            <li data-indicador={String(i + 1)} class={i + 1 === inicial ? 'atual' : i + 1 < inicial ? 'feita' : undefined}>
              <span>{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>

        <fieldset class="etapa" data-etapa="1">
          <legend>Sua loja</legend>
          <Campo rotulo="Nome da loja" nome="loja" valor={d.loja} obrigatorio max={60} placeholder="Ex.: Ateliê da Ana" erro={erros.loja} autofocus />
          <Campo
            rotulo="Endereço da loja (opcional)"
            nome="slug"
            valor={d.slug}
            max={40}
            sufixo={`.${env.DOMINIO_RAIZ}`}
            placeholder="ateliedaana"
            autocomplete="off"
            erro={erros.slug}
            ajuda={
              <span data-slug-status aria-live="polite">
                {AJUDA_SLUG}
              </span>
            }
          />
          <div class="etapa__botoes">
            <button type="button" class="botao botao--principal botao--grande" data-avancar>
              Continuar
            </button>
          </div>
        </fieldset>

        <fieldset class="etapa" data-etapa="2">
          <legend>Seus dados</legend>
          <Campo rotulo="Seu nome" nome="nome" valor={d.nome} obrigatorio max={80} autocomplete="name" erro={erros.nome} />
          <Campo rotulo="E-mail" nome="email" tipo="email" valor={d.email} obrigatorio max={200} autocomplete="email" modo="email" erro={erros.email} ajuda="É por ele que você entra no painel e recebe os avisos de venda." />
          <Campo rotulo="Confirme o e-mail" nome="email2" tipo="email" valor={d.email2} obrigatorio max={200} autocomplete="off" modo="email" erro={erros.email2} />
          <div class="etapa__botoes">
            <button type="button" class="botao botao--secundario botao--grande" data-voltar>
              Voltar
            </button>
            <button type="button" class="botao botao--principal botao--grande" data-avancar>
              Continuar
            </button>
          </div>
        </fieldset>

        <fieldset class="etapa" data-etapa="3">
          <legend>Senha</legend>
          <Campo
            rotulo="Senha"
            nome="senha"
            tipo="password"
            obrigatorio
            min={8}
            max={128}
            autocomplete="new-password"
            erro={erros.senha}
            ajuda="Pelo menos 8 caracteres. Uma frase curta é mais forte que uma palavra com símbolos."
          />
          <Campo rotulo="Confirme a senha" nome="senha2" tipo="password" obrigatorio min={8} max={128} autocomplete="new-password" erro={erros.senha2} />
          {/* Isca para robô: escondida de gente, robô preenche tudo. */}
          <div class="isca" aria-hidden="true">
            <label>
              Site <input name="site" tabindex={-1} autocomplete="off" />
            </label>
          </div>
          <AntiRobo env={env} />
          {erros.robo && (
            <p class="campo__erro" role="alert">
              <Icone nome="alerta" />
              {erros.robo}
            </p>
          )}
          <div class="etapa__botoes">
            <button type="button" class="botao botao--secundario botao--grande" data-voltar>
              Voltar
            </button>
            <Botao grande>
              Criar minha loja
            </Botao>
          </div>
        </fieldset>
      </form>
    </TelaCentral>
  )
}

app.get('/cadastro', async (c) => {
  if (await usuarioDaSessao(c)) return c.redirect('/painel')
  return c.html(<FormCadastro env={c.env} d={{ nome: '', email: '', email2: '', loja: '', slug: '' }} erros={{}} aviso={lerAviso(c)} />)
})

/** Usado pelo campo de endereço enquanto a pessoa digita. */
app.get('/api/endereco', async (c) => {
  if (await excedeuPorIp(c, 'endereco', 200, 15)) return c.json({ livre: false, motivo: 'Muitas consultas. Espere um pouco.' }, 429)
  await contarPorIp(c, 'endereco')
  // Campo vazio: mostra qual endereço a loja vai ganhar a partir do nome.
  const nome = c.req.query('nome')
  if (nome !== undefined) return c.json({ slug: await slugLivreDoNome(c.env, nome), livre: true, auto: true })
  const slug = slugificar(c.req.query('s') ?? '', 40)
  const erro = slugValido(slug)
  if (erro) return c.json({ slug, livre: false, motivo: erro })
  const existe = await c.env.DB.prepare('SELECT 1 FROM lojas WHERE slug = ?').bind(slug).first()
  return c.json({ slug, livre: !existe, motivo: existe ? 'Esse endereço já tem dona. Tente outro.' : null })
})

/** Primeiro endereço livre tirado do nome: "ateliedaana", "ateliedaana-2"… */
async function slugLivreDoNome(env: Env, nome: string): Promise<string> {
  for (let n = 1; n < 50; n++) {
    const s = slugDoNome(nome, n)
    if (!(await env.DB.prepare('SELECT 1 FROM lojas WHERE slug = ?').bind(s).first())) return s
  }
  return slugDoNome(nome, 1000 + Math.floor(Math.random() * 9000))
}

app.post('/cadastro', async (c) => {
  const f = await c.req.parseBody()
  const d: DadosCadastro = {
    nome: campo(f.nome, 80),
    email: campo(f.email, 200).toLowerCase(),
    email2: campo(f.email2, 200).toLowerCase(),
    loja: campo(f.loja, 60),
    slug: slugificar(campo(f.slug, 60), 40),
  }
  // Endereço é opcional: em branco, sai do nome da loja (e nunca dá "já tem dona").
  const slugAutomatico = !d.slug
  const senha = String(f.senha ?? '')
  const erros: Record<string, string> = {}
  if (f.site) return c.text('Não foi possível criar a loja.', 400) // isca preenchida: robô
  // Até 5 lojas por endereço de internet por dia.
  if (await excedeuPorIp(c, 'cadastro', 5, 24 * 60)) {
    return c.html(<FormCadastro env={c.env} d={d} erros={{}} aviso={{ tipo: 'erro', texto: 'Muitas lojas criadas a partir desta conexão hoje. Tente amanhã ou fale com o suporte.' }} />, 429)
  }
  if (!(await passouNoTurnstile(c, f['cf-turnstile-response']))) {
    return c.html(<FormCadastro env={c.env} d={d} erros={{ robo: MSG_ROBO }} />, 400)
  }
  if (d.loja.length < 2) erros.loja = 'Dê um nome para a loja.'
  const eSlug = slugAutomatico ? null : slugValido(d.slug)
  if (eSlug) erros.slug = eSlug
  if (d.nome.length < 2) erros.nome = 'Como você se chama?'
  if (!emailValido(d.email)) erros.email = 'E-mail inválido.'
  else if (d.email2 !== d.email) erros.email2 = 'Os dois e-mails não são iguais.'
  const eSenha = await problemaNaSenha(senha, d.email)
  if (eSenha) erros.senha = eSenha
  else if (String(f.senha2 ?? '') !== senha) erros.senha2 = 'As duas senhas não são iguais.'

  if (!erros.email && (await c.env.DB.prepare('SELECT 1 FROM usuarios WHERE email = ?').bind(d.email).first())) {
    erros.email = 'Já existe uma conta com esse e-mail. Entre por ela.'
  }
  if (!slugAutomatico && !erros.slug && (await c.env.DB.prepare('SELECT 1 FROM lojas WHERE slug = ?').bind(d.slug).first())) {
    erros.slug = 'Esse endereço já tem dona. Tente outro.'
  }
  if (Object.keys(erros).length) {
    return c.html(<FormCadastro env={c.env} d={d} erros={erros} />, 422)
  }
  const slug = slugAutomatico ? await slugLivreDoNome(c.env, d.loja) : d.slug

  const usuarioId = gerarId()
  const lojaId = gerarId()
  const t = agora()
  try {
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO usuarios (id, email, nome, senha_hash, criado_em) VALUES (?, ?, ?, ?, ?)').bind(
        usuarioId,
        d.email,
        d.nome,
        await hashSenha(senha),
        t,
      ),
      c.env.DB.prepare(
        `INSERT INTO lojas (id, dono_id, slug, nome, descricao, email_contato, responsavel, teste_ate, criada_em, atualizada_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(lojaId, usuarioId, slug, d.loja, 'Material digital para baixar na hora.', d.email, d.nome, somarDias(t, Number(c.env.DIAS_TESTE) || 7), t, t),
    ])
  } catch (e) {
    // Corrida: alguém pegou o mesmo e-mail ou endereço no mesmo segundo.
    console.error('[cadastro]', e)
    const erro: Record<string, string> = slugAutomatico ? { loja: 'Não deu para criar agora. Tente de novo.' } : { slug: 'Esse endereço acabou de ser usado. Tente outro.' }
    return c.html(<FormCadastro env={c.env} d={d} erros={erro} />, 409)
  }
  await contarPorIp(c, 'cadastro')
  await abrirSessao(c, usuarioId)
  avisar(c, `Sua loja foi criada em ${enderecoVisivel(c.env, { slug, dominio: null })}! Siga os passos abaixo para começar a vender.`)
  return c.redirect('/painel')
})

// ── entrar e sair ──────────────────────────────────────────────────────────

/** Para onde voltar depois de entrar: só caminhos do próprio painel. */
function voltaSegura(v: string | undefined): string {
  if (!v || v.length > 300 || /[\\\s]/.test(v) || v.startsWith('//')) return '/painel'
  return /^\/(painel|admin)(\/|\?|$)/.test(v) ? v : '/painel'
}

function FormEntrar({ env, email, volta, aviso }: { env: Env; email?: string; volta?: string; aviso?: Aviso | null }) {
  return (
    <TelaCentral
      titulo="Entrar"
      subtitulo="Acesse o painel da sua loja."
      aviso={aviso}
      rodape={
        <>
          Ainda não tem loja? <a href="/cadastro">Criar loja grátis</a>
        </>
      }
    >
      <form method="post" action={`/entrar${volta ? `?volta=${encodeURIComponent(volta)}` : ''}`} class="form">
        <Campo rotulo="E-mail" nome="email" tipo="email" valor={email} obrigatorio max={200} autocomplete="username" modo="email" autofocus={!email} />
        <Campo rotulo="Senha" nome="senha" tipo="password" obrigatorio max={128} autocomplete="current-password" autofocus={!!email} />
        <AntiRobo env={env} />
        <Botao grande largo>
          Entrar
        </Botao>
        <p class="form__rodape">
          <a href="/esqueci">Esqueci a senha</a>
        </p>
      </form>
    </TelaCentral>
  )
}

app.get('/entrar', async (c) => {
  if (await usuarioDaSessao(c)) return c.redirect(voltaSegura(c.req.query('volta')))
  return c.html(<FormEntrar env={c.env} volta={c.req.query('volta')} aviso={lerAviso(c)} />)
})

app.post('/entrar', async (c) => {
  const f = await c.req.parseBody()
  const email = campo(f.email, 200).toLowerCase()
  const senha = String(f.senha ?? '').slice(0, 128)
  const volta = c.req.query('volta')
  const erro = (texto: string, status: number) => c.html(<FormEntrar env={c.env} email={email} volta={volta} aviso={{ tipo: 'erro', texto }} />, status as any)

  // Dois freios: 10 erros por e-mail e 30 erros por conexão, a cada 15 minutos.
  if ((await tentativasRecentes(c.env, email)) >= 10 || (await excedeuPorIp(c, 'entrar', 30, 15))) {
    return erro('Muitas tentativas. Espere 15 minutos ou redefina a senha.', 429)
  }
  if (!(await passouNoTurnstile(c, f['cf-turnstile-response']))) return erro(MSG_ROBO, 400)

  const u = await c.env.DB.prepare('SELECT id, senha_hash FROM usuarios WHERE email = ?').bind(email).first<{ id: string; senha_hash: string }>()
  // Sem conta, confere contra um hash falso: a resposta demora o mesmo, e o
  // tempo não entrega quais e-mails têm loja.
  const ok = u ? await conferirSenha(senha, u.senha_hash) : (await gastarTempoDeSenha(senha), false)
  if (!u || !ok) {
    await registrarTentativa(c.env, email)
    await contarPorIp(c, 'entrar')
    return erro('E-mail ou senha não conferem.', 401)
  }
  await limparTentativas(c.env, email)
  await abrirSessao(c, u.id)
  return c.redirect(voltaSegura(volta))
})

app.post('/sair', async (c) => {
  await fecharSessao(c)
  return c.redirect('/entrar')
})

// ── esqueci a senha ────────────────────────────────────────────────────────

app.get('/esqueci', (c) =>
  c.html(
    <TelaCentral titulo="Redefinir senha" subtitulo="Mandamos um link para o seu e-mail." aviso={lerAviso(c)}>
      <form method="post" action="/esqueci" class="form">
        <Campo rotulo="E-mail da conta" nome="email" tipo="email" obrigatorio max={200} autocomplete="email" modo="email" autofocus />
        <AntiRobo env={c.env} />
        <Botao grande largo>
          Enviar link
        </Botao>
        <p class="form__rodape">
          <a href="/entrar">Voltar para entrar</a>
        </p>
      </form>
    </TelaCentral>,
  ),
)

app.post('/esqueci', async (c) => {
  const f = await c.req.parseBody()
  const email = campo(f.email, 200).toLowerCase()
  if (await excedeuPorIp(c, 'esqueci', 5, 60)) {
    avisar(c, 'Muitos pedidos a partir desta conexão. Espere uma hora e tente de novo.', 'erro')
    return c.redirect('/esqueci')
  }
  await contarPorIp(c, 'esqueci')
  if (!(await passouNoTurnstile(c, f['cf-turnstile-response']))) {
    avisar(c, MSG_ROBO, 'erro')
    return c.redirect('/esqueci')
  }
  if (!c.env.RESEND_API_KEY) {
    avisar(c, 'O envio de e-mail ainda não está ligado. Fale com o suporte da Lojinha Pronta para redefinir sua senha.', 'erro')
    return c.redirect('/esqueci')
  }
  const u = await c.env.DB.prepare('SELECT id, nome FROM usuarios WHERE email = ?').bind(email).first<{ id: string; nome: string }>()
  if (u && (await tentativasRecentes(c.env, `reset:${email}`)) < 3) {
    await registrarTentativa(c.env, `reset:${email}`)
    const token = gerarToken()
    await c.env.DB.prepare('INSERT INTO redefinicoes_senha (id, usuario_id, expira_em) VALUES (?, ?, ?)')
      .bind(await sha256(token), u.id, new Date(Date.now() + 3_600_000).toISOString())
      .run()
    const link = `${new URL(c.req.url).origin}/redefinir/${token}`
    await enviarEmail(c.env, {
      para: email,
      nomeRemetente: 'Lojinha Pronta',
      assunto: 'Redefinir sua senha da Lojinha Pronta',
      html: moldeEmail({
        cor: '#124559',
        titulo: 'Redefinir senha',
        paragrafos: ['Alguém (provavelmente você) pediu para trocar a senha. O link vale por 1 hora.', 'Se não foi você, ignore este e-mail.'],
        botao: { texto: 'Criar nova senha', url: link },
        rodape: 'Lojinha Pronta',
      }),
    })
  }
  avisar(c, 'Se existir uma conta com esse e-mail, o link chega em alguns minutos. Confira o spam.')
  return c.redirect('/entrar')
})

app.get('/redefinir/:token', (c) =>
  c.html(
    <TelaCentral titulo="Nova senha">
      <form method="post" class="form">
        <Campo rotulo="Nova senha" nome="senha" tipo="password" obrigatorio min={8} max={128} autocomplete="new-password" autofocus />
        <Botao grande largo>
          Salvar e entrar
        </Botao>
      </form>
    </TelaCentral>,
  ),
)

app.post('/redefinir/:token', async (c) => {
  const senha = String((await c.req.parseBody()).senha ?? '')
  const id = await sha256(c.req.param('token'))
  const r = await c.env.DB.prepare('SELECT usuario_id FROM redefinicoes_senha WHERE id = ? AND usado_em IS NULL AND expira_em > ?')
    .bind(id, agora())
    .first<{ usuario_id: string }>()
  if (!r) {
    avisar(c, 'Esse link expirou ou já foi usado. Peça outro.', 'erro')
    return c.redirect('/esqueci')
  }
  const eSenha = await problemaNaSenha(senha)
  if (eSenha) {
    return c.html(
      <TelaCentral titulo="Nova senha" aviso={{ tipo: 'erro', texto: eSenha }}>
        <form method="post" class="form">
          <Campo rotulo="Nova senha" nome="senha" tipo="password" obrigatorio min={8} max={128} autocomplete="new-password" autofocus />
          <Botao grande largo>
          Salvar e entrar
        </Botao>
        </form>
      </TelaCentral>,
      422,
    )
  }
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').bind(await hashSenha(senha), r.usuario_id),
    c.env.DB.prepare('UPDATE redefinicoes_senha SET usado_em = ? WHERE id = ?').bind(agora(), id),
    c.env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(r.usuario_id),
  ])
  await abrirSessao(c, r.usuario_id)
  avisar(c, 'Senha trocada.')
  return c.redirect('/painel')
})

export default app
