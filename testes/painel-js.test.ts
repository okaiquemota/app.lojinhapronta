/**
 * O JS do painel (public/_lp/plataforma.js.txt) num navegador de mentira (jsdom):
 * o limite de tamanho tem de avisar antes de qualquer envio.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { MB } from '../src/lib/limites'

const js = readFileSync(resolve(process.cwd(), 'public/_lp/plataforma.js.txt'), 'utf8')

/** Monta o formulário de produto como o CampoArquivo (ui.tsx) desenha. */
function montar() {
  const dom = new JSDOM(
    `<form method="post" data-envio-direto="/painel/arquivos" data-enviando="Salvando…">
      <div class="campo campo-arquivo">
        <label for="c-arquivo">Enviar arquivo</label>
        <input id="c-arquivo" type="file" name="arquivo" data-direto data-max-bytes="${50 * MB}" data-max-texto="50 MB" data-pode-subir="sim" aria-describedby="c-arquivo-ajuda" />
        <p class="campo__ajuda" id="c-arquivo-ajuda">até 50 MB</p>
      </div>
      <input type="hidden" name="arquivo_key" value="" />
      <button>Salvar produto</button>
    </form>`,
    { runScripts: 'outside-only' },
  )
  const w = dom.window as any
  let envios = 0
  w.XMLHttpRequest = class {
    upload = {}
    open() {}
    setRequestHeader() {}
    send() {
      envios++
    }
  }
  w.eval(js)
  const input = w.document.querySelector('#c-arquivo') as HTMLInputElement
  return { w, doc: w.document as Document, input, envios: () => envios }
}

/** jsdom não deixa escolher arquivo de verdade: simula a escolha (e o "limpar" do input). */
function escolher(w: any, input: HTMLInputElement, bytes: number, disparar = true) {
  const f = new w.File(['x'], 'apostila.pdf', { type: 'application/pdf' })
  Object.defineProperty(f, 'size', { value: bytes })
  let escolhido: File | null = f
  Object.defineProperty(input, 'files', { configurable: true, get: () => (escolhido ? [escolhido] : []) })
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => (escolhido ? 'C:\\fakepath\\apostila.pdf' : ''),
    set: (v: string) => {
      if (v === '') escolhido = null
    },
  })
  if (disparar) input.dispatchEvent(new w.Event('change', { bubbles: true }))
}

const erroDe = (doc: Document) => doc.querySelector<HTMLElement>('.campo__erro')

describe('painel: limite de tamanho no navegador', () => {
  it('avisa na hora e descarta um PDF de 1 GB', () => {
    const { w, doc, input } = montar()
    escolher(w, input, 1024 * MB)
    const erro = erroDe(doc)!
    assert.equal(erro.hidden, false)
    assert.equal(
      erro.textContent,
      'O arquivo tem 1024 MB e o máximo do seu plano é 50 MB. Comprima o PDF, divida em partes ou mude de plano para enviar arquivos maiores.',
    )
    assert.ok(input.closest('.campo')!.classList.contains('campo--erro'))
    assert.equal(input.getAttribute('aria-invalid'), 'true')
    assert.equal(input.getAttribute('aria-describedby'), 'c-arquivo-erro c-arquivo-ajuda')
    assert.equal(input.value, '')
  })

  it('aceita arquivo dentro do limite e limpa o erro anterior', () => {
    const { w, doc, input } = montar()
    escolher(w, input, 1024 * MB)
    escolher(w, input, 10 * MB)
    assert.equal(erroDe(doc)!.hidden, true)
    assert.equal(input.getAttribute('aria-invalid'), null)
    assert.notEqual(input.value, '')
  })

  it('não começa o envio de um arquivo grande demais', () => {
    const { w, doc, input, envios } = montar()
    // escolhe sem disparar o "change" (ex.: arrastou o arquivo), e tenta salvar
    escolher(w, input, 200 * MB, false)
    input.form!.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }))
    assert.equal(envios(), 0)
    assert.match(erroDe(doc)!.textContent!, /200 MB/)
  })

  it('envia direto o arquivo que cabe', () => {
    const { w, input, envios } = montar()
    escolher(w, input, 10 * MB)
    input.form!.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }))
    assert.equal(envios(), 1)
  })
})
