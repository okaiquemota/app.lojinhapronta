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

export function CaixaAviso({ aviso }: { aviso?: Aviso | null }) {
  if (!aviso) return null
  return (
    <div class={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
      {aviso.texto}
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

export function Campo(p: CampoProps) {
  const id = p.id ?? `c-${p.nome}`
  return (
    <div class={`campo${p.erro ? ' campo--erro' : ''}`}>
      <label for={id}>{p.rotulo}</label>
      <div class={p.prefixo || p.sufixo ? 'campo__grupo' : undefined}>
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
          aria-describedby={p.ajuda ? `${id}-ajuda` : undefined}
        />
        {p.sufixo && <span class="campo__sufixo">{p.sufixo}</span>}
      </div>
      {p.erro && <p class="campo__erro">{p.erro}</p>}
      {p.ajuda && (
        <p class="campo__ajuda" id={`${id}-ajuda`}>
          {p.ajuda}
        </p>
      )}
    </div>
  )
}

export function AreaTexto(p: { rotulo: string; nome: string; valor?: string | null; linhas?: number; ajuda?: Child; max?: number; placeholder?: string }) {
  const id = `c-${p.nome}`
  return (
    <div class="campo">
      <label for={id}>{p.rotulo}</label>
      <textarea id={id} name={p.nome} rows={p.linhas ?? 5} maxlength={p.max} placeholder={p.placeholder}>
        {p.valor ?? ''}
      </textarea>
      {p.ajuda && <p class="campo__ajuda">{p.ajuda}</p>}
    </div>
  )
}

export function Selecao(p: { rotulo: string; nome: string; valor?: string | null; opcoes: { valor: string; texto: string }[]; ajuda?: Child }) {
  const id = `c-${p.nome}`
  return (
    <div class="campo">
      <label for={id}>{p.rotulo}</label>
      <select id={id} name={p.nome}>
        {p.opcoes.map((o) => (
          <option value={o.valor} selected={o.valor === (p.valor ?? '')}>
            {o.texto}
          </option>
        ))}
      </select>
      {p.ajuda && <p class="campo__ajuda">{p.ajuda}</p>}
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

export function Botao(p: PropsWithChildren<{ tipo?: 'principal' | 'secundario' | 'perigo' | 'fantasma'; href?: string; submit?: boolean; nome?: string; valor?: string; confirmar?: string; alvo?: string; pequeno?: boolean }>) {
  const cls = `botao botao--${p.tipo ?? 'principal'}${p.pequeno ? ' botao--pequeno' : ''}`
  if (p.href) {
    return (
      <a class={cls} href={p.href} target={p.alvo} rel={p.alvo === '_blank' ? 'noopener' : undefined}>
        {p.children}
      </a>
    )
  }
  return (
    <button class={cls} type={p.submit === false ? 'button' : 'submit'} name={p.nome} value={p.valor} data-confirmar={p.confirmar}>
      {p.children}
    </button>
  )
}

export function Cartao(p: PropsWithChildren<{ titulo?: Child; acao?: Child; class?: string; id?: string }>) {
  return (
    <section class={`cartao ${p.class ?? ''}`} id={p.id}>
      {(p.titulo || p.acao) && (
        <header class="cartao__topo">
          {p.titulo && <h2>{p.titulo}</h2>}
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

export function Icone({ nome }: { nome: string }) {
  const d: Record<string, string> = {
    inicio: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    produtos: 'M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10',
    categorias: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z',
    pedidos: 'M6 3h12l1 18H5zM9 7a3 3 0 0 0 6 0',
    aparencia: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 22 9.7C22 5.9 17.5 3 12 3zM7 12h.01M9 7.5h.01M15 7.5h.01',
    config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    pagamentos: 'M3 6h18v12H3zM3 10h18M7 15h4',
    plano: 'M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21l1.4-7L2 9.3l7-.8z',
    sair: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3',
    externo: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    admin: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z',
    conta: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
    check: 'M4 12l5 5L20 6',
    menu: 'M4 6h16M4 12h16M4 18h16',
  }
  return (
    <svg class="icone" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d[nome] ?? ''} />
    </svg>
  )
}

export function Vazio(p: PropsWithChildren<{ titulo: string }>) {
  return (
    <div class="vazio">
      <h3>{p.titulo}</h3>
      {p.children}
    </div>
  )
}
