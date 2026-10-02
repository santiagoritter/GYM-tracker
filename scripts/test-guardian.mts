/** Consentimiento del tutor: clasificación de errores del servidor y enlace de WhatsApp. */
import { classifyAcceptError, COACH_NOT_VERIFIED, GUARDIAN_REQUIRED, guardianWhatsappUrl } from '@/lib/guardianCore'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

check(classifyAcceptError(GUARDIAN_REQUIRED) === 'consent', 'consentimiento requerido')
check(classifyAcceptError(`Error: ${COACH_NOT_VERIFIED}`) === 'unverified', 'coach sin verificar')
check(classifyAcceptError('Código inválido o vencido.') === null, 'otros errores no son reglas de menores')
check(classifyAcceptError('') === null, 'vacío')

const url = guardianWhatsappUrl('https://x.test/tutor/abc?d=1&e=2', 'Coach Ñ')
check(url.startsWith('https://wa.me/?text='), 'prefijo de WhatsApp')
const text = decodeURIComponent(url.split('text=')[1] ?? '')
check(text.includes('https://x.test/tutor/abc?d=1&e=2'), 'el enlace viaja entero, con sus & y ?')
check(text.includes('Coach Ñ'), 'nombre del coach')
check(guardianWhatsappUrl('l', '').includes(encodeURIComponent('un entrenador')), 'sin nombre usa uno genérico')

if (fail.length) {
  console.error('❌ Tutor:\n  ' + fail.join('\n  '))
  process.exit(1)
}
console.log('✅ Tutor: errores de menores bien clasificados y enlace de WhatsApp íntegro.')
