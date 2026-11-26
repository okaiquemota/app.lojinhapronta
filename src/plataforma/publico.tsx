/**
 * O que se vê sem login no endereço da plataforma: apresentação com os planos,
 * criar loja, entrar e recuperar senha.
 */
import { Hono } from 'hono'
import type { Env, Plano } from '../tipos'
import { TelaCentral } from './layout'
import { PaginaInicial } from './site'
import { Botao, Campo, avisar, lerAviso, type Aviso } from './ui'
import { planos as listarPlanos } from '../lib/lojas'
import { agora, campo, emailValido, lista, reais, slugificar, somarDias } from '../lib/formato'
import { slugValido } from '../lib/dominio'
import { conferirSenha, gerarId, gerarToken, hashSenha, sha256 } from '../lib/seguranca'
import { abrirSessao, fecharSessao, limparTentativas, registrarTentativa, tentativasRecentes, usuarioDaSessao } from '../lib/sessao'
import { enviarEmail, moldeEmail } from '../lib/email'

const app = new Hono<{ Bindings: Env }>()

// ── apresentação ───────────────────────────────────────────────────────────

export function CartoesPlanos({ planos, acao }: { planos: Plano[]; acao?: (p: Plano) => any }) {
  return (
    <div class="planos">
      {planos.map((p, i) => (
        <article class={`plano${i === planos.length - 1 ? ' plano--destaque' : ''}`}>
          <h3>{p.nome}</h3>
          <p class="plano__desc">{p.descricao}</p>
          <p class="plano__preco">
            <strong>{reais(p.preco_centavos)}</strong>
            <span>/mês</span>
          </p>
          <ul>
            {lista(p.recursos).map((r) => (
              <li>{r}</li>
            ))}
          </ul>
          {acao ? acao(p) : <Botao href="/cadastro">Começar teste grátis</Botao>}
        </article>
      ))}
    </div>
  )
}

app.get('/', async (c) => {
  if (await usuarioDaSessao(c)) return c.redirect('/painel')
  return c.html(<PaginaInicial env={c.env} planos={await listarPlanos(c.env)} />)
})

// ── criar loja ─────────────────────────────────────────────────────────────

type DadosCadastro = { nome: string; email: string; loja: string; slug: string }

function FormCadastro({ env, d, erros, aviso }: { env: Env; d: DadosCadastro; erros: Record<string, string>; aviso?: Aviso | null }) {
  return (
    <TelaCentral
      titulo="Crie sua loja"
      subtitulo={`${env.DIAS_TESTE} dias grátis, sem cartão. Você pode mudar tudo depois.`}
      aviso={aviso}
    >
      <form method="post" action="/cadastro" class="form">
        <Campo rotulo="Nome da loja" nome="loja" valor={d.loja} obrigatorio max={60} placeholder="Ex.: Ateliê da Ana" erro={erros.loja} autofocus />
        <Campo
          rotulo="Endereço da loja"
          nome="slug"
          valor={d.slug}
          obrigatorio
          max={40}
          sufixo={`.${env.DOMINIO_RAIZ}`}
          placeholder="ateliedaana"
          autocomplete="off"
          erro={erros.slug}
          ajuda={<span data-slug-status>Só letras sem acento, números e hífen.</span>}
        />
        <hr />
        <Campo rotulo="Seu nome" nome="nome" valor={d.nome} obrigatorio max={80} autocomplete="name" erro={erros.nome} />
        <Campo rotulo="E-mail" nome="email" tipo="email" valor={d.email} obrigatorio max={200} autocomplete="email" erro={erros.email} />
        <Campo rotulo="Senha" nome="senha" tipo="password" obrigatorio min={8} max={200} autocomplete="new-password" erro={erros.senha} ajuda="Pelo menos 8 caracteres." />
        <Botao>Criar minha loja</Botao>
        <p class="form__rodape">
          Já tem loja? <a href="/entrar">Entrar</a>
        </p>
      </form>
    </TelaCentral>
  )
}

app.get('/cadastro', async (c) => {
  if (await usuarioDaSessao(c)) return c.redirect('/painel')
  return c.html(<FormCadastro env={c.env} d={{ nome: '', email: '', loja: '', slug: '' }} erros={{}} aviso={lerAviso(c)} />)
})

/** Usado pelo campo de endereço enquanto a pessoa digita. */
app.get('/api/endereco', async (c) => {
  const slug = slugificar(c.req.query('s') ?? '', 40)
  const erro = slugValido(slug)
  if (erro) return c.json({ slug, livre: false, motivo: erro })
  const existe = await c.env.DB.prepare('SELECT 1 FROM lojas WHERE slug = ?').bind(slug).first()
  return c.json({ slug, livre: !existe, motivo: existe ? 'Esse endereço já tem dona. Tente outro.' : null })
})

app.post('/cadastro', async (c) => {
  const f = await c.req.parseBody()
  const d: DadosCadastro = {
    nome: campo(f.nome, 80),
    email: campo(f.email, 200).toLowerCase(),
    loja: campo(f.loja, 60),
    slug: slugificar(campo(f.slug || f.loja, 60), 40),
  }
  const senha = String(f.senha ?? '')
  const erros: Record<string, string> = {}
  if (d.loja.length < 2) erros.loja = 'Dê um nome para a loja.'
  const eSlug = slugValido(d.slug)
  if (eSlug) erros.slug = eSlug
  if (d.nome.length < 2) erros.nome = 'Como você se chama?'
  if (!emailValido(d.email)) erros.email = 'E-mail inválido.'
  if (senha.length < 8) erros.senha = 'A senha precisa de pelo menos 8 caracteres.'

  if (!erros.email && (await c.env.DB.prepare('SELECT 1 FROM usuarios WHERE email = ?').bind(d.email).first())) {
    erros.email = 'Já existe uma conta com esse e-mail. Entre por ela.'
  }
  if (!erros.slug && (await c.env.DB.prepare('SELECT 1 FROM lojas WHERE slug = ?').bind(d.slug).first())) {
    erros.slug = 'Esse endereço já tem dona. Tente outro.'
  }
  if (Object.keys(erros).length) {
    return c.html(<FormCadastro env={c.env} d={d} erros={erros} />, 422)
  }

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
      ).bind(lojaId, usuarioId, d.slug, d.loja, 'Material digital para baixar na hora.', d.email, d.nome, somarDias(t, Number(c.env.DIAS_TESTE) || 7), t, t),
    ])
  } catch (e) {
    // Corrida: alguém pegou o mesmo e-mail ou endereço no mesmo segundo.
    console.error('[cadastro]', e)
    return c.html(<FormCadastro env={c.env} d={d} erros={{ slug: 'Esse endereço acabou de ser usado. Tente outro.' }} />, 409)
  }
  await abrirSessao(c, usuarioId)
  avisar(c, 'Sua loja foi criada! Siga os passos abaixo para começar a vender.')
  return c.redirect('/painel')
})

// ── entrar e sair ──────────────────────────────────────────────────────────

function voltaSegura(v: string | undefined): string {
  return v && v.startsWith('/') && !v.startsWith('//') ? v : '/painel'
}

function FormEntrar({ email, volta, aviso }: { email?: string; volta?: string; aviso?: Aviso | null }) {
  return (
    <TelaCentral titulo="Entrar" aviso={aviso}>
      <form method="post" action={`/entrar${volta ? `?volta=${encodeURIComponent(volta)}` : ''}`} class="form">
        <Campo rotulo="E-mail" nome="email" tipo="email" valor={email} obrigatorio autocomplete="email" autofocus={!email} />
        <Campo rotulo="Senha" nome="senha" tipo="password" obrigatorio autocomplete="current-password" autofocus={!!email} />
        <Botao>Entrar</Botao>
        <p class="form__rodape">
          <a href="/esqueci">Esqueci a senha</a> · <a href="/cadastro">Criar loja</a>
        </p>
      </form>
    </TelaCentral>
  )
}

app.get('/entrar', async (c) => {
  if (await usuarioDaSessao(c)) return c.redirect(voltaSegura(c.req.query('volta')))
  return c.html(<FormEntrar volta={c.req.query('volta')} aviso={lerAviso(c)} />)
})

app.post('/entrar', async (c) => {
  const f = await c.req.parseBody()
  const email = campo(f.email, 200).toLowerCase()
  const senha = String(f.senha ?? '')
  const volta = c.req.query('volta')

  if ((await tentativasRecentes(c.env, email)) >= 10) {
    return c.html(<FormEntrar email={email} volta={volta} aviso={{ tipo: 'erro', texto: 'Muitas tentativas. Espere 15 minutos ou redefina a senha.' }} />, 429)
  }
  const u = await c.env.DB.prepare('SELECT id, senha_hash FROM usuarios WHERE email = ?').bind(email).first<{ id: string; senha_hash: string }>()
  if (!u || !(await conferirSenha(senha, u.senha_hash))) {
    await registrarTentativa(c.env, email)
    return c.html(<FormEntrar email={email} volta={volta} aviso={{ tipo: 'erro', texto: 'E-mail ou senha não conferem.' }} />, 401)
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
        <Campo rotulo="E-mail da conta" nome="email" tipo="email" obrigatorio autocomplete="email" autofocus />
        <Botao>Enviar link</Botao>
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
        <Campo rotulo="Nova senha" nome="senha" tipo="password" obrigatorio min={8} autocomplete="new-password" autofocus />
        <Botao>Salvar e entrar</Botao>
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
  if (senha.length < 8) {
    return c.html(
      <TelaCentral titulo="Nova senha" aviso={{ tipo: 'erro', texto: 'A senha precisa de pelo menos 8 caracteres.' }}>
        <form method="post" class="form">
          <Campo rotulo="Nova senha" nome="senha" tipo="password" obrigatorio min={8} autocomplete="new-password" autofocus />
          <Botao>Salvar e entrar</Botao>
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
