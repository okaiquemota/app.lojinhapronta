/**
 * Arquivos no R2. Duas pastas com regras opostas:
 *
 *   img/<loja>/<id>.<ext>        público — servido em /i/<loja>/<id>.<ext>
 *   arq/<loja>/<id>/<nome.pdf>   privado — só sai pelo download de pedido pago
 */
import type { Env } from '../tipos'
import { gerarId } from './seguranca'

const TIPOS_IMAGEM: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const MAX_IMAGEM = 8 * 1024 * 1024
// O Worker aceita corpo de até 100 MB, mas tem só 128 MB de memória: arquivo
// grande vai pelo envio direto (enviarArquivoDireto), que passa em fluxo sem
// ficar inteiro na memória. Pelo formulário comum (navegador sem JS), 25 MB.
export const MAX_ARQUIVO = 95 * 1024 * 1024
export const MAX_ARQUIVO_FORMULARIO = 25 * 1024 * 1024

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

export async function guardarArquivo(env: Env, lojaId: string, arquivo: File): Promise<{ key: string; nome: string; tamanho: number }> {
  if (arquivo.size > MAX_ARQUIVO_FORMULARIO) throw new Error('Arquivo grande demais para este navegador (máximo 25 MB). Atualize o navegador ou comprima o PDF.')
  const nome = nomeSeguro(arquivo.name || 'arquivo.pdf')
  const key = `arq/${lojaId}/${gerarId()}/${nome}`
  await env.ARQUIVOS.put(key, arquivo.stream(), {
    httpMetadata: { contentType: arquivo.type || 'application/octet-stream' },
  })
  return { key, nome, tamanho: arquivo.size }
}

/** Envio direto: o corpo da requisição vai em fluxo para o R2. */
export async function enviarArquivoDireto(env: Env, lojaId: string, req: Request, nomeOriginal: string): Promise<{ key: string; nome: string; tamanho: number }> {
  const tamanho = Number(req.headers.get('content-length') || 0)
  if (!tamanho || !req.body) throw new Error('Arquivo vazio.')
  if (tamanho > MAX_ARQUIVO) throw new Error('Arquivo grande demais (máximo 95 MB). Comprima o PDF ou divida em partes.')
  const nome = nomeSeguro(nomeOriginal || 'arquivo.pdf')
  const key = `arq/${lojaId}/${gerarId()}/${nome}`
  const obj = await env.ARQUIVOS.put(key, req.body, {
    httpMetadata: { contentType: (req.headers.get('content-type') || 'application/octet-stream').slice(0, 100) },
  })
  return { key, nome, tamanho: obj?.size ?? tamanho }
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
