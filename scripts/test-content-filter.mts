import { maskProfanity, hasProfanity } from '@/lib/contentFilter'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

check(maskProfanity('Buen entrenamiento hoy') === 'Buen entrenamiento hoy', 'texto limpio no debe cambiar')
check(maskProfanity('sos un retrasado') === 'sos un *********', `enmascara término: ${maskProfanity('sos un retrasado')}`)
check(maskProfanity('SOS UN RETRASADO') === 'SOS UN *********', 'ignora mayúsculas')
check(maskProfanity('Te voy a matar') === '** *** * *****', `frase con espacios: ${maskProfanity('Te voy a matar')}`)
check(maskProfanity('mongólico') === '*********', `con tilde: ${maskProfanity('mongólico')}`)
check(hasProfanity('hdp') && !hasProfanity('press de banca'), 'hasProfanity')

if (fail.length) {
  console.error('❌ Filtro de contenido:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ Filtro de contenido: enmascara términos, ignora mayúsculas/tildes y no toca texto limpio.')
