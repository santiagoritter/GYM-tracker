import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Primer uso real de Supabase en el código — todo lo demás sigue siendo
 * 100% local vía Dexie. Esto solo existe para guardar/borrar suscripciones
 * de Web Push (Fase 26). Si el proyecto no está desplegado (las env vars
 * no están seteadas, el caso real hoy), exporta `null` en vez de tirar: el
 * resto de la app no debe romperse por una feature que depende de un
 * backend que todavía no existe — mismo criterio que `EMAIL_ENABLED` en
 * `src/lib/auth.ts` para EmailJS.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null
