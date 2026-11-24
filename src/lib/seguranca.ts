/**
 * Senha, token e cifra. Tudo com WebCrypto, que o Worker já traz.
 */
import type { Env } from '../tipos'

const enc = new TextEncoder()
const dec = new TextDecoder()

export function gerarId(): string {
  return crypto.randomUUID()
}

function paraBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  for (const b of arr) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64Url(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((texto.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Token aleatório para cookie, link de pedido, redefinição de senha. */
export function gerarToken(bytes = 32): string {
  return paraBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

export async function sha256(texto: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(texto))
  return paraBase64Url(h)
}

function iguais(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]
  return d === 0
}

// O Worker limita PBKDF2 a 100 mil iterações; é o teto e é o que usamos.
const ITERACOES = 100_000

async function derivar(senha: string, sal: Uint8Array, iteracoes: number): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes }, chave, 256)
  return new Uint8Array(bits)
}

export async function hashSenha(senha: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const h = await derivar(senha, sal, ITERACOES)
  return `pbkdf2$${ITERACOES}$${paraBase64Url(sal)}$${paraBase64Url(h)}`
}

export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [alg, it, sal, hash] = guardado.split('$')
  if (alg !== 'pbkdf2' || !it || !sal || !hash) return false
  const h = await derivar(senha, deBase64Url(sal), Number(it))
  return iguais(h, deBase64Url(hash))
}

// ── cifra dos tokens do Mercado Pago ───────────────────────────────────────

let chaveCache: { segredo: string; chave: CryptoKey } | null = null

async function chaveCifra(env: Env): Promise<CryptoKey> {
  if (!env.SEGREDO_APP || env.SEGREDO_APP.length < 32) {
    throw new Error('SEGREDO_APP ausente ou curto demais (mínimo 32 caracteres)')
  }
  if (chaveCache?.segredo === env.SEGREDO_APP) return chaveCache.chave
  const material = await crypto.subtle.digest('SHA-256', enc.encode(`cifra:${env.SEGREDO_APP}`))
  const chave = await crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt'])
  chaveCache = { segredo: env.SEGREDO_APP, chave }
  return chave
}

export async function cifrar(env: Env, texto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chaveCifra(env), enc.encode(texto))
  return `v1.${paraBase64Url(iv)}.${paraBase64Url(ct)}`
}

export async function decifrar(env: Env, cifrado: string): Promise<string> {
  const [v, iv, ct] = cifrado.split('.')
  if (v !== 'v1' || !iv || !ct) throw new Error('formato de cifra desconhecido')
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64Url(iv) }, await chaveCifra(env), deBase64Url(ct))
  return dec.decode(pt)
}

// ── assinatura curta (state do OAuth) ──────────────────────────────────────

async function chaveHmac(env: Env): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(`hmac:${env.SEGREDO_APP}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function assinar(env: Env, texto: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await chaveHmac(env), enc.encode(texto))
  return `${paraBase64Url(enc.encode(texto))}.${paraBase64Url(sig)}`
}

export async function abrirAssinado(env: Env, assinado: string): Promise<string | null> {
  const [corpo, sig] = assinado.split('.')
  if (!corpo || !sig) return null
  const texto = dec.decode(deBase64Url(corpo))
  const ok = await crypto.subtle.verify('HMAC', await chaveHmac(env), deBase64Url(sig), enc.encode(texto))
  return ok ? texto : null
}
