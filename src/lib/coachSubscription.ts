import { purchasesAvailable } from '@/lib/purchases'

/**
 * Plan del modo coach. Precio y beneficios en un solo lugar (los usan el alta
 * de coach, la pantalla de plan y el paywall). El cobro real es una compra
 * dentro de la app vía StoreKit (Guideline 3.1.1: las funciones digitales no
 * pueden cobrarse por fuera) y se activa con `VITE_PURCHASES_ENABLED=on`; con
 * el flag apagado el modo coach es gratis y las pantallas lo dicen.
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

/** ¿Se cobra el modo coach en este build? Solo si las compras están activas y
 * disponibles (iOS con RevenueCat configurado). En web/Android o sin las keys el
 * modo coach queda gratis: no se muestra un paywall que no se puede pagar. */
export function isCoachBillingEnabled(): boolean {
  return purchasesAvailable()
}
