import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Env } from '../src/tipos'
import worker from '../src/index'

const env = {
  DOMINIO_RAIZ: 'lojinhapronta.com.br',
  APP_URL: 'https://app.lojinhapronta.com.br',
  SITE_URL: 'https://lojinhapronta.com.br',
  SUBDOMINIOS_ATIVOS: 'sim',
} as unknown as Env
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext
const pedir = (url: string) => worker.fetch(new Request(url), env, ctx)

describe('robots e sitemap da plataforma', () => {
  it('a raiz serve robots.txt liberado, com o sitemap', async () => {
    const r = await pedir('https://lojinhapronta.com.br/robots.txt')
    assert.equal(r.status, 200)
    const t = await r.text()
    assert.match(t, /Allow: \//)
    assert.match(t, /Sitemap: https:\/\/lojinhapronta\.com\.br\/sitemap\.xml/)
  })

  it('a raiz serve sitemap.xml com a apresentação', async () => {
    const r = await pedir('https://lojinhapronta.com.br/sitemap.xml')
    assert.equal(r.status, 200)
    assert.match(r.headers.get('content-type') ?? '', /xml/)
    assert.match(await r.text(), /<loc>https:\/\/lojinhapronta\.com\.br\/<\/loc>/)
  })

  it('o resto da raiz continua indo para app.', async () => {
    const r = await pedir('https://lojinhapronta.com.br/cadastro')
    assert.equal(r.status, 301)
    assert.equal(r.headers.get('location'), 'https://app.lojinhapronta.com.br/cadastro')
  })

  it('app. bloqueia painel e admin', async () => {
    const r = await pedir('https://app.lojinhapronta.com.br/robots.txt')
    assert.equal(r.status, 200)
    const t = await r.text()
    assert.match(t, /Disallow: \/painel/)
    assert.match(t, /Disallow: \/admin/)
    assert.doesNotMatch(t, /Sitemap:/)
  })
})
