import { useAppConfigStore } from '@/stores/appConfigStore'

/**
 * Plan del modo coach. Precio y beneficios en un solo lugar (los usan el alta
 * de coach, la pantalla de plan y el paywall). El cobro real es una compra
 * dentro de la app vía StoreKit (Guideline 3.1.1: las funciones digitales no
 * pueden cobrarse por fuera).
 */

export const COACH_PRICE_USD = 5

/** Versión de los términos específicos de coach que se aceptan en el alta. Si
 * cambian de fondo, subirla. Se guarda en `coaches.terms_version`. */
export const COACH_TERMS_VERSION = 1

export const COACH_PERKS = [
  'Alumnos ilimitados vinculados por link o QR',
  'Ver el progreso completo de cada alumno: entrenos, PRs, medidas y niveles',
  'Armar y asignar rutinas y metas a cada alumno',
  'Chat con adjuntos de ejercicios y rutinas',
  'Perfil público con reseñas y sello de verificado',
] as const

/** ¿Se cobra el modo coach? Lo decide el SERVIDOR (`app_config`, migración
 * 0024), no la plataforma — antes esto miraba `purchasesAvailable()`
 * (true solo en iOS con RevenueCat configurado), así que un coach podía
 * darse de alta gratis desde la web o Android con el mismo resultado
 * final que pagando en iOS. Ver `become-coach`, que exige la misma
 * suscripción del lado del servidor, y `appConfigStore.ts`. En una
 * plataforma sin compras disponibles, la UI (`CoachSubscribeBlock`) igual
 * respeta esto — solo cambia si puede mostrar el botón de comprar o un
 * aviso de "suscribite desde la app de iOS".
 *
 * Hook, no función plana: `loadAppConfig()` resuelve asíncrono al
 * arrancar, así que un componente montado antes de esa respuesta
 * necesita re-renderizar cuando el valor cambia — una lectura suelta con
 * `.getState()` se hubiera quedado pegada al primer valor. */
export function useCoachBillingEnabled(): boolean {
  return useAppConfigStore((s) => s.coachBillingRequired)
}
