/** Edad y menores: sin edad confiable = menor; piso de 13; copy sin peso ni cuerpo. */
import { ageOn, dobBounds, dobError, isMinor, parseDob } from '@/lib/age'
import { HOME_MESSAGES, ONBOARDING_MESSAGES, PR_MESSAGES, REST_END_MESSAGES, WORKOUT_COMPLETE_MESSAGES } from '@/lib/motivational'
import { PHILOSOPHICAL_QUOTES } from '@/lib/quotes'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}
const now = new Date(2026, 9, 2) // 2 oct 2026

check(parseDob('2010-02-30') === null, 'una fecha inexistente no es válida')
check(parseDob('2010/05/05') === null && parseDob('') === null && parseDob(undefined) === null, 'formato inválido')
check(ageOn('2013-10-02', now) === 13, 'cumple 13 hoy')
check(ageOn('2013-10-03', now) === 12, 'cumple 13 mañana')
check(ageOn('2027-01-01', now) === null, 'fecha futura sin edad')

// Piso de 13 años.
check(dobError('2013-10-03', now) !== null, '12 años no puede usar la app')
check(dobError('2013-10-02', now) === null, '13 recién cumplidos sí')
check(dobError('2026-10-02', now) !== null, 'nacido hoy no')
check(dobError('1900-01-01', now) !== null, '126 años no')
check(dobError('', now) !== null, 'vacía no')
check(dobError('1990-05-05', now) === null, 'adulto sí')

// Menor: 13–17 y también sin edad confiable (el fallo seguro).
check(isMinor('2010-01-01', now), '16 años es menor')
check(!isMinor('2008-10-02', now), '18 hoy ya es adulto')
check(isMinor('2008-10-03', now), '17 es menor')
check(isMinor(undefined, now) && isMinor('', now) && isMinor('basura', now), 'sin dob válida cuenta como menor')

const b = dobBounds(now)
check(b.max === '2013-10-02' && b.min === '1926-10-02', `límites del input: ${b.min} ${b.max}`)

// Copy: hábito y constancia, nunca peso o cuerpo.
// "peso" solo cuenta cuando habla del cuerpo: "agarrá el peso" es la barra.
const BODY = /cuerpo|físic|peso corporal|bajar de peso|perder peso|tu peso\b|adelgaz|gord|grasa|dieta|abdom|verte|estética/i
const pools = [HOME_MESSAGES, ONBOARDING_MESSAGES, PR_MESSAGES, REST_END_MESSAGES, WORKOUT_COMPLETE_MESSAGES, PHILOSOPHICAL_QUOTES]
for (const m of pools.flat()) check(!BODY.test(m.text), `frase sobre cuerpo o peso: "${m.text}"`)

if (fail.length) {
  console.error('❌ Edad:\n  ' + fail.join('\n  '))
  process.exit(1)
}
console.log('✅ Edad: piso de 13, sin edad = menor, y las frases no hablan de cuerpo ni peso.')
