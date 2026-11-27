/**
 * Tamanho máximo do arquivo que a lojista coloca à venda.
 *
 * Por que existe: a Cloudflare corta qualquer envio acima de 100 MB antes de ele
 * chegar ao Worker, e o Worker só tem 128 MB de memória. Sem um limite claro, um
 * PDF de 1 GB sobe por vários minutos e termina num erro genérico; e um arquivo
 * enorme vira download que trava no celular da compradora, gastando o limite de
 * downloads dela.
 *
 * O limite de cada plano fica na coluna planos.limite_arquivo_mb (NULL = o
 * máximo técnico). Trocar é um UPDATE, não um deploy.
 */

export const MB = 1024 * 1024

/** Teto técnico: abaixo dos 100 MB que a Cloudflare aceita por requisição. */
export const MAX_ARQUIVO_TECNICO = 95 * MB

/** Pelo formulário comum (navegador sem JS), o arquivo passa pela memória do Worker. */
export const MAX_ARQUIVO_FORMULARIO = 25 * MB

/** Converte o limite do plano (em MB) em bytes, sem nunca passar do teto técnico. */
export function limiteArquivoBytes(limiteMb: number | null | undefined): number {
  if (limiteMb == null || !Number.isFinite(limiteMb) || limiteMb <= 0) return MAX_ARQUIVO_TECNICO
  return Math.min(Math.floor(limiteMb * MB), MAX_ARQUIVO_TECNICO)
}

/** "50 MB", "95 MB", "1,5 MB". */
export function mbTexto(bytes: number): string {
  const mb = bytes / MB
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1).replace('.', ',')} MB`
}

/**
 * Mensagem para a lojista quando o arquivo passa do limite. Diz o tamanho dela,
 * o limite e o que fazer. `podeSubir` = existe plano com limite maior.
 */
export function mensagemArquivoGrande(tamanho: number, max: number, podeSubir = false): string {
  const tem = tamanho > 0 ? `O arquivo tem ${mbTexto(tamanho)} e o` : 'O'
  const dica = podeSubir
    ? 'Comprima o PDF, divida em partes ou mude de plano para enviar arquivos maiores.'
    : 'Comprima o PDF ou divida em partes (ex.: volume 1 e volume 2).'
  return `${tem} máximo do seu plano é ${mbTexto(max)}. ${dica}`
}

/** null = cabe; texto = erro para mostrar. */
export function conferirTamanho(tamanho: number, max: number, podeSubir = false): string | null {
  if (!Number.isFinite(tamanho) || tamanho <= 0) return 'Arquivo vazio.'
  return tamanho > max ? mensagemArquivoGrande(tamanho, max, podeSubir) : null
}

/**
 * Limite que vale para a loja agora. Durante o teste vale o maior plano (como no
 * limite de produtos); sem plano e fora do teste, o menor.
 */
export function limiteDoPlano(
  planos: { id: string; limite_arquivo_mb: number | null }[],
  planoId: string | null,
  emTeste: boolean,
): { max: number; podeSubir: boolean } {
  const limites = planos.map((p) => limiteArquivoBytes(p.limite_arquivo_mb))
  const maior = limites.length ? Math.max(...limites) : MAX_ARQUIVO_TECNICO
  const menor = limites.length ? Math.min(...limites) : MAX_ARQUIVO_TECNICO
  const atual = planos.find((p) => p.id === planoId)
  const max = emTeste ? maior : atual ? limiteArquivoBytes(atual.limite_arquivo_mb) : menor
  return { max, podeSubir: max < maior }
}
