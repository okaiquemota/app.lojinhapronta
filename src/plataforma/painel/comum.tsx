import type { Context } from 'hono'
import type { Child } from 'hono/jsx'
import { Hono } from 'hono'
import type { Env, VarsPlataforma } from '../../tipos'
import { Painel } from '../layout'
import { lerAviso, type Aviso } from '../ui'

export type Ctx = Context<{ Bindings: Env; Variables: VarsPlataforma }>
export type AppPainel = Hono<{ Bindings: Env; Variables: VarsPlataforma }>

/** Desenha uma tela do painel com o menu, a faixa do plano e o aviso pendente. */
export function tela(
  c: Ctx,
  o: { ativo: string; titulo: string; aviso?: Aviso | null; acoes?: Child; voltar?: { href: string; texto: string }; status?: number },
  conteudo: Child,
) {
  return c.html(
    <Painel
      env={c.env}
      usuario={c.get('usuario')}
      loja={c.get('loja')}
      ativo={o.ativo}
      titulo={o.titulo}
      aviso={o.aviso === undefined ? lerAviso(c) : o.aviso}
      acoes={o.acoes}
      voltar={o.voltar}
    >
      {conteudo}
    </Painel>,
    (o.status ?? 200) as any,
  )
}
