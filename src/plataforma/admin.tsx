/** Visão da dona da plataforma: todas as lojas, quem paga, quanto se vende. */
import { Hono } from 'hono'
import type { Env, Loja, VarsPlataforma } from '../tipos'
import { usuarioDaSessao, ehAdmin } from '../lib/sessao'
import { lojaDoDono, situacao } from '../lib/lojas'
import { urlDaLoja } from '../lib/dominio'
import { dataBR, reais } from '../lib/formato'
import { Painel } from './layout'
import { Cartao, Etiqueta } from './ui'

const admin = new Hono<{ Bindings: Env; Variables: VarsPlataforma }>()

admin.use('*', async (c, next) => {
  const u = await usuarioDaSessao(c)
  if (!u || !ehAdmin(c.env, u.email)) return c.notFound()
  const loja = await lojaDoDono(c.env, u.id)
  if (!loja) return c.text('A conta de administração também precisa ter uma loja.', 403)
  c.set('usuario', u)
  c.set('loja', loja)
  c.header('Cache-Control', 'private, no-store')
  await next()
})

type Linha = Loja & { email_dono: string; produtos: number; vendas: number; faturado: number }

admin.get('/', async (c) => {
  const r = await c.env.DB.prepare(
    `SELECT l.*, u.email AS email_dono,
       (SELECT COUNT(*) FROM produtos p WHERE p.loja_id = l.id AND p.ativo = 1) AS produtos,
       (SELECT COUNT(*) FROM pedidos o WHERE o.loja_id = l.id AND o.status = 'pago') AS vendas,
       (SELECT COALESCE(SUM(total_centavos),0) FROM pedidos o WHERE o.loja_id = l.id AND o.status = 'pago') AS faturado
     FROM lojas l JOIN usuarios u ON u.id = l.dono_id ORDER BY l.criada_em DESC LIMIT 500`,
  ).all<Linha>()
  const lojas = r.results
  const assinantes = lojas.filter((l) => situacao(l).tipo === 'assinante').length
  const emTeste = lojas.filter((l) => situacao(l).tipo === 'teste').length
  const mrr = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(p.preco_centavos),0) AS v FROM lojas l JOIN planos p ON p.id = l.plano_id WHERE l.assinatura_status IN ('active', 'past_due') AND l.assinatura_cancelada = 0`,
  ).first<{ v: number }>()
  const tag = (l: Loja) => {
    const s = situacao(l)
    if (s.tipo === 'assinante') return s.atrasada ? <Etiqueta cor="amarelo">Pagamento atrasado</Etiqueta> : <Etiqueta cor="verde">{l.assinatura_status === 'trialing' ? 'Assinante (no teste)' : 'Assinante'}</Etiqueta>
    if (s.tipo === 'teste') return <Etiqueta cor="azul">Teste até {dataBR(s.ate)}</Etiqueta>
    if (s.tipo === 'cancelada') return <Etiqueta cor="amarelo">Cancelada</Etiqueta>
    if (s.tipo === 'fechada') return <Etiqueta>Fechada</Etiqueta>
    return <Etiqueta cor="vermelho">Fora do ar</Etiqueta>
  }

  return c.html(
    <Painel env={c.env} usuario={c.get('usuario')} loja={c.get('loja')} ativo="admin" titulo="Administração">
      <div class="numeros">
        <div class="numero">
          <span>Lojas</span>
          <strong>{lojas.length}</strong>
        </div>
        <div class="numero">
          <span>Assinantes</span>
          <strong>{assinantes}</strong>
        </div>
        <div class="numero">
          <span>Em teste</span>
          <strong>{emTeste}</strong>
        </div>
        <div class="numero">
          <span>Receita mensal</span>
          <strong>{reais(mrr?.v ?? 0)}</strong>
        </div>
      </div>
      <Cartao titulo="Lojas">
        <div class="tabela-rolagem">
          <table class="tabela">
            <thead>
              <tr>
                <th>Loja</th>
                <th>Dona</th>
                <th>Criada</th>
                <th>Situação</th>
                <th class="num">Produtos</th>
                <th class="num">Vendas</th>
                <th class="num">Vendido</th>
              </tr>
            </thead>
            <tbody>
              {lojas.map((l) => (
                <tr>
                  <td>
                    <a href={urlDaLoja(c.env, l)} target="_blank" rel="noopener" class="tabela__principal">
                      {l.nome}
                    </a>
                    <small>{l.slug}</small>
                  </td>
                  <td>{l.email_dono}</td>
                  <td>{dataBR(l.criada_em)}</td>
                  <td>
                    {tag(l)} {l.plano_id && <small>{l.plano_id}</small>}
                  </td>
                  <td class="num">{l.produtos}</td>
                  <td class="num">{l.vendas}</td>
                  <td class="num">{reais(l.faturado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </Painel>,
  )
})

export default admin
