/**
 * Regras que não podem mudar sem querer: dinheiro, endereço de loja, situação
 * da assinatura, senha e cifra. Rodar com `npm test`.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { centavosDeTexto, centavosParaCampo, emailValido, normalizarWhatsapp, reais, slugificar, tamanhoArquivo, whatsappVisivel } from '../src/lib/formato'
import { resolverHost, slugDoNome, slugValido, urlDaLoja } from '../src/lib/dominio'
import { situacao, situacaoDaAssinatura } from '../src/lib/lojas'
import { abrirAssinado, assinar, cifrar, conferirSenha, decifrar, hashSenha } from '../src/lib/seguranca'
import { resumir } from '../src/lib/texto'
import { escaparHtml, moldeEmail } from '../src/lib/email'
import type { Env, Loja } from '../src/tipos'

const env = {
  DOMINIO_RAIZ: 'lojinhapronta.com.br',
  APP_URL: 'https://app.lojinhapronta.com.br',
  SUBDOMINIOS_ATIVOS: 'sim',
  SEGREDO_APP: 'um-segredo-de-teste-com-mais-de-32-caracteres',
} as Env

const DIA = 86_400_000
const daqui = (dias: number) => new Date(Date.now() + dias * DIA).toISOString()

function loja(parcial: Partial<Loja> = {}): Loja {
  return {
    teste_ate: daqui(-1),
    assinatura_status: null,
    assinatura_valida_ate: null,
    assinatura_cancelada: 0,
    assinatura_atrasada_desde: null,
    aberta: 1,
    ...parcial,
  } as Loja
}

describe('dinheiro', () => {
  it('escreve reais com milhar e centavos', () => {
    assert.equal(reais(0), 'R$ 0,00')
    assert.equal(reais(1990), 'R$ 19,90')
    assert.equal(reais(123456), 'R$ 1.234,56')
    assert.equal(reais(-150), '-R$ 1,50')
  })
  it('lê o preço do jeito que a lojista digita', () => {
    assert.equal(centavosDeTexto('19,90'), 1990)
    assert.equal(centavosDeTexto('19.90'), 1990)
    assert.equal(centavosDeTexto('1.234,56'), 123456)
    assert.equal(centavosDeTexto('1.234'), 123400)
    assert.equal(centavosDeTexto('R$ 19'), 1900)
    assert.equal(centavosDeTexto('0'), 0)
    assert.equal(centavosDeTexto(''), null)
    assert.equal(centavosDeTexto('abc'), null)
  })
  it('devolve o preço ao campo no mesmo formato', () => {
    assert.equal(centavosParaCampo(1990), '19,90')
    assert.equal(centavosParaCampo(5), '0,05')
    assert.equal(centavosParaCampo(null), '')
  })
})

describe('textos de formulário', () => {
  it('slug sem acento nem símbolo', () => {
    assert.equal(slugificar('Ateliê da Ana!'), 'atelie-da-ana')
    assert.equal(slugificar('  --Moldes & Cia--  '), 'moldes-cia')
  })
  it('WhatsApp com DDI e de volta', () => {
    assert.equal(normalizarWhatsapp('(16) 99999-9999'), '5516999999999')
    assert.equal(whatsappVisivel('5516999999999'), '(16) 99999-9999')
  })
  it('e-mail e tamanho de arquivo', () => {
    assert.ok(emailValido('ana@exemplo.com'))
    assert.ok(!emailValido('ana@exemplo'))
    assert.ok(!emailValido('ana exemplo.com'))
    assert.equal(tamanhoArquivo(2048), '2 KB')
    assert.equal(tamanhoArquivo(5 * 1024 * 1024), '5,0 MB')
  })
  it('resumo para o Google corta em palavra inteira', () => {
    const r = resumir('## Título\n- item um\n' + 'palavra '.repeat(40), 60)
    assert.ok(r.length <= 60)
    assert.ok(r.endsWith('…'))
    assert.ok(!r.includes('#'))
  })
})

describe('endereço da loja', () => {
  it('recusa endereço curto, inválido ou reservado', () => {
    assert.match(slugValido('ab') ?? '', /3 letras/)
    assert.match(slugValido('Ana') ?? '', /letras sem acento/)
    assert.match(slugValido('loja--ana') ?? '', /dois hífens/)
    assert.match(slugValido('admin') ?? '', /reservado/)
    assert.equal(slugValido('loja-da-ana'), null)
  })
  it('decide plataforma ou loja pelo host', () => {
    assert.equal(resolverHost('app.lojinhapronta.com.br', env), null)
    assert.equal(resolverHost('lojinhapronta.com.br', env), null)
    assert.equal(resolverHost('localhost', env), null)
    assert.deepEqual(resolverHost('kiwi.lojinhapronta.com.br', env), { slug: 'kiwi', base: '' })
    assert.equal(resolverHost('a.b.lojinhapronta.com.br', env), null)
    assert.deepEqual(resolverHost('lojadaana.com.br', env), { dominio: 'lojadaana.com.br', base: '' })
  })
  it('monta o link público', () => {
    assert.equal(urlDaLoja(env, { slug: 'kiwi', dominio: null }), 'https://kiwi.lojinhapronta.com.br')
    assert.equal(urlDaLoja(env, { slug: 'kiwi', dominio: 'kiwi.com.br' }), 'https://kiwi.com.br')
    assert.equal(urlDaLoja({ ...env, SUBDOMINIOS_ATIVOS: 'nao' }, { slug: 'kiwi', dominio: null }), 'https://app.lojinhapronta.com.br/loja/kiwi')
  })
})

describe('situação da assinatura (o que mantém a loja no ar)', () => {
  it('teste grátis valendo', () => {
    assert.equal(situacaoDaAssinatura(loja({ teste_ate: daqui(3) })).tipo, 'teste')
  })
  it('teste acabou e ninguém assinou: fora do ar', () => {
    const s = situacaoDaAssinatura(loja())
    assert.equal(s.tipo, 'vencida')
    assert.equal(s.noAr, false)
  })
  it('assinatura ativa', () => {
    assert.deepEqual(situacaoDaAssinatura(loja({ assinatura_status: 'active' })), { noAr: true, tipo: 'assinante', atrasada: false })
  })
  it('cartão recusado: segue no ar por até 14 dias', () => {
    const dez = situacaoDaAssinatura(loja({ assinatura_status: 'past_due', assinatura_atrasada_desde: daqui(-10) }))
    assert.deepEqual(dez, { noAr: true, tipo: 'assinante', atrasada: true })
    const vinte = situacaoDaAssinatura(loja({ assinatura_status: 'past_due', assinatura_atrasada_desde: daqui(-20) }))
    assert.equal(vinte.tipo, 'vencida')
  })
  it('cancelou: fica no ar até o fim do período pago', () => {
    const s = situacaoDaAssinatura(loja({ assinatura_status: 'active', assinatura_cancelada: 1, assinatura_valida_ate: daqui(9) }))
    assert.equal(s.tipo, 'cancelada')
    const encerrada = situacaoDaAssinatura(loja({ assinatura_status: 'canceled', assinatura_valida_ate: daqui(2) }))
    assert.equal(encerrada.tipo, 'cancelada')
  })
  it('loja fechada pela lojista não abre, mesmo pagando', () => {
    assert.equal(situacao(loja({ assinatura_status: 'active', aberta: 0 })).tipo, 'fechada')
  })
})

describe('senha, cifra e assinatura', () => {
  it('senha confere só com a senha certa', async () => {
    const h = await hashSenha('cavalo bateria grampo')
    assert.ok(h.startsWith('pbkdf2$'))
    assert.ok(await conferirSenha('cavalo bateria grampo', h))
    assert.ok(!(await conferirSenha('cavalo bateria', h)))
    assert.ok(!(await conferirSenha('qualquer', 'formato-estranho')))
  })
  it('token do Mercado Pago volta igual e muda a cada cifra', async () => {
    const a = await cifrar(env, 'APP_USR-123')
    const b = await cifrar(env, 'APP_USR-123')
    assert.notEqual(a, b)
    assert.equal(await decifrar(env, a), 'APP_USR-123')
  })
  it('state do OAuth adulterado é recusado', async () => {
    const s = await assinar(env, 'loja-1|123')
    assert.equal(await abrirAssinado(env, s), 'loja-1|123')
    const [corpo, sig] = s.split('.')
    const outro = Buffer.from('loja-2|123').toString('base64url')
    assert.equal(await abrirAssinado(env, `${outro}.${sig}`), null)
    assert.equal(await abrirAssinado(env, `${corpo}.x${sig}`), null)
  })
})

describe('e-mail', () => {
  it('escapa o que vem de fora e recusa cor inválida', () => {
    assert.equal(escaparHtml('<b>"Ana" & cia</b>'), '&lt;b&gt;&quot;Ana&quot; &amp; cia&lt;/b&gt;')
    const html = moldeEmail({ cor: 'red;background:url(x)', titulo: '<script>', paragrafos: [], rodape: '' })
    assert.ok(html.includes('&lt;script&gt;'))
    assert.ok(!html.includes('url(x)'))
  })
})

describe('endereço automático no cadastro', () => {
  it('sai do nome da loja', () => {
    assert.equal(slugDoNome('Ateliê da Ana'), 'atelie-da-ana')
    assert.equal(slugDoNome('Ateliê da Ana', 2), 'atelie-da-ana-2')
  })
  it('é sempre um endereço válido', () => {
    for (const nome of ['Bo', 'app', 'Loja', '!!!', '', 'x'.repeat(80), 'a-'.repeat(30)]) {
      for (const n of [1, 2, 37, 4321]) {
        const s = slugDoNome(nome, n)
        assert.equal(slugValido(s), null, `${JSON.stringify(nome)} #${n} → ${s}`)
      }
    }
    assert.equal(slugDoNome('Bo'), 'loja-bo')
    assert.equal(slugDoNome('app'), 'loja-app')
    assert.equal(slugDoNome('!!!'), 'minha-loja')
  })
})
