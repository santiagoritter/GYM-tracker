// Sin dependencias de Deno — se puede testear con Node
// (scripts/test-revenuecat-entitlements.mts) y se importa desde
// revenuecat-webhook/index.ts.

export const KNOWN_ENTITLEMENTS = ['coach', 'ad_free'] as const
export type KnownEntitlement = (typeof KNOWN_ENTITLEMENTS)[number]

/**
 * RevenueCat manda `entitlement_ids` en cada evento del webhook — la forma
 * robusta de saber a qué entitlement corresponde, a diferencia de mapear
 * por `product_id` (lo que hacía antes): en Android (Play Billing 5+) el
 * product_id de una suscripción es compuesto (`producto:basePlanId`, ej.
 * `gymtracker.coach.monthly:monthly-base`), así que un mapeo exacto por
 * product_id que solo conoce el id "pelado" de iOS nunca matchea ahí — el
 * evento queda "ignored" para siempre y un coach que paga desde Android
 * nunca terminaría de quedar con el rol ni la suscripción registrada.
 *
 * Un evento puede traer más de un entitlement (bundles); se devuelven
 * todos los que reconocemos, filtrando el resto.
 */
export function entitlementsFromEvent(event: { entitlement_ids?: unknown }): KnownEntitlement[] {
  const ids = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : []
  return ids.filter((id): id is KnownEntitlement =>
    (KNOWN_ENTITLEMENTS as readonly string[]).includes(id as string)
  )
}
