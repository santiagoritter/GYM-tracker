/**
 * Suscripción al modo coach — MAQUETA. Hoy el modo coach es gratis; el
 * cobro (1 USD/mes) queda para más adelante y se prende con el feature flag
 * `VITE_COACH_BILLING=on`. Sin tabla, sin procesador, sin edge function:
 * cuando se integre Mercado Pago, este módulo es el único punto a tocar.
 */

export const COACH_PRICE_USD = 1

export function isCoachBillingEnabled(): boolean {
  return import.meta.env.VITE_COACH_BILLING === 'on'
}
