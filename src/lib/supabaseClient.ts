import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase, usado por auth, sync, push subscriptions, rutinas
 * compartidas y las queries de admin (`adminQueries.ts`). Si las env vars
 * no están seteadas (proyecto no configurado en este build/entorno),
 * exporta `null` en vez de tirar: el resto de la app sigue siendo 100%
 * local vía Dexie y no debe romperse por una feature que depende de un
 * backend ausente — mismo criterio que `EMAIL_ENABLED` en `src/lib/auth.ts`
 * para EmailJS.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null
