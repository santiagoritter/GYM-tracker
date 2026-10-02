/** Formato de métricas: los bugs "Septiembre De" y "1.3 h" de la presentación. */
import { capitalizeFirst, formatTons, formatTotalDuration } from '@/lib/formatStats'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

check(capitalizeFirst('septiembre de 2026') === 'Septiembre de 2026', 'solo la primera letra')
check(capitalizeFirst('') === '', 'vacío')
check(capitalizeFirst('óctubre') === 'Óctubre', 'acentos')

// 81 entrenos sumaron "1.3 h" en la presentación: 4.700 s = 1 h 18 min.
check(formatTotalDuration(4700) === '1 h 18 min', `1 h 18: ${formatTotalDuration(4700)}`)
check(formatTotalDuration(3600) === '1 h', 'hora justa')
check(formatTotalDuration(2700) === '45 min', 'menos de una hora')
check(formatTotalDuration(0) === '0 min' && formatTotalDuration(-5) === '0 min', 'cero y negativo')
check(formatTotalDuration(3570) === '1 h', 'redondea 59,5 min a 1 h')

check(formatTons(12500) === '12,5 t', `coma decimal: ${formatTons(12500)}`)
check(formatTons(0) === '0 t', 'cero')
check(formatTons(1234567) === '1234,6 t' || formatTons(1234567) === '1.234,6 t', `miles: ${formatTons(1234567)}`)

if (fail.length) {
  console.error('❌ Formato:\n  ' + fail.join('\n  '))
  process.exit(1)
}
console.log('✅ Formato: mes con una sola mayúscula, duración en h y min, toneladas con coma.')
