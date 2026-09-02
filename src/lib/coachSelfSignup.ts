import { supabase } from '@/lib/supabaseClient'

/**
 * Alta self-serve de coach desde Ajustes. Llama a la Edge Function
 * `become-coach` (que setea el rol con la service_role tras validar el DNI)
 * y refresca la sesión para que el JWT nuevo traiga `role: 'coach'` — el
 * listener de `onAuthStateChange` en main.tsx actualiza `authStore` solo.
 */
export async function becomeCoach(input: {
  displayName: string
  dni: string
  bio?: string
  experienceYears?: number | null
}): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')

  const { data, error } = await supabase.functions.invoke('become-coach', { body: input })
  if (error) throw new Error(await edgeErrorMessage(error))
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)

  // El rol nuevo solo entra en el JWT tras un refresh de token.
  await supabase.auth.refreshSession()
}

/**
 * `supabase.functions.invoke` devuelve un `FunctionsHttpError` con
 * `error.message` genérico ("Edge Function returned a non-2xx status code")
 * y el cuerpo real en `error.context` (un `Response`). Esto saca el mensaje
 * útil, y distingue el caso "la función no está desplegada" (404).
 */
export async function edgeErrorMessage(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.status === 'number') {
    if (ctx.status === 404) {
      return 'La función del servidor no está desplegada todavía (become-coach / admin-users).'
    }
    try {
      const body = await ctx.clone().json()
      if (body?.error) return String(body.error)
    } catch {
      try {
        const text = await ctx.clone().text()
        if (text) return text
      } catch {
        /* nada */
      }
    }
  }
  return error instanceof Error ? error.message : 'Error del servidor.'
}
