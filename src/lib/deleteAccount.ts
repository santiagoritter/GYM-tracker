import { supabase } from '@/lib/supabaseClient'
import { db } from '@/db/schema'
import { edgeErrorMessage } from '@/lib/coachSelfSignup'

/**
 * Borra los datos de este dispositivo: base local (Dexie) y localStorage
 * (sesión de Supabase, stores persistidos, tema…). Se usa tras borrar la
 * cuenta en el servidor y también para el "borrar mis datos" del modo sin
 * cuenta. Después hay que recargar la app: `db` queda cerrada.
 */
export async function wipeLocalData(): Promise<void> {
  db.close()
  await db.delete()
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    // storage bloqueado: no hay nada más que limpiar
  }
}

/**
 * Baja de la cuenta (Guideline 5.1.1(v): borrado desde la app). Llama a la
 * Edge Function `delete-account` — que borra al usuario de Auth, cascadea sus
 * datos y limpia Storage con la service_role — y después borra lo local.
 * Nunca manda un userId: la identidad sale del JWT del lado del servidor.
 */
export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: true },
  })
  if (error) throw new Error(await edgeErrorMessage(error))
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)

  // El usuario ya no existe en el servidor: el signOut puede fallar, da igual.
  await supabase.auth.signOut().catch(() => undefined)
  await wipeLocalData()
}
