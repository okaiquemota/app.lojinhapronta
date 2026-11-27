/** "R$ 1.234,56" a partir de centavos, com espaço que não quebra (o "R$" nunca fica sozinho no fim da linha). Sem Intl de propósito: igual em todo lugar. */
export function reais(centavos: number): string {
  const neg = centavos < 0
  const v = Math.abs(Math.round(centavos))
  const inteiro = Math.floor(v / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '-' : ''}R$\u00a0${inteiro},${String(v % 100).padStart(2, '0')}`
}

/** "19,90" · "19.90" · "1.234,56" · "R$ 19" → centavos. Inválido → null. */
export function centavosDeTexto(texto: string | null | undefined): number | null {
  let t = String(texto ?? '').replace(/[^\d,.]/g, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if (/\.\d{3}$/.test(t)) t = t.replace(/\./g, '')
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/** Centavos → "19,90" para preencher campo de formulário. */
export function centavosParaCampo(centavos: number | null | undefined): string {
  if (centavos == null) return ''
  return `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, '0')}`
}

export function slugificar(texto: string, max = 60): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '')
}

export function agora(): string {
  return new Date().toISOString()
}

export function somarDias(iso: string, dias: number): string {
  return new Date(Date.parse(iso) + dias * 86_400_000).toISOString()
}

// O Brasil não tem horário de verão desde 2019: Brasília é UTC−3 o ano todo.
function brasilia(iso: string): Date {
  return new Date(Date.parse(iso) - 3 * 3_600_000)
}

const p2 = (n: number) => String(n).padStart(2, '0')

export function dataBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = brasilia(iso)
  return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

export function dataHoraBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = brasilia(iso)
  return `${dataBR(iso)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
}

/** Dias inteiros que faltam até a data (arredonda para cima; 0 se passou). */
export function diasAte(iso: string): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000))
}

export function soNumeros(texto: string): string {
  return String(texto ?? '').replace(/\D/g, '')
}

/** Aceita "(16) 99999-9999", "16999999999" ou "5516999999999"; devolve com 55. */
export function normalizarWhatsapp(texto: string): string {
  const n = soNumeros(texto)
  if (!n) return ''
  if (n.length === 10 || n.length === 11) return `55${n}`
  return n
}

export function whatsappVisivel(numero: string): string {
  const n = soNumeros(numero).replace(/^55(?=\d{10,11}$)/, '')
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return numero
}

export function linkWhatsapp(numero: string, texto = ''): string {
  const n = soNumeros(numero)
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}

export function tamanhoArquivo(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 200
}

export function corValida(cor: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(cor)
}

/** Lê um JSON de lista guardado em coluna de texto. */
export function lista(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json || '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Texto limpo de formulário, com tamanho máximo. */
export function campo(valor: unknown, max = 500): string {
  return String(valor ?? '').trim().slice(0, max)
}

export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`
}
