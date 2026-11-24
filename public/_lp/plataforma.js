// Painel: ajudas que deixam o formulário mais agradável. Sem JS, tudo funciona.

// Confirmação antes de ações sem volta.
document.addEventListener('click', (e) => {
  const botao = e.target.closest('[data-confirmar]')
  if (botao && !confirm(botao.dataset.confirmar)) e.preventDefault()
})

// Copiar link.
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copiar]')
  if (!b) return
  try {
    await navigator.clipboard.writeText(b.dataset.copiar)
    const antes = b.innerHTML
    b.textContent = 'Copiado!'
    setTimeout(() => (b.innerHTML = antes), 1600)
  } catch {
    prompt('Copie o link:', b.dataset.copiar)
  }
})

// Arquivo do produto vai direto para o armazenamento, com progresso, antes de
// salvar o formulário. Assim um PDF de 90 MB não passa pela memória do servidor.
document.addEventListener('submit', (e) => {
  const form = e.target
  const url = form.dataset.envioDireto
  const input = form.querySelector('input[type=file][data-direto]')
  const destino = form.querySelector('input[name=arquivo_key]')
  if (!url || !input || !input.files?.length || !destino || typeof XMLHttpRequest === 'undefined') return
  e.preventDefault()
  e.stopImmediatePropagation()
  const arquivo = input.files[0]
  const botao = e.submitter || form.querySelector('button:not([type=button])')
  const textoOriginal = botao?.textContent
  if (botao) botao.disabled = true
  const xhr = new XMLHttpRequest()
  xhr.open('PUT', url)
  xhr.setRequestHeader('Content-Type', arquivo.type || 'application/octet-stream')
  xhr.setRequestHeader('x-nome-arquivo', encodeURIComponent(arquivo.name))
  xhr.upload.onprogress = (ev) => {
    if (botao && ev.lengthComputable) botao.textContent = `Enviando arquivo… ${Math.round((ev.loaded / ev.total) * 100)}%`
  }
  const falhou = (msg) => {
    if (botao) {
      botao.disabled = false
      botao.textContent = textoOriginal
    }
    alert(msg || 'O envio do arquivo falhou. Confira a internet e tente de novo.')
  }
  xhr.onerror = () => falhou()
  xhr.onload = () => {
    let r = {}
    try {
      r = JSON.parse(xhr.responseText)
    } catch {}
    if (xhr.status !== 200 || !r.key) return falhou(r.erro)
    destino.value = r.key
    input.removeAttribute('name') // o arquivo já subiu: não manda de novo
    if (botao) botao.textContent = 'Salvando…'
    form.submit()
  }
  xhr.send(arquivo)
})

// Botão de enviar trava e avisa enquanto o upload acontece.
document.addEventListener('submit', (e) => {
  const form = e.target
  const botao = e.submitter || form.querySelector('button[type=submit], button:not([type])')
  if (!botao || !form.dataset.enviando) return
  setTimeout(() => {
    botao.disabled = true
    botao.textContent = form.dataset.enviando
  }, 0)
})

// Endereço da loja: sugere a partir do nome e diz se está livre.
;(() => {
  const nome = document.querySelector('input[name=loja]')
  const slug = document.querySelector('input[name=slug]')
  const status = document.querySelector('[data-slug-status]')
  if (!slug || !status) return
  let mexeu = !!slug.value
  const limpar = (t) =>
    t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  let timer
  const conferir = () => {
    clearTimeout(timer)
    const v = limpar(slug.value)
    if (!v) {
      status.textContent = 'Só letras sem acento, números e hífen.'
      status.parentElement.removeAttribute('data-livre')
      return
    }
    timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/endereco?s=${encodeURIComponent(v)}`).then((r) => r.json())
        status.textContent = r.livre ? `✓ ${r.slug} está livre` : r.motivo
        status.parentElement.dataset.livre = r.livre ? 'sim' : 'nao'
      } catch {}
    }, 300)
  }
  nome?.addEventListener('input', () => {
    if (!mexeu) {
      slug.value = limpar(nome.value)
      conferir()
    }
  })
  slug.addEventListener('input', () => {
    mexeu = true
    conferir()
  })
  slug.addEventListener('blur', () => (slug.value = limpar(slug.value)))
})()

// Cores: paletas prontas, prévia ao vivo e alerta de contraste.
;(() => {
  const previa = document.querySelector('[data-previa]')
  if (!previa) return
  const marca = document.querySelector('[data-cor=marca]')
  const destaque = document.querySelector('[data-cor=destaque]')
  const aviso = previa.querySelector('[data-contraste]')
  const luz = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const atualizar = () => {
    previa.style.setProperty('--marca', marca.value)
    previa.style.setProperty('--destaque', destaque.value)
    const contraste = 1.05 / (luz(destaque.value) + 0.05)
    aviso.textContent = contraste < 3.5 ? 'A cor dos botões está clara demais: o texto branco fica difícil de ler no celular.' : ''
  }
  marca.addEventListener('input', atualizar)
  destaque.addEventListener('input', atualizar)
  document.querySelectorAll('[data-paleta]').forEach((b) =>
    b.addEventListener('click', () => {
      const [m, d] = b.dataset.paleta.split(',')
      marca.value = m
      destaque.value = d
      document.querySelectorAll('[data-paleta]').forEach((x) => x.classList.toggle('ativa', x === b))
      atualizar()
    }),
  )
  atualizar()
})()

// Foto grande do celular (5–10 MB) vira uma de ~300 KB antes de subir.
document.addEventListener('change', async (e) => {
  const input = e.target
  if (!input.matches('input[type=file][data-reduzir-imagem]') || !input.files?.length) return
  const max = Number(input.dataset.reduzirImagem) || 1600
  if (typeof DataTransfer === 'undefined' || typeof createImageBitmap === 'undefined') return
  const saida = new DataTransfer()
  for (const f of input.files) {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 400_000) {
      saida.items.add(f)
      continue
    }
    try {
      const img = await createImageBitmap(f)
      const escala = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const tipo = f.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const blob = await new Promise((r) => canvas.toBlob(r, tipo, 0.86))
      saida.items.add(blob && blob.size < f.size ? new File([blob], f.name.replace(/\.\w+$/, tipo === 'image/png' ? '.png' : '.jpg'), { type: tipo }) : f)
    } catch {
      saida.items.add(f)
    }
  }
  input.files = saida.files
})
