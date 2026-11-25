import { Hono } from 'hono'
import type { Env, VarsPlataforma } from '../../tipos'
import { usuarioDaSessao } from '../../lib/sessao'
import { lojaDoDono } from '../../lib/lojas'
import { TelaCentral } from '../layout'
import { rotasInicio } from './inicio'
import { rotasProdutos } from './produtos'
import { rotasVendas } from './vendas'
import { rotasLoja } from './loja'
import { rotasRecebimento } from './recebimento'

const painel = new Hono<{ Bindings: Env; Variables: VarsPlataforma }>()

painel.use('*', async (c, next) => {
  const u = await usuarioDaSessao(c)
  if (!u) {
    const url = new URL(c.req.url)
    return c.redirect(`/entrar?volta=${encodeURIComponent(url.pathname + url.search)}`)
  }
  const loja = await lojaDoDono(c.env, u.id)
  if (!loja) {
    return c.html(
      <TelaCentral titulo="Conta sem loja">
        <p>Esta conta não tem loja. Fale com o suporte da Lojinha Pronta.</p>
      </TelaCentral>,
      404,
    )
  }
  c.set('usuario', u)
  c.set('loja', loja)
  c.header('Cache-Control', 'private, no-store')
  await next()
})

rotasInicio(painel)
rotasProdutos(painel)
rotasVendas(painel)
rotasLoja(painel)
rotasRecebimento(painel)

export default painel
