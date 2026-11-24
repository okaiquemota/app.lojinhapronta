import type { Child, PropsWithChildren } from 'hono/jsx'
import { raw } from 'hono/html'
import type { Env, Loja, Usuario } from '../tipos'
import { urlDaLoja, enderecoVisivel } from '../lib/dominio'
import { situacaoDaAssinatura } from '../lib/lojas'
import { diasAte, plural } from '../lib/formato'
import { ehAdmin } from '../lib/sessao'
import { CaixaAviso, Icone, type Aviso } from './ui'

const VERSAO = '1'

export function Documento(p: PropsWithChildren<{ titulo: string; descricao?: string; indexar?: boolean; classe?: string }>) {
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <title>{p.titulo}</title>
          {p.descricao && <meta name="description" content={p.descricao} />}
          {!p.indexar && <meta name="robots" content="noindex" />}
          <meta name="theme-color" content="#0a2531" />
          <link rel="icon" type="image/svg+xml" href="/_lp/favicon.svg" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
          />
          <link rel="stylesheet" href={`/_lp/plataforma.css?v=${VERSAO}`} />
          <script src={`/_lp/plataforma.js?v=${VERSAO}`} defer></script>
        </head>
        <body class={p.classe}>{p.children}</body>
      </html>
    </>
  )
}

export function Marca({ href = '/' }: { href?: string }) {
  return (
    <a class="marca" href={href}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="15" fill="#0a2531" />
        <path d="M16 24 19.5 13.5h25L48 24" fill="none" stroke="#ff6b5b" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M19 24v25.5h26V24" fill="none" stroke="#ff6b5b" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="m25.5 36 5 5 9-9.5" fill="none" stroke="#f7f5f2" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>Lojinha Pronta</span>
    </a>
  )
}

const MENU: { href: string; texto: string; icone: string; chave: string }[] = [
  { href: '/painel', texto: 'Início', icone: 'inicio', chave: 'inicio' },
  { href: '/painel/produtos', texto: 'Produtos', icone: 'produtos', chave: 'produtos' },
  { href: '/painel/categorias', texto: 'Categorias', icone: 'categorias', chave: 'categorias' },
  { href: '/painel/pedidos', texto: 'Vendas', icone: 'pedidos', chave: 'pedidos' },
  { href: '/painel/aparencia', texto: 'Aparência', icone: 'aparencia', chave: 'aparencia' },
  { href: '/painel/configuracoes', texto: 'Dados da loja', icone: 'config', chave: 'configuracoes' },
  { href: '/painel/pagamentos', texto: 'Recebimento', icone: 'pagamentos', chave: 'pagamentos' },
  { href: '/painel/plano', texto: 'Plano', icone: 'plano', chave: 'plano' },
]

/** Faixa no topo do painel com o estado do teste / assinatura. */
function FaixaPlano({ loja }: { loja: Loja }) {
  const s = situacaoDaAssinatura(loja)
  if (s.tipo === 'assinante') return null
  if (s.tipo === 'teste') {
    const d = diasAte(s.ate)
    return (
      <div class="faixa-plano">
        <span>
          Teste grátis: <strong>{d <= 1 ? 'termina hoje' : `faltam ${plural(d, 'dia', 'dias')}`}</strong>. Assine para a loja continuar no ar.
        </span>
        <a href="/painel/plano">Escolher plano</a>
      </div>
    )
  }
  if (s.tipo === 'cancelada') {
    return (
      <div class="faixa-plano">
        <span>Assinatura cancelada. A loja sai do ar em {plural(diasAte(s.ate), 'dia', 'dias')}.</span>
        <a href="/painel/plano">Reativar</a>
      </div>
    )
  }
  return (
    <div class="faixa-plano faixa-plano--forte">
      <span>
        <strong>Sua loja está fora do ar.</strong> O teste grátis acabou — assine um plano para voltar a vender.
      </span>
      <a href="/painel/plano">Assinar agora</a>
    </div>
  )
}

export function Painel(
  p: PropsWithChildren<{ env: Env; usuario: Usuario; loja: Loja; ativo: string; titulo: string; aviso?: Aviso | null; acoes?: Child; voltar?: { href: string; texto: string } }>,
) {
  const url = urlDaLoja(p.env, p.loja)
  return (
    <Documento titulo={`${p.titulo} · ${p.loja.nome}`} classe="corpo-painel">
      <input type="checkbox" id="menu-aberto" class="menu-chave" hidden />
      <aside class="lateral">
        <div class="lateral__topo">
          <Marca href="/painel" />
        </div>
        <a class="lateral__loja" href={url} target="_blank" rel="noopener">
          <span class="lateral__loja-nome">{p.loja.nome}</span>
          <span class="lateral__loja-url">
            {enderecoVisivel(p.env, p.loja)} <Icone nome="externo" />
          </span>
        </a>
        <nav class="lateral__menu" aria-label="Painel">
          {MENU.map((m) => (
            <a href={m.href} class={m.chave === p.ativo ? 'ativo' : undefined} aria-current={m.chave === p.ativo ? 'page' : undefined}>
              <Icone nome={m.icone} />
              {m.texto}
            </a>
          ))}
        </nav>
        <div class="lateral__rodape">
          {ehAdmin(p.env, p.usuario.email) && (
            <a href="/admin" class={p.ativo === 'admin' ? 'ativo' : undefined}>
              <Icone nome="admin" /> Administração
            </a>
          )}
          <a href="/painel/conta" class={p.ativo === 'conta' ? 'ativo' : undefined}>
            <Icone nome="conta" /> Minha conta
          </a>
          <form method="post" action="/sair">
            <button type="submit">
              <Icone nome="sair" /> Sair
            </button>
          </form>
        </div>
      </aside>
      <label for="menu-aberto" class="veu" aria-hidden="true"></label>
      <div class="principal">
        <FaixaPlano loja={p.loja} />
        <header class="topo">
          <label for="menu-aberto" class="topo__menu" aria-label="Abrir menu">
            <Icone nome="menu" />
          </label>
          <div class="topo__titulo">
            {p.voltar && (
              <a class="topo__voltar" href={p.voltar.href}>
                ← {p.voltar.texto}
              </a>
            )}
            <h1>{p.titulo}</h1>
          </div>
          <div class="topo__acoes">
            {p.acoes}
            <a class="botao botao--secundario botao--pequeno so-largo" href={url} target="_blank" rel="noopener">
              Ver loja <Icone nome="externo" />
            </a>
          </div>
        </header>
        <main class="conteudo">
          <CaixaAviso aviso={p.aviso} />
          {p.children}
        </main>
      </div>
    </Documento>
  )
}

/** Tela simples centralizada: entrar, cadastro, redefinir senha. */
export function TelaCentral(p: PropsWithChildren<{ titulo: string; subtitulo?: Child; aviso?: Aviso | null; largo?: boolean }>) {
  return (
    <Documento titulo={`${p.titulo} · Lojinha Pronta`} classe="corpo-central">
      <div class={`central${p.largo ? ' central--largo' : ''}`}>
        <Marca />
        <div class="central__caixa">
          <h1>{p.titulo}</h1>
          {p.subtitulo && <p class="central__sub">{p.subtitulo}</p>}
          <CaixaAviso aviso={p.aviso} />
          {p.children}
        </div>
      </div>
    </Documento>
  )
}
