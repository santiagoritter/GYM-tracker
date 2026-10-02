/**
 * Plan Premium: ids de producto y helpers puros (sin Capacitor ni red, para
 * probarlos en node). Los productos y precios se crean en App Store Connect /
 * Play Console y se asocian al entitlement `premium` en RevenueCat; acá no se
 * escribe ningún precio (los muestra StoreKit, localizados).
 */
export const PRODUCT_PREMIUM_MONTHLY = 'gymtracker.premium.monthly'
export const PRODUCT_PREMIUM_ANNUAL = 'gymtracker.premium.annual'
export const ENTITLEMENT_PREMIUM = 'premium'

/** En Android (Play Billing 5+) el id viene compuesto: `producto:basePlanId`. */
export function productBase(productId: string): string {
  return productId.split(':')[0] ?? productId
}

/** Período ISO 8601 de StoreKit → palabra para "/ mes". */
export function periodLabel(period: string | null | undefined): string {
  if (period === 'P1M') return 'mes'
  if (period === 'P1Y') return 'año'
  return ''
}

/** Ahorro del plan anual frente a 12 meses sueltos, en % entero. `null` si no ahorra. */
export function annualSavingPct(monthlyPrice: number, annualPrice: number): number | null {
  if (!(monthlyPrice > 0) || !(annualPrice > 0)) return null
  const pct = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100)
  return pct > 0 ? pct : null
}
