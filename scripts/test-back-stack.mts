import { consumeBack, hasOpenOverlay, pushBackHandler } from '@/lib/backStack'

const fail: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fail.push(msg)
}

// Vacío al principio.
check(!hasOpenOverlay(), 'sin nada abierto, hasOpenOverlay debería ser false')
check(!consumeBack(), 'sin nada abierto, consumeBack debería devolver false')

// Un sheet abierto.
let closedA = 0
const popA = pushBackHandler(() => {
  closedA++
})
check(hasOpenOverlay(), 'con un sheet abierto, hasOpenOverlay debería ser true')
check(consumeBack() === true, 'consumeBack debería devolver true con un sheet abierto')
check(closedA === 1, 'el handler del sheet debería haberse llamado una vez')
check(!hasOpenOverlay(), 'tras cerrarlo con back, no debería quedar nada abierto')
popA() // ya se cerró, pero simula el cleanup del useEffect igual

// Dos sheets anidados: el back cierra el de ARRIBA primero, no el de abajo.
let closedBottom = 0
let closedTop = 0
const popBottom = pushBackHandler(() => {
  closedBottom++
})
const popTop = pushBackHandler(() => {
  closedTop++
})
check(consumeBack() === true, 'con dos sheets, consumeBack debería devolver true')
check(closedTop === 1 && closedBottom === 0, 'el back tiene que cerrar el de arriba, no el de abajo')
popTop()
check(hasOpenOverlay(), 'después de cerrar el de arriba, el de abajo sigue abierto')
check(consumeBack() === true, 'el segundo back cierra el de abajo')
check(closedBottom === 1, 'el handler de abajo se llamó recién en el segundo back')
popBottom()
check(!hasOpenOverlay(), 'al final no debería quedar nada abierto')

if (fail.length) {
  console.error('❌ backStack:\n - ' + fail.join('\n - '))
  process.exit(1)
}
console.log('✅ backStack: cierra el overlay más reciente primero, limpio sin nada abierto.')
