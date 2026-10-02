/** Plan Premium: helpers de producto y la regla "Sin anuncios" dentro de Premium. */
import { annualSavingPct, periodLabel, productBase } from '@/lib/premium'
import { entitlementsFromEvent } from '../supabase/functions/_shared/entitlements.ts'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

check(productBase('gymtracker.premium.monthly:monthly-base') === 'gymtracker.premium.monthly', 'Android compuesto')
check(productBase('gymtracker.premium.annual') === 'gymtracker.premium.annual', 'iOS pelado')
check(periodLabel('P1M') === 'mes' && periodLabel('P1Y') === 'año', 'períodos')
check(periodLabel('P1W') === '' && periodLabel(null) === '' && periodLabel(undefined) === '', 'período desconocido')

// Los precios de la presentación: $1.990 por mes y $17.990 por año ≈ 25 % menos.
check(annualSavingPct(1990, 17990) === 25, `ahorro anual ${annualSavingPct(1990, 17990)}`)
check(annualSavingPct(1990, 23880) === null, 'anual sin descuento no muestra ahorro')
check(annualSavingPct(1990, 30000) === null, 'anual más caro no muestra ahorro')
check(annualSavingPct(0, 100) === null && annualSavingPct(100, 0) === null, 'precios inválidos')

// El servidor reconoce `premium` (webhook) además de los anteriores.
check(JSON.stringify(entitlementsFromEvent({ entitlement_ids: ['premium'] })) === '["premium"]', 'el webhook acepta premium')

if (fail.length) {
  console.error('❌ Premium:\n  ' + fail.join('\n  '))
  process.exit(1)
}
console.log('✅ Premium: ids, períodos, ahorro anual y entitlement reconocido por el webhook.')
