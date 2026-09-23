import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabaseClient'

/**
 * Config pública del servidor (tabla `app_config`, migración
 * 0024_billing_config.sql) — hoy solo `coachBillingRequired`. Es la ÚNICA
 * fuente de verdad de "¿se cobra el modo coach?": antes el cliente lo
 * decidía mirando la plataforma (`purchasesAvailable()`, solo true en iOS
 * con RevenueCat configurado) y el servidor un secret aparte que nadie
 * sincronizaba con eso — con el secret apagado (su default), cualquiera se
 * daba de alta gratis desde la web. Ver `become-coach` y
 * `docs/21-COACH.md`.
 *
 * Persistido (offline-first): sin conexión se usa el último valor
 * conocido; antes de la primera lectura exitosa, `false` — el default
 * seguro es "no cobrar" (bloquear una alta gratis de más es mucho menos
 * grave que trabar a todo el mundo por un fetch que no llegó).
 */
interface AppConfigState {
  coachBillingRequired: boolean
  loaded: boolean
  setConfig: (next: { coachBillingRequired: boolean }) => void
}

export const useAppConfigStore = create<AppConfigState>()(
  persist(
    (set) => ({
      coachBillingRequired: false,
      loaded: false,
      setConfig: ({ coachBillingRequired }) => set({ coachBillingRequired, loaded: true }),
    }),
    {
      name: 'gymtracker-app-config',
      partialize: (s) => ({ coachBillingRequired: s.coachBillingRequired }),
    }
  )
)

/** Se llama una vez al arrancar (main.tsx). Silencioso ante cualquier
 * error (sin Supabase, sin red): el store se queda con el último valor
 * persistido, mismo criterio que el resto del arranque offline-first. */
export async function loadAppConfig(): Promise<void> {
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('coach_billing_required')
      .eq('id', true)
      .maybeSingle()
    if (error || !data) return
    useAppConfigStore.getState().setConfig({ coachBillingRequired: Boolean(data.coach_billing_required) })
  } catch {
    // Sin red o sin la tabla todavía: se queda con el último valor conocido.
  }
}
