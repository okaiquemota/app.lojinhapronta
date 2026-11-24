/**
 * Texto simples da lojista → parágrafos, listas e subtítulos. Sem HTML cru:
 * tudo passa pelo JSX, que escapa. A lojista não precisa aprender marcação,
 * e ninguém injeta script numa descrição de produto.
 *
 *   linha em branco  → novo parágrafo
 *   "- " ou "• "     → item de lista
 *   "## "            → subtítulo
 */
export function TextoRico({ texto }: { texto: string }) {
  const blocos: any[] = []
  const linhas = (texto || '').replace(/\r\n?/g, '\n').split('\n')
  let paragrafo: string[] = []
  let itens: string[] = []

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      blocos.push(
        <p>
          {paragrafo.map((l, i) => (
            <>
              {i > 0 && <br />}
              {l}
            </>
          ))}
        </p>,
      )
      paragrafo = []
    }
  }
  const fecharLista = () => {
    if (itens.length) {
      blocos.push(
        <ul>
          {itens.map((i) => (
            <li>{i}</li>
          ))}
        </ul>,
      )
      itens = []
    }
  }

  for (const bruta of linhas) {
    const l = bruta.trim()
    if (!l) {
      fecharParagrafo()
      fecharLista()
    } else if (/^[-•*]\s+/.test(l)) {
      fecharParagrafo()
      itens.push(l.replace(/^[-•*]\s+/, ''))
    } else if (l.startsWith('## ')) {
      fecharParagrafo()
      fecharLista()
      blocos.push(<h3>{l.slice(3)}</h3>)
    } else {
      fecharLista()
      paragrafo.push(l)
    }
  }
  fecharParagrafo()
  fecharLista()
  return <>{blocos}</>
}

/** Primeiras palavras de um texto, para meta description. */
export function resumir(texto: string, max = 155): string {
  const t = (texto || '').replace(/^[-•*#]+\s*/gm, '').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : t
}
