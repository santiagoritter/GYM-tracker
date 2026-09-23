/**
 * `entitlementsFromEvent` (supabase/functions/_shared/entitlements.ts) es lo
 * que reemplaza el mapeo por `product_id` del webhook de RevenueCat — ese
 * mapeo nunca matcheaba en Android, donde el product_id es compuesto
 * (`producto:basePlanId`). Sin dependencias de Deno, se testea igual que
 * cualquier otro módulo puro del proyecto.
 */
import { entitlementsFromEvent } from '../supabase/functions/_shared/entitlements.ts'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

check(
  JSON.stringify(entitlementsFromEvent({ entitlement_ids: ['coach'] })) === JSON.stringify(['coach']),
  'un entitlement conocido debería pasar'
)
check(
  JSON.stringify(entitlementsFromEvent({ entitlement_ids: ['coach', 'ad_free'] })) ===
    JSON.stringify(['coach', 'ad_free']),
  'dos entitlements conocidos deberían pasar los dos'
)
check(
  entitlementsFromEvent({ entitlement_ids: ['algo_desconocido'] }).length === 0,
  'un entitlement desconocido no debería colarse'
)
check(
  entitlementsFromEvent({ entitlement_ids: [] }).length === 0,
  'sin entitlement_ids, lista vacía'
)
check(
  entitlementsFromEvent({}).length === 0,
  'sin el campo entitlement_ids, lista vacía (no debería tirar)'
)
check(
  entitlementsFromEvent({ entitlement_ids: 'coach' as unknown }).length === 0,
  'entitlement_ids que no es array se ignora, no tira'
)
// El caso real que motivó el fix: Android manda un product_id compuesto,
// pero entitlement_ids sigue siendo el id "limpio" de RevenueCat — no
// depende del formato del product_id de la tienda.
check(
  JSON.stringify(
    entitlementsFromEvent({
      entitlement_ids: ['coach'],
      product_id: 'gymtracker.coach.monthly:monthly-base',
    })
  ) === JSON.stringify(['coach']),
  'un product_id compuesto (Android) no debería impedir reconocer el entitlement'
)

if (fail.length) {
  console.error('❌ Entitlements de RevenueCat:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Entitlements de RevenueCat: mapea por entitlement_ids, ignora lo desconocido, no tira.')
