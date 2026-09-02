/**
 * Cifrado del backup con una frase que elige el usuario. AES-GCM con clave
 * derivada por PBKDF2-SHA256 — todo con WebCrypto, sin dependencias. Sin la
 * frase, el archivo exportado es texto plano legible (nombre, peso, fechas):
 * cifrarlo es opcional pero recomendado si va a salir del dispositivo.
 */

const PBKDF2_ITERATIONS = 210_000 // recomendación OWASP 2023 para SHA-256
const SALT_BYTES = 16
const IV_BYTES = 12

export interface EncryptedBlob {
  v: 1
  enc: 'AES-GCM'
  kdf: 'PBKDF2-SHA256'
  iterations: number
  salt: string // base64
  iv: string // base64
  data: string // base64 (ciphertext + tag)
}

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}
function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptString(plaintext: string, passphrase: string): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS)
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )
  return {
    v: 1,
    enc: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: toB64(salt.buffer),
    iv: toB64(iv.buffer),
    data: toB64(cipher),
  }
}

export function isEncryptedBlob(x: unknown): x is EncryptedBlob {
  return (
    typeof x === 'object' &&
    x !== null &&
    (x as { enc?: unknown }).enc === 'AES-GCM' &&
    typeof (x as { data?: unknown }).data === 'string'
  )
}

export async function decryptString(blob: EncryptedBlob, passphrase: string): Promise<string> {
  const key = await deriveKey(
    passphrase,
    fromB64(blob.salt),
    blob.iterations ?? PBKDF2_ITERATIONS
  )
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(blob.iv) },
      key,
      fromB64(blob.data)
    )
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error('Frase incorrecta o archivo dañado.')
  }
}
