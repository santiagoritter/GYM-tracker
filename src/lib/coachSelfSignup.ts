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
  if (error) {
    const msg = (data as { error?: string } | null)?.error ?? error.message
    throw new Error(msg)
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)

  // El rol nuevo solo entra en el JWT tras un refresh de token.
  await supabase.auth.refreshSession()
}
