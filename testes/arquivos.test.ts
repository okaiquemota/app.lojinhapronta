import { describe, expect, it } from 'vitest'
import type { Env } from '../src/tipos'
import { enviarArquivoDireto, guardarArquivo } from '../src/lib/arquivos'
import { MB } from '../src/lib/limites'

/** R2 de mentira: guarda o tamanho do que chegou. */
function r2Falso() {
  const objetos = new Map<string, number>()
  const bucket = {
    objetos,
    async put(key: string, corpo: ReadableStream | Blob) {
      const bytes = corpo instanceof Blob ? corpo.size : (await new Response(corpo).arrayBuffer()).byteLength
      objetos.set(key, bytes)
      return { size: bytes }
    },
    async delete(key: string | string[]) {
      for (const k of Array.isArray(key) ? key : [key]) objetos.delete(k)
    },
  }
  return { env: { ARQUIVOS: bucket } as unknown as Env, objetos }
}

const essencial = { max: 50 * MB, podeSubir: true }

function pedidoPUT(bytes: number, contentLength = String(bytes)) {
  return new Request('https://app.test/painel/arquivos', {
    method: 'PUT',
    body: new Uint8Array(bytes),
    headers: { 'content-length': contentLength, 'content-type': 'application/pdf' },
  })
}

describe('enviarArquivoDireto', () => {
  it('grava arquivo dentro do limite do plano', async () => {
    const { env, objetos } = r2Falso()
    const r = await enviarArquivoDireto(env, 'loja1', pedidoPUT(1024), 'Apostila.pdf', essencial)
    expect(r.tamanho).toBe(1024)
    expect(r.key).toMatch(/^arq\/loja1\/.+\/Apostila\.pdf$/)
    expect(objetos.size).toBe(1)
  })

  it('recusa pelo cabeçalho, antes de gravar, quando passa do limite', async () => {
    const { env, objetos } = r2Falso()
    // 1 GB anunciado no cabeçalho: nem começa a gravar.
    const req = new Request('https://app.test/painel/arquivos', {
      method: 'PUT',
      body: new Uint8Array(10),
      headers: { 'content-length': String(1024 * MB) },
    })
    await expect(enviarArquivoDireto(env, 'loja1', req, 'grande.pdf', essencial)).rejects.toThrow('máximo do seu plano é 50 MB')
    expect(objetos.size).toBe(0)
  })

  it('apaga o que foi gravado se o corpo for maior do que o cabeçalho prometeu', async () => {
    const { env, objetos } = r2Falso()
    const limite = { max: 1000, podeSubir: false }
    await expect(enviarArquivoDireto(env, 'loja1', pedidoPUT(2000, '500'), 'x.pdf', limite)).rejects.toThrow('máximo')
    expect(objetos.size).toBe(0)
  })

  it('recusa envio sem tamanho', async () => {
    const { env } = r2Falso()
    await expect(enviarArquivoDireto(env, 'loja1', pedidoPUT(10, '0'), 'x.pdf', essencial)).rejects.toThrow('Arquivo vazio.')
  })
})

describe('guardarArquivo (formulário sem JavaScript)', () => {
  it('respeita o limite do plano', async () => {
    const { env, objetos } = r2Falso()
    const arquivo = new File([new Uint8Array(2000)], 'a.pdf', { type: 'application/pdf' })
    await expect(guardarArquivo(env, 'loja1', arquivo, { max: 1000, podeSubir: true })).rejects.toThrow('mude de plano')
    expect(objetos.size).toBe(0)
  })

  it('acima de 25 MB pede para atualizar o navegador, mesmo cabendo no plano', async () => {
    const { env } = r2Falso()
    const arquivo = new File([new Uint8Array(26 * MB)], 'a.pdf')
    await expect(guardarArquivo(env, 'loja1', arquivo, { max: 95 * MB, podeSubir: false })).rejects.toThrow('25 MB sem JavaScript')
  })

  it('grava arquivo pequeno', async () => {
    const { env, objetos } = r2Falso()
    const r = await guardarArquivo(env, 'loja1', new File([new Uint8Array(10)], 'Ok.pdf'), essencial)
    expect(r.tamanho).toBe(10)
    expect(objetos.size).toBe(1)
  })
})
