import { db } from '@/db/schema'
import type { User, UserRole } from '@/types'
import { uid, nowIso } from '@/lib/utils'

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

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  const existing = await db.users.where('email').equals(email.toLowerCase()).first()
  if (existing) throw new Error('Este email ya está registrado.')

  const totalUsers = await db.users.count()
  const role: UserRole = totalUsers === 0 ? 'admin' : 'user'
  const salt = randomSalt()
  const passwordHash = await hashPassword(password, salt)

  const user: User = {
    id: uid(),
    email: email.toLowerCase(),
    passwordHash,
    salt,
    role,
    name,
    createdAt: nowIso(),
    onboardingComplete: 0,
  }
  await db.users.add(user)
  return user
}

export async function loginUser(
  email: string,
  password: string
): Promise<User> {
  const user = await db.users.where('email').equals(email.toLowerCase()).first()
  if (!user) throw new Error('Email o contraseña incorrectos.')
  const hash = await hashPassword(password, user.salt)
  if (hash !== user.passwordHash) throw new Error('Email o contraseña incorrectos.')
  return user
}
