import emailjs from '@emailjs/browser'
import { db } from '@/db/schema'
import type { User, UserRole } from '@/types'
import { uid, nowIso } from '@/lib/utils'

const ADMIN_EMAIL = 'santiagoritter26@gmail.com'

const EJS_SERVICE  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined
const EJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined
const EJS_KEY      = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined
const EMAIL_ENABLED = Boolean(EJS_SERVICE && EJS_TEMPLATE && EJS_KEY)

// ── Helpers criptográficos ──────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomSalt(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256(salt + password + salt)
}

// ── Verificación de email ───────────────────────────────────────────────────

const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_VERIFY_ATTEMPTS = 5

function generateCode(): string {
  return String(Math.floor(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000))
}

export async function sendVerificationEmail(userId: string, email: string, name: string): Promise<void> {
  // Cooldown real (no solo de UI): evita reenvíos en ráfaga aunque se
  // recargue la página o se manipule el estado del cliente.
  const existing = await db.emailVerifications.get(userId)
  if (existing) {
    const sinceLastSend = Date.now() - new Date(existing.lastSentAt).getTime()
    if (sinceLastSend < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - sinceLastSend) / 1000)
      throw new Error(`Esperá ${waitSec}s antes de pedir un código nuevo.`)
    }
  }

  const code = generateCode()
  const codeHash = await sha256(code)
  const now = nowIso()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

  await db.emailVerifications.put({
    id: userId,
    code: codeHash,
    expiresAt,
    lastSentAt: now,
    attempts: 0,
  })

  if (!EMAIL_ENABLED) {
    // Sin EmailJS configurado, logueamos el código para dev
    console.info(`[DEV] Código de verificación para ${email}: ${code}`)
    return
  }

  await emailjs.send(
    EJS_SERVICE!,
    EJS_TEMPLATE!,
    { to_email: email, to_name: name, code },
    EJS_KEY!
  )
}

export async function verifyEmailCode(userId: string, inputCode: string): Promise<void> {
  const record = await db.emailVerifications.get(userId)
  if (!record) throw new Error('No hay código pendiente. Solicitá uno nuevo.')

  if (new Date(record.expiresAt) < new Date()) {
    await db.emailVerifications.delete(userId)
    throw new Error('El código expiró. Volvé a registrarte para recibir uno nuevo.')
  }

  const attempts = record.attempts ?? 0
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    await db.emailVerifications.delete(userId)
    throw new Error('Demasiados intentos fallidos. Pedí un código nuevo.')
  }

  const inputHash = await sha256(inputCode.trim())
  if (inputHash !== record.code) {
    await db.emailVerifications.update(userId, { attempts: attempts + 1 })
    const left = MAX_VERIFY_ATTEMPTS - (attempts + 1)
    throw new Error(
      left > 0 ? `Código incorrecto. Te quedan ${left} intentos.` : 'Código incorrecto. Pedí uno nuevo.'
    )
  }

  await db.users.update(userId, { emailVerified: 1 })
  await db.emailVerifications.delete(userId)
}

export async function resendVerificationEmail(userId: string): Promise<void> {
  const user = await db.users.get(userId)
  if (!user) throw new Error('Usuario no encontrado.')
  if (user.emailVerified) throw new Error('El email ya está verificado.')
  await sendVerificationEmail(userId, user.email, user.name)
}

// ── Registro ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).+$/

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const normalized = email.toLowerCase().trim()

  if (!EMAIL_RE.test(normalized)) throw new Error('El email no tiene un formato válido.')
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
  if (!PASSWORD_RE.test(password)) {
    throw new Error('La contraseña debe incluir al menos una letra y un número.')
  }

  const existing = await db.users.where('email').equals(normalized).first()
  if (existing) throw new Error('Este email ya está registrado.')

  const role: UserRole = normalized === ADMIN_EMAIL ? 'admin' : 'user'
  const salt = randomSalt()
  const passwordHash = await hashPassword(password, salt)

  const user: User = {
    id: uid(),
    email: normalized,
    passwordHash,
    salt,
    role,
    name: name.trim(),
    createdAt: nowIso(),
    onboardingComplete: 0,
    emailVerified: 0,
  }
  await db.users.add(user)
  await sendVerificationEmail(user.id, user.email, user.name)
  return user
}

// ── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<User> {
  const user = await db.users.where('email').equals(email.toLowerCase().trim()).first()
  if (!user) throw new Error('Email o contraseña incorrectos.')

  const hash = await hashPassword(password, user.salt)
  if (hash !== user.passwordHash) throw new Error('Email o contraseña incorrectos.')

  if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED')

  return user
}
