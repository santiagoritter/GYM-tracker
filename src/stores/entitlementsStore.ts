import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Qué compró el usuario (RevenueCat es la fuente de verdad; esto es su último
 * estado conocido, persistido para que sin conexión no se "pierda" un
 * beneficio hasta que RevenueCat vuelva a confirmar).
 *  - `adFree`: suscripción suelta "Sin anuncios" (anterior a Premium).
 *  - `premium`: plan Premium (incluye sin anuncios). Para saber si hay anuncios
 *    usar `hasNoAds`, no `adFree` a secas.
 *  - `coach`: suscripción de coach activa (solo relevante con el cobro prendido).
 */
interface EntitlementsState {
  adFree: boolean
  coach: boolean
  premium: boolean
  /** Ya se consultó a RevenueCat al menos una vez en esta sesión. */
  loaded: boolean
  setEntitlements: (next: { adFree: boolean; coach: boolean; premium: boolean }) => void
  reset: () => void
}

export const useEntitlementsStore = create<EntitlementsState>()(
  persist(
    (set) => ({
      adFree: false,
      coach: false,
      premium: false,
      loaded: false,
      setEntitlements: ({ adFree, coach, premium }) => set({ adFree, coach, premium, loaded: true }),
      reset: () => set({ adFree: false, coach: false, premium: false, loaded: false }),
    }),
    {
      name: 'gymtracker-entitlements',
      partialize: (s) => ({ adFree: s.adFree, coach: s.coach, premium: s.premium }),
    }
  )
)

/** Sin banners: Premium o el producto suelto anterior. */
export const selectHasNoAds = (s: EntitlementsState): boolean => s.adFree || s.premium
