import type { UserRole } from '@/types'
import { supabase } from '@/lib/supabaseClient'

/**
 * Auth real contra Supabase — reemplaza el login/registro 100% local de
 * lib/auth.ts (SHA-256 de una vuelta + OTP casero por EmailJS). Mismo
 * patrón "null si no está configurado" que el resto de las integraciones
 * opcionales del proyecto.
 *
 * La UI de código de 6 dígitos se mantiene: Supabase puede mandar un OTP
 * numérico en el email de confirmación en vez de un magic link — hace
 * falta que la plantilla "Confirm signup" del dashboard use {{ .Token }}
 * en vez de {{ .ConfirmationURL }} (ver docs/13-BACKEND-SUPABASE.md). Un
 * código tipeado a mano además evita el problema de "PKCE cross-device"
 * que un magic link sí tiene (abrís el mail en el celu, el signup había
 * arrancado en la compu).
 */

export function isSupabaseAuthConfigured(): boolean {
  return supabase !== null
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

function toAuthUser(user: {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.name as string | undefined) ?? '',
    // El rol vive en app_metadata (parte del JWT firmado por el server),
    // no en user_metadata — a diferencia de éste, el propio usuario no
    // puede escribirlo. Se asigna a mano desde el dashboard de Supabase
    // (ver docs/13-BACKEND-SUPABASE.md §"admin role").
    role: (user.app_metadata?.role as UserRole | undefined) ?? 'user',
  }
}

function mapAuthError(message: string): string {
  if (message.includes('already registered')) return 'Este email ya está registrado.'
  if (message.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (message.includes('expired')) return 'El código expiró. Pedí uno nuevo.'
  if (message.toLowerCase().includes('invalid') && message.toLowerCase().includes('otp')) {
    return 'Código incorrecto.'
  }
  if (message.toLowerCase().includes('invalid token')) return 'Código incorrecto.'
  if (message.toLowerCase().includes('should be different from the old password')) {
    return 'La contraseña nueva tiene que ser distinta de la anterior.'
  }
  return message
}

export async function signUp(email: string, password: string, name: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: { data: { name: name.trim() } },
  })
  if (error) throw new Error(mapAuthError(error.message))
  // Si el email ya tiene una cuenta confirmada, Supabase no manda error ni
  // código nuevo — responde con éxito y `identities: []` a propósito, para
  // no revelarle a un atacante si un email está registrado. Sin este check
  // la UI seguía de largo al paso de "ingresá el código" y ese código
  // nunca llegaba, porque nunca se mandó nada.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error('Ya existe una cuenta con este email. Iniciá sesión en vez de registrarte.')
  }
}

export async function verifySignupCode(email: string, code: string): Promise<AuthUser> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.toLowerCase().trim(),
    token: code.trim(),
    type: 'signup',
  })
  if (error || !data.user) throw new Error(error ? mapAuthError(error.message) : 'Código inválido.')
  return toAuthUser(data.user)
}

export async function resendSignupCode(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.toLowerCase().trim(),
  })
  if (error) throw new Error(mapAuthError(error.message))
}

/** Sentinel para que la UI decida qué mostrar (mismo criterio que la
 * versión local anterior) — un email sin confirmar necesita reabrir el
 * flujo de OTP, no un simple mensaje de error. */
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED'

export async function signIn(email: string, password: string): Promise<AuthUser> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  })
  if (error) {
    if (error.message.includes('Email not confirmed')) throw new Error(EMAIL_NOT_VERIFIED)
    throw new Error(mapAuthError(error.message))
  }
  if (!data.user) throw new Error('Email o contraseña incorrectos.')
  return toAuthUser(data.user)
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** Pide el código de recuperación. Mismo criterio que el signup: la
 * plantilla "Reset password" del dashboard tiene que usar {{ .Token }} en
 * vez de {{ .ConfirmationURL }} — ver docs/13-BACKEND-SUPABASE.md. */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim())
  if (error) throw new Error(mapAuthError(error.message))
}

/** Verifica el código de recuperación y deja la contraseña nueva. `verifyOtp`
 * con `type: 'recovery'` ya deja al usuario logueado (arranca una sesión),
 * así que `updateUser` corre autenticado como esa cuenta. */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<AuthUser> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.toLowerCase().trim(),
    token: code.trim(),
    type: 'recovery',
  })
  if (error || !data.user) throw new Error(error ? mapAuthError(error.message) : 'Código inválido.')

  const { data: updated, error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (updateError) throw new Error(mapAuthError(updateError.message))
  return toAuthUser(updated.user)
}
