import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Qué compró el usuario (RevenueCat es la fuente de verdad; esto es su último
 * estado conocido, persistido para que sin conexión no se "pierda" un
 * beneficio hasta que RevenueCat vuelva a confirmar).
 *  - `adFree`: suscripción "Sin anuncios" activa.
 *  - `coach`: suscripción de coach activa (solo relevante con el cobro prendido).
 */
interface EntitlementsState {
  adFree: boolean
  coach: boolean
  /** Ya se consultó a RevenueCat al menos una vez en esta sesión. */
  loaded: boolean
  setEntitlements: (next: { adFree: boolean; coach: boolean }) => void
  reset: () => void
}

export const useEntitlementsStore = create<EntitlementsState>()(
  persist(
    (set) => ({
      adFree: false,
      coach: false,
      loaded: false,
      setEntitlements: ({ adFree, coach }) => set({ adFree, coach, loaded: true }),
      reset: () => set({ adFree: false, coach: false, loaded: false }),
    }),
    {
      name: 'gymtracker-entitlements',
      partialize: (s) => ({ adFree: s.adFree, coach: s.coach }),
    }
  )
)
