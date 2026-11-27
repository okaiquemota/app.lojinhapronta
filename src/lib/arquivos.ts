/**
 * Arquivos no R2. Duas pastas com regras opostas:
 *
 *   img/<loja>/<id>.<ext>        público — servido em /i/<loja>/<id>.<ext>
 *   arq/<loja>/<id>/<nome.pdf>   privado — só sai pelo download de pedido pago
 */
import type { Env } from '../tipos'
import { gerarId } from './seguranca'
import { MAX_ARQUIVO_FORMULARIO, MAX_ARQUIVO_TECNICO, conferirTamanho, mbTexto } from './limites'

export { MAX_ARQUIVO_FORMULARIO }

/** Limite que vale para um envio: o do plano e se existe plano maior. */
export type Limite = { max: number; podeSubir: boolean }
const SEM_PLANO: Limite = { max: MAX_ARQUIVO_TECNICO, podeSubir: false }

const TIPOS_IMAGEM: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MAX_IMAGEM = 8 * 1024 * 1024
// Arquivo à venda: o limite vem do plano (src/lib/limites.ts). O envio direto
// (enviarArquivoDireto) passa em fluxo sem ficar inteiro na memória; pelo
// formulário comum (navegador sem JS), no máximo 25 MB.

/** Um <input type=file> vazio chega como File de tamanho zero. */
export function arquivoEnviado(v: unknown): File | null {
  return v instanceof File && v.size > 0 ? v : null
}

export async function guardarImagem(env: Env, lojaId: string, arquivo: File): Promise<string> {
  const ext = TIPOS_IMAGEM[arquivo.type]
  if (!ext) throw new Error('Imagem precisa ser JPG, PNG, WEBP ou GIF.')
  if (arquivo.size > MAX_IMAGEM) throw new Error('Imagem grande demais (máximo 8 MB).')
  const key = `img/${lojaId}/${gerarId()}.${ext}`
  await env.ARQUIVOS.put(key, arquivo.stream(), { httpMetadata: { contentType: arquivo.type } })
  return key
}

export async function guardarArquivo(env: Env, lojaId: string, arquivo: File, limite: Limite = SEM_PLANO): Promise<{ key: string; nome: string; tamanho: number }> {
  const erro = conferirTamanho(arquivo.size, limite.max, limite.podeSubir)
  if (erro) throw new Error(erro)
  if (arquivo.size > MAX_ARQUIVO_FORMULARIO) {
    throw new Error(`Arquivo grande demais para este navegador (máximo ${mbTexto(MAX_ARQUIVO_FORMULARIO)} sem JavaScript). Atualize o navegador ou comprima o PDF.`)
  }
  const nome = nomeSeguro(arquivo.name || 'arquivo.pdf')
  const key = `arq/${lojaId}/${gerarId()}/${nome}`
  await env.ARQUIVOS.put(key, arquivo.stream(), {
    httpMetadata: { contentType: arquivo.type || 'application/octet-stream' },
  })
  return { key, nome, tamanho: arquivo.size }
}

/** Envio direto: o corpo da requisição vai em fluxo para o R2. */
export async function enviarArquivoDireto(
  env: Env,
  lojaId: string,
  req: Request,
  nomeOriginal: string,
  limite: Limite = SEM_PLANO,
): Promise<{ key: string; nome: string; tamanho: number }> {
  // Sem Content-Length (envio "chunked") não dá para conferir antes: recusa.
  const tamanho = Number(req.headers.get('content-length') || 0)
  if (!req.body) throw new Error('Arquivo vazio.')
  const erro = conferirTamanho(tamanho, limite.max, limite.podeSubir)
  if (erro) throw new Error(erro)
  const nome = nomeSeguro(nomeOriginal || 'arquivo.pdf')
  const key = `arq/${lojaId}/${gerarId()}/${nome}`
  const obj = await env.ARQUIVOS.put(key, req.body, {
    httpMetadata: { contentType: (req.headers.get('content-type') || 'application/octet-stream').slice(0, 100) },
  })
  // Confere o que de fato foi gravado, não só o que o cabeçalho prometeu.
  const gravado = obj?.size ?? tamanho
  const erroGravado = conferirTamanho(gravado, limite.max, limite.podeSubir)
  if (erroGravado) {
    await env.ARQUIVOS.delete(key)
    throw new Error(erroGravado)
  }
  return { key, nome, tamanho: gravado }
}

/** Confere que um arquivo enviado direto é mesmo desta loja e existe. */
export async function arquivoDaLoja(env: Env, lojaId: string, key: string): Promise<{ key: string; nome: string; tamanho: number } | null> {
  if (!key.startsWith(`arq/${lojaId}/`) || key.includes('..')) return null
  const h = await env.ARQUIVOS.head(key)
  return h ? { key, nome: key.split('/').pop()!, tamanho: h.size } : null
}

export async function apagar(env: Env, ...keys: (string | null | undefined)[]): Promise<void> {
  const k = keys.filter((x): x is string => !!x)
  if (k.length) await env.ARQUIVOS.delete(k)
}

/** "Apostila Nº 1 (final).pdf" → "Apostila-N-1-final.pdf": nome que não quebra cabeçalho nem caminho. */
export function nomeSeguro(nome: string): string {
  const limpo = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|-+$/g, '')
  return (limpo || 'arquivo').slice(-120)
}

/** Serve uma imagem pública, com cache longo: a chave muda a cada envio. */
export async function servirImagem(env: Env, caminho: string, req: Request): Promise<Response> {
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(caminho)) return new Response('Não encontrado', { status: 404 })
  const cache = caches.default
  const emCache = await cache.match(req)
  if (emCache) return emCache
  const obj = await env.ARQUIVOS.get(`img/${caminho}`)
  if (!obj) return new Response('Não encontrado', { status: 404 })
  const res = new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ETag: obj.httpEtag,
    },
  })
  try {
    await cache.put(req, res.clone())
  } catch {}
  return res
}
