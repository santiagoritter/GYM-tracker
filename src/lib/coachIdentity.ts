import { supabase } from '@/lib/supabaseClient'

/**
 * DNI del coach — vive en `coach_identity` (tabla aparte, RLS
 * propietario/admin) y NO en `coaches` (que es de lectura pública). Único
 * por cuenta: es lo que impide que una misma persona abra varias cuentas de
 * coach. Habilita el cotejo de verificación, que sigue haciéndolo el admin.
 */

export async function fetchMyDni(): Promise<string | null> {
  if (!supabase) return null
  const { data: session } = await supabase.auth.getUser()
  const id = session.user?.id
  if (!id) return null
  const { data } = await supabase
    .from('coach_identity')
    .select('dni')
    .eq('coach_id', id)
    .maybeSingle()
  return data?.dni ?? null
}

export async function saveDni(dni: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const id = session.user?.id
  if (!id) throw new Error('Sin sesión.')
  const clean = dni.replace(/\D/g, '')
  if (clean.length < 7) throw new Error('DNI inválido.')
  const { error } = await supabase
    .from('coach_identity')
    .upsert({ coach_id: id, dni: clean }, { onConflict: 'coach_id' })
  if (error) {
    if (error.code === '23505') throw new Error('Ese DNI ya está registrado en otra cuenta de coach.')
    throw error
  }
}
