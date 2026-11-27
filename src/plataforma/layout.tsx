import type { Child, PropsWithChildren } from 'hono/jsx'
import { raw } from 'hono/html'
import type { Env, Loja, Usuario } from '../tipos'
import { urlDaLoja, enderecoVisivel } from '../lib/dominio'
import { situacaoDaAssinatura } from '../lib/lojas'
import { diasAte, plural } from '../lib/formato'
import { ehAdmin } from '../lib/sessao'
import { urlEstatico } from '../estaticos'
import { CaixaAviso, Icone, type Aviso } from './ui'

const FONTES = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'

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
          <meta name="theme-color" content="#f6f6f4" />
          <link rel="icon" type="image/svg+xml" href={urlEstatico('favicon.svg')} />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          <link rel="stylesheet" href={FONTES} />
          <link rel="stylesheet" href={urlEstatico('plataforma.css')} />
          <script src={urlEstatico('plataforma.js')} defer></script>
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
  const faixa = (tipo: 'info' | 'alerta' | 'erro', texto: Child, link: { href: string; texto: string }) => (
    <div class={`faixa-plano faixa-plano--${tipo}`} role={tipo === 'erro' ? 'alert' : undefined}>
      <span>{texto}</span>
      <a href={link.href}>{link.texto}</a>
    </div>
  )
  if (s.tipo === 'assinante' && s.atrasada) {
    return faixa(
      'erro',
      <>
        <strong>O pagamento da mensalidade falhou.</strong> Atualize o cartão para a loja não sair do ar.
      </>,
      { href: '/painel/plano/cartao', texto: 'Atualizar cartão' },
    )
  }
  if (s.tipo === 'assinante') return null
  if (s.tipo === 'teste') {
    const d = diasAte(s.ate)
    return faixa(
      'info',
      <>
        Teste grátis: <strong>{d <= 1 ? 'termina hoje' : `faltam ${plural(d, 'dia', 'dias')}`}</strong>. Assine para a loja continuar no ar.
      </>,
      { href: '/painel/plano', texto: 'Escolher plano' },
    )
  }
  if (s.tipo === 'cancelada') {
    return faixa('alerta', <>Assinatura cancelada. A loja sai do ar em {plural(diasAte(s.ate), 'dia', 'dias')}.</>, { href: '/painel/plano', texto: 'Reativar' })
  }
  if (loja.assinatura_status === 'past_due') {
    return faixa(
      'erro',
      <>
        <strong>Sua loja está fora do ar.</strong> A mensalidade está atrasada há mais de 14 dias. Assim que o cartão passar, ela volta.
      </>,
      { href: '/painel/plano/cartao', texto: 'Atualizar cartão' },
    )
  }
  return faixa(
    'erro',
    <>
      <strong>Sua loja está fora do ar.</strong> {loja.assinatura_id ? 'A assinatura terminou' : 'O teste grátis acabou'}: assine um plano para voltar a vender.
    </>,
    { href: '/painel/plano', texto: 'Assinar agora' },
  )
}

export function Painel(
  p: PropsWithChildren<{ env: Env; usuario: Usuario; loja: Loja; ativo: string; titulo: string; aviso?: Aviso | null; acoes?: Child; voltar?: { href: string; texto: string } }>,
) {
  const url = urlDaLoja(p.env, p.loja)
  return (
    <Documento titulo={`${p.titulo} · ${p.loja.nome}`} classe="corpo-painel">
      <a class="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      {/* Sem JS, o menu do celular abre por esta caixa. Ela recebe o foco do
          teclado no celular e acende o botão de menu (ver plataforma.css). */}
      <input type="checkbox" id="menu-aberto" class="menu-chave" aria-label="Menu do painel" aria-controls="menu-lateral" />
      <aside class="lateral" id="menu-lateral">
        <div class="lateral__topo">
          <Marca href="/painel" />
          <label for="menu-aberto" class="botao-icone lateral__fechar" aria-hidden="true">
            <Icone nome="fechar" />
          </label>
        </div>
        <a class="lateral__loja" href={url} target="_blank" rel="noopener">
          <span class="lateral__loja-nome">{p.loja.nome}</span>
          <span class="lateral__loja-url">
            <span>{enderecoVisivel(p.env, p.loja)}</span>
            <Icone nome="externo" />
            <span class="sr-only">(abre em outra aba)</span>
          </span>
        </a>
        <nav class="lateral__menu" aria-label="Painel">
          {MENU.map((m) => (
            <a href={m.href} aria-current={m.chave === p.ativo ? 'page' : undefined}>
              <Icone nome={m.icone} />
              {m.texto}
            </a>
          ))}
        </nav>
        <div class="lateral__rodape">
          {ehAdmin(p.env, p.usuario.email) && (
            <a href="/admin" aria-current={p.ativo === 'admin' ? 'page' : undefined}>
              <Icone nome="admin" /> Administração
            </a>
          )}
          <a href="/painel/conta" aria-current={p.ativo === 'conta' ? 'page' : undefined}>
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
        <div class="barra-celular">
          <label for="menu-aberto" class="botao-icone barra-celular__menu" aria-hidden="true">
            <Icone nome="menu" />
          </label>
          <Marca href="/painel" />
          <a class="botao-icone" href={url} target="_blank" rel="noopener" aria-label="Ver a loja (abre em outra aba)">
            <Icone nome="externo" />
          </a>
        </div>
        <FaixaPlano loja={p.loja} />
        <main class="conteudo" id="conteudo" tabindex={-1}>
          <header class="cabecalho-pagina">
            <div class="cabecalho-pagina__titulo">
              {p.voltar && (
                <a class="voltar" href={p.voltar.href}>
                  <Icone nome="voltar" />
                  {p.voltar.texto}
                </a>
              )}
              <h1>{p.titulo}</h1>
            </div>
            {p.acoes && <div class="cabecalho-pagina__acoes">{p.acoes}</div>}
          </header>
          <CaixaAviso aviso={p.aviso} />
          {p.children}
        </main>
      </div>
    </Documento>
  )
}

/** Tela simples centralizada: entrar, cadastro, redefinir senha. */
export function TelaCentral(p: PropsWithChildren<{ titulo: string; subtitulo?: Child; aviso?: Aviso | null; largo?: boolean; rodape?: Child }>) {
  return (
    <Documento titulo={`${p.titulo} · Lojinha Pronta`} classe="corpo-central">
      <main class={`central${p.largo ? ' central--largo' : ''}`}>
        <Marca />
        <div class="central__caixa">
          <h1>{p.titulo}</h1>
          {p.subtitulo && <p class="central__sub">{p.subtitulo}</p>}
          <CaixaAviso aviso={p.aviso} />
          {p.children}
        </div>
        {p.rodape && <p class="central__rodape">{p.rodape}</p>}
      </main>
    </Documento>
  )
}

/** Página de erro da plataforma (404, 500), com saída para algum lugar. */
export function PaginaErro({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <TelaCentral titulo={titulo}>
      <p class="central__texto">{texto}</p>
      <div class="pilha-botoes">
        <a class="botao botao--principal botao--largo" href="/painel">
          Ir para o painel
        </a>
        <a class="botao botao--fantasma botao--largo" href="/">
          Página inicial
        </a>
      </div>
    </TelaCentral>
  )
}
