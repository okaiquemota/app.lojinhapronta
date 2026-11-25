// Vitrine: só o que melhora a experiência. Sem este arquivo, tudo continua funcionando.
document.addEventListener('click', (e) => {
  const mini = e.target.closest('[data-imagem]')
  if (mini) {
    const principal = mini.closest('[data-galeria]').querySelector('.galeria__principal img')
    if (principal) principal.src = mini.dataset.imagem
    mini.closest('ul').querySelectorAll('button').forEach((b) => b.classList.toggle('ativa', b === mini))
  }
})

document.addEventListener('change', (e) => {
  if (e.target.matches('[data-enviar-ao-mudar]')) e.target.form.submit()
})

// Botão de enviar trava depois do clique: ninguém gera dois pedidos sem querer.
document.addEventListener('submit', (e) => {
  const form = e.target
  if (!form.dataset.enviando) return
  const botao = form.querySelector('button:not([type=button])')
  if (botao) {
    setTimeout(() => {
      botao.disabled = true
      botao.textContent = form.dataset.enviando
    }, 0)
  }
})
