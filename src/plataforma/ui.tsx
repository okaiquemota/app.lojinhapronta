/**
 * Peças do painel. Toda tela é montada com elas, e o visual de cada uma mora
 * em public/_lp/plataforma.css — nada de estilo solto nas telas.
 */
import type { Child, PropsWithChildren } from 'hono/jsx'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

// ── aviso que sobrevive a um redirect ("Produto salvo.") ───────────────────

export type Aviso = { tipo: 'ok' | 'erro'; texto: string }

export function avisar(c: Context<any>, texto: string, tipo: Aviso['tipo'] = 'ok') {
  setCookie(c, 'lp_aviso', encodeURIComponent(JSON.stringify({ tipo, texto })), {
    path: '/',
    maxAge: 60,
    httpOnly: true,
    sameSite: 'Lax',
  })
}

export function lerAviso(c: Context<any>): Aviso | null {
  const v = getCookie(c, 'lp_aviso')
  if (!v) return null
  deleteCookie(c, 'lp_aviso', { path: '/' })
  try {
    const a = JSON.parse(decodeURIComponent(v))
    return a && typeof a.texto === 'string' ? { tipo: a.tipo === 'erro' ? 'erro' : 'ok', texto: a.texto.slice(0, 300) } : null
  } catch {
    return null
  }
}

const ICONE_DO_AVISO = { ok: 'ok', erro: 'alerta', info: 'info', alerta: 'alerta' } as const

/** Caixa de aviso. `tipo` aceita também info e alerta, para avisos fixos da tela. */
export function CaixaAviso({ aviso }: { aviso?: (Omit<Aviso, 'tipo'> & { tipo: Aviso['tipo'] | 'info' | 'alerta' }) | null }) {
  if (!aviso) return null
  return (
    <div class={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
      <Icone nome={ICONE_DO_AVISO[aviso.tipo]} />
      <span>{aviso.texto}</span>
    </div>
  )
}

/** Aviso fixo da tela, com conteúdo livre (link, negrito). */
export function Nota(p: PropsWithChildren<{ tipo?: 'info' | 'alerta' | 'erro' | 'ok' }>) {
  const tipo = p.tipo ?? 'info'
  return (
    <div class={`aviso aviso--${tipo}`}>
      <Icone nome={ICONE_DO_AVISO[tipo]} />
      <div>{p.children}</div>
    </div>
  )
}

// ── formulário ─────────────────────────────────────────────────────────────

type CampoProps = {
  rotulo: string
  nome: string
  valor?: string | number | null
  tipo?: string
  ajuda?: Child
  obrigatorio?: boolean
  placeholder?: string
  max?: number
  min?: number
  passo?: string
  autocomplete?: string
  modo?: string
  padrao?: string
  prefixo?: string
  sufixo?: string
  erro?: string | null
  id?: string
  autofocus?: boolean
}

/** Ids de ajuda e erro que o campo anuncia ao leitor de tela. */
function descritoPor(id: string, ajuda: unknown, erro: unknown): string | undefined {
  const ids = [erro ? `${id}-erro` : '', ajuda ? `${id}-ajuda` : ''].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

function ErroDoCampo({ id, erro }: { id: string; erro?: string | null }) {
  if (!erro) return null
  return (
    <p class="campo__erro" id={`${id}-erro`}>
      <Icone nome="alerta" />
      {erro}
    </p>
  )
}

export function Campo(p: CampoProps) {
  const id = p.id ?? `c-${p.nome}`
  return (
    <div class={`campo${p.erro ? ' campo--erro' : ''}`}>
      <label for={id}>{p.rotulo}</label>
      <div class={p.prefixo || p.sufixo ? 'campo__grupo' : 'campo__controle'}>
        {p.prefixo && <span class="campo__prefixo">{p.prefixo}</span>}
        <input
          id={id}
          name={p.nome}
          type={p.tipo ?? 'text'}
          value={p.valor ?? ''}
          required={p.obrigatorio}
          placeholder={p.placeholder}
          maxlength={p.max}
          minlength={p.min}
          step={p.passo}
          autocomplete={p.autocomplete}
          inputmode={p.modo as any}
          pattern={p.padrao}
          autofocus={p.autofocus}
          aria-invalid={p.erro ? 'true' : undefined}
          aria-describedby={descritoPor(id, p.ajuda, p.erro)}
        />
        {p.sufixo && <span class="campo__sufixo">{p.sufixo}</span>}
      </div>
      <ErroDoCampo id={id} erro={p.erro} />
      {p.ajuda && (
        <p class="campo__ajuda" id={`${id}-ajuda`}>
          {p.ajuda}
        </p>
      )}
    </div>
  )
}

export function AreaTexto(p: { rotulo: string; nome: string; valor?: string | null; linhas?: number; ajuda?: Child; max?: number; placeholder?: string; erro?: string | null }) {
  const id = `c-${p.nome}`
  return (
    <div class={`campo${p.erro ? ' campo--erro' : ''}`}>
      <label for={id}>{p.rotulo}</label>
      <textarea
        id={id}
        name={p.nome}
        rows={p.linhas ?? 5}
        maxlength={p.max}
        placeholder={p.placeholder}
        aria-invalid={p.erro ? 'true' : undefined}
        aria-describedby={descritoPor(id, p.ajuda, p.erro)}
      >
        {p.valor ?? ''}
      </textarea>
      <ErroDoCampo id={id} erro={p.erro} />
      {p.ajuda && (
        <p class="campo__ajuda" id={`${id}-ajuda`}>
          {p.ajuda}
        </p>
      )}
    </div>
  )
}

export function Selecao(p: { rotulo: string; nome: string; valor?: string | null; opcoes: { valor: string; texto: string }[]; ajuda?: Child }) {
  const id = `c-${p.nome}`
  return (
    <div class="campo">
      <label for={id}>{p.rotulo}</label>
      <select id={id} name={p.nome} aria-describedby={p.ajuda ? `${id}-ajuda` : undefined}>
        {p.opcoes.map((o) => (
          <option value={o.valor} selected={o.valor === (p.valor ?? '')}>
            {o.texto}
          </option>
        ))}
      </select>
      {p.ajuda && (
        <p class="campo__ajuda" id={`${id}-ajuda`}>
          {p.ajuda}
        </p>
      )}
    </div>
  )
}

/** Campo de arquivo. O botão do navegador ganha a cara dos botões do painel. */
export function CampoArquivo(p: {
  rotulo: string
  nome: string
  aceita: string
  ajuda?: Child
  erro?: string | null
  multiplo?: boolean
  reduzir?: string | boolean
  direto?: boolean
}) {
  const id = `c-${p.nome}`
  return (
    <div class={`campo campo-arquivo${p.erro ? ' campo--erro' : ''}`}>
      <label for={id}>{p.rotulo}</label>
      <input
        id={id}
        type="file"
        name={p.nome}
        accept={p.aceita}
        multiple={p.multiplo}
        data-reduzir-imagem={p.reduzir === true ? '' : p.reduzir || undefined}
        data-direto={p.direto ? '' : undefined}
        aria-invalid={p.erro ? 'true' : undefined}
        aria-describedby={descritoPor(id, p.ajuda, p.erro)}
      />
      <ErroDoCampo id={id} erro={p.erro} />
      {p.ajuda && (
        <p class="campo__ajuda" id={`${id}-ajuda`}>
          {p.ajuda}
        </p>
      )}
    </div>
  )
}

export function Marcador(p: { rotulo: Child; nome: string; marcado?: boolean; ajuda?: Child; valor?: string }) {
  return (
    <label class="marcador">
      <input type="checkbox" name={p.nome} value={p.valor ?? '1'} checked={p.marcado} />
      <span>
        <strong>{p.rotulo}</strong>
        {p.ajuda && <small>{p.ajuda}</small>}
      </span>
    </label>
  )
}

type BotaoProps = PropsWithChildren<{
  tipo?: 'principal' | 'secundario' | 'perigo' | 'fantasma'
  href?: string
  submit?: boolean
  nome?: string
  valor?: string
  confirmar?: string
  /** Texto do botão que confirma, no diálogo de `confirmar`. */
  confirmarCom?: string
  alvo?: string
  pequeno?: boolean
  grande?: boolean
  largo?: boolean
  desabilitado?: boolean
  icone?: string
  rotulo?: string
}>

export function Botao(p: BotaoProps) {
  const cls = `botao botao--${p.tipo ?? 'principal'}${p.pequeno ? ' botao--pequeno' : ''}${p.grande ? ' botao--grande' : ''}${p.largo ? ' botao--largo' : ''}`
  const conteudo = (
    <>
      {p.icone && <Icone nome={p.icone} />}
      {p.children}
    </>
  )
  if (p.href) {
    return (
      <a class={cls} href={p.href} target={p.alvo} rel={p.alvo === '_blank' ? 'noopener' : undefined} aria-label={p.rotulo}>
        {conteudo}
      </a>
    )
  }
  return (
    <button
      class={cls}
      type={p.submit === false ? 'button' : 'submit'}
      name={p.nome}
      value={p.valor}
      data-confirmar={p.confirmar}
      data-confirmar-com={p.confirmarCom}
      data-perigo={p.tipo === 'perigo' ? '' : undefined}
      disabled={p.desabilitado}
      aria-label={p.rotulo}
    >
      {conteudo}
    </button>
  )
}

/** Barra que acompanha a rolagem com o botão de salvar de formulários longos. */
export function BarraAcoes(p: PropsWithChildren<{ nota?: Child }>) {
  return (
    <div class="barra-acoes">
      <p class="barra-acoes__nota">{p.nota}</p>
      <div class="barra-acoes__botoes">{p.children}</div>
    </div>
  )
}

// ── blocos ─────────────────────────────────────────────────────────────────

export function Cartao(p: PropsWithChildren<{ titulo?: Child; descricao?: Child; acao?: Child; class?: string; id?: string }>) {
  return (
    <section class={`cartao ${p.class ?? ''}`} id={p.id}>
      {(p.titulo || p.acao) && (
        <header class="cartao__topo">
          <div>
            {p.titulo && <h2>{p.titulo}</h2>}
            {p.descricao && <p class="cartao__descricao">{p.descricao}</p>}
          </div>
          {p.acao}
        </header>
      )}
      {p.children}
    </section>
  )
}

export function Etiqueta(p: PropsWithChildren<{ cor?: 'verde' | 'amarelo' | 'vermelho' | 'cinza' | 'azul' }>) {
  return <span class={`etiqueta etiqueta--${p.cor ?? 'cinza'}`}>{p.children}</span>
}

/** Abas de filtro. A atual é anunciada ao leitor de tela. */
export function Abas({ itens, rotulo }: { itens: { href: string; texto: string; ativo: boolean }[]; rotulo: string }) {
  return (
    <nav class="abas" aria-label={rotulo}>
      {itens.map((i) => (
        <a href={i.href} aria-current={i.ativo ? 'page' : undefined}>
          {i.texto}
        </a>
      ))}
    </nav>
  )
}

/** Busca da lista (GET). `manter` repassa filtros que já estão na URL. */
export function Busca({ valor, placeholder, rotulo, manter }: { valor: string; placeholder: string; rotulo: string; manter?: Record<string, string | undefined> }) {
  return (
    <form method="get" class="busca-painel" role="search">
      {Object.entries(manter ?? {}).map(([k, v]) => (v ? <input type="hidden" name={k} value={v} /> : null))}
      <Icone nome="busca" />
      <input type="search" name="q" value={valor} placeholder={placeholder} aria-label={rotulo} />
    </form>
  )
}

const ICONES: Record<string, string> = {
  inicio: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  produtos: 'M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10',
  categorias: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z',
  pedidos: 'M6 3h12l1 18H5zM9 7a3 3 0 0 0 6 0',
  aparencia: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 22 9.7C22 5.9 17.5 3 12 3zM7 12h.01M9 7.5h.01M15 7.5h.01',
  config:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  pagamentos: 'M3 6h18v12H3zM3 10h18M7 15h4',
  plano: 'M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21l1.4-7L2 9.3l7-.8z',
  sair: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3',
  externo: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  admin: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z',
  conta: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
  check: 'M4 12l5 5L20 6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  fechar: 'M6 6l12 12M18 6L6 18',
  voltar: 'M15 18l-6-6 6-6',
  seguir: 'M9 18l6-6-6-6',
  mais: 'M12 5v14M5 12h14',
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.6-3.6',
  imagem: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5h.01',
  arquivo: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4',
  alerta: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  ok: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  lixeira: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  baixar: 'M12 4v10m0 0l-4-4m4 4l4-4M5 19h14',
  loja: 'M4 9l1.5-5h13L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6',
  email: 'M3 6h18v12H3zM3 7l9 6 9-6',
  atualizar: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
}

export function Icone({ nome }: { nome: string }) {
  return (
    <svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONES[nome] ?? ''} />
    </svg>
  )
}

export function Vazio(p: PropsWithChildren<{ titulo: string; icone?: string }>) {
  return (
    <div class="vazio">
      {p.icone && (
        <span class="vazio__icone">
          <Icone nome={p.icone} />
        </span>
      )}
      <h3>{p.titulo}</h3>
      {p.children}
    </div>
  )
}
