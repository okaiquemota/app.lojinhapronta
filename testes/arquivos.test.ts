import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
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
    assert.equal(r.tamanho, 1024)
    assert.match(r.key, /^arq\/loja1\/.+\/Apostila\.pdf$/)
    assert.equal(objetos.size, 1)
  })

  it('recusa pelo cabeçalho, antes de gravar, quando passa do limite', async () => {
    const { env, objetos } = r2Falso()
    // 1 GB anunciado no cabeçalho: nem começa a gravar.
    const req = new Request('https://app.test/painel/arquivos', {
      method: 'PUT',
      body: new Uint8Array(10),
      headers: { 'content-length': String(1024 * MB) },
    })
    await assert.rejects(enviarArquivoDireto(env, 'loja1', req, 'grande.pdf', essencial), (e: Error) => e.message.includes('máximo do seu plano é 50 MB'))
    assert.equal(objetos.size, 0)
  })

  it('apaga o que foi gravado se o corpo for maior do que o cabeçalho prometeu', async () => {
    const { env, objetos } = r2Falso()
    const limite = { max: 1000, podeSubir: false }
    await assert.rejects(enviarArquivoDireto(env, 'loja1', pedidoPUT(2000, '500'), 'x.pdf', limite), (e: Error) => e.message.includes('máximo'))
    assert.equal(objetos.size, 0)
  })

  it('recusa envio sem tamanho', async () => {
    const { env } = r2Falso()
    await assert.rejects(enviarArquivoDireto(env, 'loja1', pedidoPUT(10, '0'), 'x.pdf', essencial), (e: Error) => e.message.includes('Arquivo vazio.'))
  })
})

describe('guardarArquivo (formulário sem JavaScript)', () => {
  it('respeita o limite do plano', async () => {
    const { env, objetos } = r2Falso()
    const arquivo = new File([new Uint8Array(2000)], 'a.pdf', { type: 'application/pdf' })
    await assert.rejects(guardarArquivo(env, 'loja1', arquivo, { max: 1000, podeSubir: true }), (e: Error) => e.message.includes('mude de plano'))
    assert.equal(objetos.size, 0)
  })

  it('acima de 25 MB pede para atualizar o navegador, mesmo cabendo no plano', async () => {
    const { env } = r2Falso()
    const arquivo = new File([new Uint8Array(26 * MB)], 'a.pdf')
    await assert.rejects(guardarArquivo(env, 'loja1', arquivo, { max: 95 * MB, podeSubir: false }), (e: Error) => e.message.includes('25 MB sem JavaScript'))
  })

  it('grava arquivo pequeno', async () => {
    const { env, objetos } = r2Falso()
    const r = await guardarArquivo(env, 'loja1', new File([new Uint8Array(10)], 'Ok.pdf'), essencial)
    assert.equal(r.tamanho, 10)
    assert.equal(objetos.size, 1)
  })
})
