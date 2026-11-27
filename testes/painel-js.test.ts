// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { MB } from '../src/lib/limites'

const js = readFileSync(resolve(process.cwd(), 'public/_lp/plataforma.js.txt'), 'utf8')

function montar() {
  document.body.innerHTML = `
    <form data-envio-direto="/painel/arquivos" data-enviando="Salvando…">
      <div class="campo">
        <input id="c-arquivo" type="file" name="arquivo" data-direto data-max-bytes="${50 * MB}" data-max-texto="50 MB" data-pode-subir="sim" />
        <input type="hidden" name="arquivo_key" value="" />
        <p class="campo__erro" data-erro-arquivo hidden></p>
      </div>
      <button>Salvar produto</button>
    </form>`
  return document.querySelector<HTMLInputElement>('#c-arquivo')!
}

/** jsdom não deixa escolher arquivo de verdade: simula a escolha (e o "limpar" do input). */
function escolher(input: HTMLInputElement, bytes: number, disparar = true) {
  const f = new File(['x'], 'apostila.pdf', { type: 'application/pdf' })
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
  if (disparar) input.dispatchEvent(new Event('change', { bubbles: true }))
}

beforeAll(() => {
  window.alert = vi.fn()
  new Function(js)()
})

describe('painel: limite de tamanho no navegador', () => {
  it('avisa na hora e descarta um PDF de 1 GB', () => {
    const input = montar()
    escolher(input, 1024 * MB)
    const erro = document.querySelector<HTMLElement>('[data-erro-arquivo]')!
    expect(erro.hidden).toBe(false)
    expect(erro.textContent).toBe('O arquivo tem 1024 MB e o máximo do seu plano é 50 MB. Comprima o PDF, divida em partes ou mude de plano para enviar arquivos maiores.')
    expect(input.closest('.campo')!.classList.contains('campo--erro')).toBe(true)
    expect(input.value).toBe('')
  })

  it('aceita arquivo dentro do limite e limpa o erro anterior', () => {
    const input = montar()
    escolher(input, 1024 * MB)
    escolher(input, 10 * MB)
    const erro = document.querySelector<HTMLElement>('[data-erro-arquivo]')!
    expect(erro.hidden).toBe(true)
    expect(input.value).not.toBe('')
  })

  it('não começa o envio de um arquivo grande demais', () => {
    const input = montar()
    const xhr = vi.fn()
    ;(window as any).XMLHttpRequest = xhr
    // escolhe sem disparar o "change" (ex.: arrastou o arquivo), e tenta salvar
    escolher(input, 200 * MB, false)
    const form = input.form!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(xhr).not.toHaveBeenCalled()
    expect(document.querySelector<HTMLElement>('[data-erro-arquivo]')!.textContent).toContain('200 MB')
  })
})
