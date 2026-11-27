import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_ARQUIVO_TECNICO, MB, conferirTamanho, limiteArquivoBytes, limiteDoPlano, mbTexto } from '../src/lib/limites'

const planos = [
  { id: 'essencial', limite_arquivo_mb: 50 },
  { id: 'profissional', limite_arquivo_mb: 95 },
]

describe('limiteArquivoBytes', () => {
  it('converte MB em bytes', () => {
    assert.equal(limiteArquivoBytes(50), 50 * MB)
  })
  it('sem limite no plano vale o teto técnico', () => {
    assert.equal(limiteArquivoBytes(null), MAX_ARQUIVO_TECNICO)
    assert.equal(limiteArquivoBytes(0), MAX_ARQUIVO_TECNICO)
  })
  it('nunca passa do teto técnico, mesmo se o plano pedir 1 GB', () => {
    assert.equal(limiteArquivoBytes(1024), MAX_ARQUIVO_TECNICO)
    assert.ok(MAX_ARQUIVO_TECNICO < 100 * MB)
  })
})

describe('conferirTamanho', () => {
  it('aceita arquivo dentro do limite, inclusive no limite exato', () => {
    assert.equal(conferirTamanho(10 * MB, 50 * MB), null)
    assert.equal(conferirTamanho(50 * MB, 50 * MB), null)
  })
  it('recusa um PDF de 1 GB com mensagem clara', () => {
    const msg = conferirTamanho(1024 * MB, 50 * MB, true)
    assert.equal(msg, 'O arquivo tem 1024 MB e o máximo do seu plano é 50 MB. Comprima o PDF, divida em partes ou mude de plano para enviar arquivos maiores.')
  })
  it('não sugere mudar de plano quando já está no maior', () => {
    assert.ok(!String(conferirTamanho(96 * MB, 95 * MB, false)).includes('mude de plano'))
  })
  it('recusa arquivo vazio ou sem tamanho', () => {
    assert.equal(conferirTamanho(0, 50 * MB), 'Arquivo vazio.')
    assert.equal(conferirTamanho(NaN, 50 * MB), 'Arquivo vazio.')
  })
})

describe('mbTexto', () => {
  it('mostra no formato brasileiro', () => {
    assert.equal(mbTexto(50 * MB), '50 MB')
    assert.equal(mbTexto(1.5 * MB), '1,5 MB')
  })
})

describe('limiteDoPlano', () => {
  it('Essencial: 50 MB, e pode subir de plano', () => {
    assert.deepEqual(limiteDoPlano(planos, 'essencial', false), { max: 50 * MB, podeSubir: true })
  })
  it('Profissional: 95 MB, já é o maior', () => {
    assert.deepEqual(limiteDoPlano(planos, 'profissional', false), { max: 95 * MB, podeSubir: false })
  })
  it('no teste grátis vale o maior plano, como no limite de produtos', () => {
    assert.equal(limiteDoPlano(planos, null, true).max, 95 * MB)
    assert.equal(limiteDoPlano(planos, 'essencial', true).max, 95 * MB)
  })
  it('sem plano e fora do teste vale o menor', () => {
    assert.deepEqual(limiteDoPlano(planos, null, false), { max: 50 * MB, podeSubir: true })
  })
  it('sem nenhum plano cadastrado cai no teto técnico', () => {
    assert.equal(limiteDoPlano([], null, false).max, MAX_ARQUIVO_TECNICO)
  })
})
