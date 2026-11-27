import { describe, expect, it } from 'vitest'
import { MAX_ARQUIVO_TECNICO, MB, conferirTamanho, limiteArquivoBytes, limiteDoPlano, mbTexto } from '../src/lib/limites'

const planos = [
  { id: 'essencial', limite_arquivo_mb: 50 },
  { id: 'profissional', limite_arquivo_mb: 95 },
]

describe('limiteArquivoBytes', () => {
  it('converte MB em bytes', () => {
    expect(limiteArquivoBytes(50)).toBe(50 * MB)
  })
  it('sem limite no plano vale o teto técnico', () => {
    expect(limiteArquivoBytes(null)).toBe(MAX_ARQUIVO_TECNICO)
    expect(limiteArquivoBytes(0)).toBe(MAX_ARQUIVO_TECNICO)
  })
  it('nunca passa do teto técnico, mesmo se o plano pedir 1 GB', () => {
    expect(limiteArquivoBytes(1024)).toBe(MAX_ARQUIVO_TECNICO)
    expect(MAX_ARQUIVO_TECNICO).toBeLessThan(100 * MB)
  })
})

describe('conferirTamanho', () => {
  it('aceita arquivo dentro do limite, inclusive no limite exato', () => {
    expect(conferirTamanho(10 * MB, 50 * MB)).toBeNull()
    expect(conferirTamanho(50 * MB, 50 * MB)).toBeNull()
  })
  it('recusa um PDF de 1 GB com mensagem clara', () => {
    const msg = conferirTamanho(1024 * MB, 50 * MB, true)
    expect(msg).toBe('O arquivo tem 1024 MB e o máximo do seu plano é 50 MB. Comprima o PDF, divida em partes ou mude de plano para enviar arquivos maiores.')
  })
  it('não sugere mudar de plano quando já está no maior', () => {
    expect(conferirTamanho(96 * MB, 95 * MB, false)).not.toContain('mude de plano')
  })
  it('recusa arquivo vazio ou sem tamanho', () => {
    expect(conferirTamanho(0, 50 * MB)).toBe('Arquivo vazio.')
    expect(conferirTamanho(NaN, 50 * MB)).toBe('Arquivo vazio.')
  })
})

describe('mbTexto', () => {
  it('mostra no formato brasileiro', () => {
    expect(mbTexto(50 * MB)).toBe('50 MB')
    expect(mbTexto(1.5 * MB)).toBe('1,5 MB')
  })
})

describe('limiteDoPlano', () => {
  it('Essencial: 50 MB, e pode subir de plano', () => {
    expect(limiteDoPlano(planos, 'essencial', false)).toEqual({ max: 50 * MB, podeSubir: true })
  })
  it('Profissional: 95 MB, já é o maior', () => {
    expect(limiteDoPlano(planos, 'profissional', false)).toEqual({ max: 95 * MB, podeSubir: false })
  })
  it('no teste grátis vale o maior plano, como no limite de produtos', () => {
    expect(limiteDoPlano(planos, null, true).max).toBe(95 * MB)
    expect(limiteDoPlano(planos, 'essencial', true).max).toBe(95 * MB)
  })
  it('sem plano e fora do teste vale o menor', () => {
    expect(limiteDoPlano(planos, null, false)).toEqual({ max: 50 * MB, podeSubir: true })
  })
  it('sem nenhum plano cadastrado cai no teto técnico', () => {
    expect(limiteDoPlano([], null, false).max).toBe(MAX_ARQUIVO_TECNICO)
  })
})
