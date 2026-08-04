import type { ExerciseInfo } from './index'

export const BACK_INFO: Record<string, ExerciseInfo> = {
  deadlift: {
    description:
      'El levantamiento más completo: involucra casi todos los músculos del cuerpo. Desarrolla fuerza real de la cadena posterior (espalda baja, glúteos, isquiotibiales) y es fundamental para cualquier programa de fuerza.',
    tips: [
      'Barra sobre el mediopié (a ~2 cm de las espinillas)',
      'Agarre a lo ancho de los hombros o ligeramente más',
      'Cadera más baja que los hombros al inicio, no es una sentadilla',
      'Mantener la espalda neutra (no redondear la lumbar)',
      'Empujar el suelo, no tirar la barra hacia arriba',
      'La barra pegada al cuerpo en todo el recorrido',
    ],
    commonMistakes: [
      'Redondear la zona lumbar',
      'Hiperextender la espalda al tope',
      'Barra alejada del cuerpo',
      'Arrancar con la cadera demasiado baja (squat-deadlift)',
    ],
    videoQuery: 'peso muerto convencional técnica correcta',
  },
  'sumo-deadlift': {
    description:
      'Peso muerto con postura ancha y manos por dentro de las piernas. Acorta el recorrido y reparte más carga a cuádriceps y glúteos, con menos exigencia sobre la espalda baja.',
    tips: [
      'Pies muy abiertos, puntas hacia afuera 30–45°',
      'Rodillas apuntando en la misma dirección que los pies',
      'Torso mucho más vertical que en convencional',
      'Abrí el suelo con los pies para activar los glúteos antes de tirar',
    ],
    commonMistakes: ['Que la cadera suba antes que la barra', 'Rodillas colapsando hacia adentro'],
  },
  'rack-pull': {
    description:
      'Peso muerto parcial desde pines a la altura de la rodilla. Permite cargar más que en el peso muerto completo y refuerza específicamente el bloqueo final y el agarre.',
    tips: [
      'Pines justo por debajo o a la altura de la rótula',
      'Misma posición de espalda que en el peso muerto completo',
      'Ideal para trabajar trapecios y la fase de bloqueo',
    ],
    commonMistakes: ['Hiperextender al final', 'Dejar caer la barra sin control sobre los pines'],
  },
  'barbell-row': {
    description:
      'Remo con barra: el mejor constructor de espesor de espalda. Trabaja dorsal, romboides, trapecio medio y deltoides posterior, y exige mucho a la lumbar como estabilizadora.',
    tips: [
      'Torso a 45° o menos respecto al suelo',
      'Tirar hacia el ombligo/abdomen bajo, no al pecho',
      'Codos cerca del cuerpo',
      'Espalda neutra: si no la podés mantener, bajá el peso',
    ],
    commonMistakes: ['Incorporarse con el envión de la cadera', 'Redondear la lumbar', 'Rango parcial'],
  },
  'pendlay-row': {
    description:
      'Remo con torso paralelo al suelo donde la barra vuelve a apoyarse en el piso en cada repetición. Al eliminar el ciclo de estiramiento, cada rep arranca de cero y desarrolla potencia de tirón.',
    tips: [
      'Torso paralelo al suelo durante toda la serie',
      'La barra toca el suelo y se detiene entre repeticiones',
      'Tirón explosivo, bajada controlada',
    ],
    commonMistakes: ['Levantar el torso para ayudarse', 'Rebotar la barra en el piso'],
  },
  'chest-supported-row': {
    description:
      'Remo con el pecho apoyado en un banco inclinado. Al sacar la lumbar de la ecuación, aísla mucho mejor la espalda alta y permite entrenar más cerca del fallo con seguridad.',
    tips: [
      'Pecho firme contra el banco, sin despegarlo para ayudarse',
      'Bajá el peso: sin envión posible, el número real es menor',
      'Apretá las escápulas al final del tirón',
    ],
  },
  'machine-row': {
    description:
      'Remo en máquina. Recorrido guiado y estable, ideal para acumular volumen de espalda al final del entreno o para aprender el patrón de tirón horizontal.',
    tips: [
      'Pecho apoyado y escápulas retraídas al tirar',
      'Agarre neutro para más dorsal, pronado para más espalda alta',
      'Controlá la vuelta: es medio movimiento y suele desperdiciarse',
    ],
  },
  'pull-up': {
    description:
      'Dominadas con agarre prono. El mejor ejercicio de tirón vertical: desarrolla el dorsal ancho y define la forma de "V" de la espalda. Referencia clásica de fuerza relativa.',
    tips: [
      'Agarre algo más ancho que los hombros',
      'Iniciar el movimiento bajando las escápulas, no tirando con los brazos',
      'Pecho hacia la barra, no mentón por encima nada más',
      'Bajada controlada hasta extensión casi completa',
    ],
    commonMistakes: ['Balanceo (kipping) sin control', 'Rango parcial', 'Encoger los hombros al subir'],
  },
  'chin-up': {
    description:
      'Dominada con agarre supino (palmas hacia vos). El bíceps participa mucho más que en la versión prona, lo que la hace más fácil y excelente para brazos y dorsal a la vez.',
    tips: [
      'Manos a la altura de los hombros',
      'Codos hacia adelante y abajo',
      'Suele salir antes que la dominada prona: buena progresión',
    ],
    commonMistakes: ['Muñecas dobladas hacia atrás', 'Balancearse para completar reps'],
  },
  'inverted-row': {
    description:
      'Remo invertido colgando de una barra baja con los pies en el suelo. Es la progresión horizontal del peso corporal y prepara la espalda para las dominadas.',
    tips: [
      'Cuerpo rígido en línea recta, como una plancha invertida',
      'Cuanto más horizontal el cuerpo, más difícil',
      'Tocá la barra con el esternón en cada repetición',
    ],
    commonMistakes: ['Cadera caída', 'Estirar el cuello hacia la barra en vez de subir el pecho'],
  },
  'lat-pulldown': {
    description:
      'Jalón al pecho en polea. La alternativa graduable a las dominadas: mismo patrón de tirón vertical, pero con carga ajustable, lo que permite trabajar el dorsal a cualquier nivel.',
    tips: [
      'Trabá bien los muslos bajo el rodillo',
      'Ligera inclinación del torso hacia atrás (unos 15°), sin balancearse',
      'Llevá la barra al pecho alto, nunca detrás de la nuca',
      'Pensá en llevar los codos al piso',
    ],
    commonMistakes: ['Jalón tras nuca (riesgo para el hombro)', 'Usar el peso del cuerpo para tirar'],
  },
  'neutral-grip-pulldown': {
    description:
      'Jalón con agarre neutro (palmas enfrentadas). La posición del hombro es más cómoda que en pronación y suele permitir sentir mejor el dorsal.',
    tips: [
      'Codos pegados al cuerpo durante el tirón',
      'Muy buena opción si el agarre prono te molesta el hombro',
      'Pausá un instante con el mango en el pecho',
    ],
  },
  'seated-cable-row': {
    description:
      'Remo sentado en polea. Tirón horizontal con tensión constante, ideal para trabajar espesor de espalda sin cargar la zona lumbar como en el remo con barra.',
    tips: [
      'Torso perpendicular al suelo, sin balanceo hacia atrás',
      'Tirar hacia el abdomen, escápulas juntas al final',
      'Permitir un estiramiento controlado al extender los brazos',
    ],
    commonMistakes: ['Usar el torso como palanca', 'Encoger los hombros al tirar'],
  },
  'db-row': {
    description:
      'Remo unilateral con mancuerna. Trabaja cada lado por separado, lo que corrige asimetrías, y permite un rango mayor que con barra.',
    tips: [
      'Apoyá rodilla y mano del mismo lado en el banco',
      'Espalda paralela al suelo y neutra',
      'Tirá la mancuerna hacia la cadera, no hacia el hombro',
      'Estirá abajo dejando que la escápula se separe',
    ],
    commonMistakes: ['Rotar el torso para levantar más peso', 'Tirón corto sin estiramiento'],
  },
  't-bar-row': {
    description:
      'Remo en T. Combina la carga alta del remo con barra con una posición de agarre más cómoda y un ángulo que castiga bien la espalda media.',
    tips: [
      'Pecho arriba, cadera atrás, rodillas semiflexionadas',
      'Agarre neutro cerrado para más dorsal',
      'No dejes que la barra toque el pecho con impulso',
    ],
    commonMistakes: ['Erguirse en cada repetición', 'Redondear la espalda con peso excesivo'],
  },
  'straight-arm-pulldown': {
    description:
      'Pullover en polea con brazos extendidos. Aísla el dorsal ancho sin que participen los bíceps, porque el codo no se flexiona.',
    tips: [
      'Codos con leve flexión fija durante todo el recorrido',
      'Torso inclinado hacia adelante y quieto',
      'Bajá la barra hasta los muslos apretando el dorsal',
    ],
    commonMistakes: ['Flexionar los codos y convertirlo en extensión de tríceps'],
  },
  hyperextension: {
    description:
      'Extensiones en banco romano. Fortalece los erectores espinales, glúteos e isquiotibiales, y es un accesorio clave para proteger la espalda baja en peso muerto y sentadilla.',
    tips: [
      'Almohadilla justo debajo de la cadera, no sobre el muslo',
      'Bajá con la espalda neutra y subí hasta la línea del cuerpo',
      'Para más glúteo, redondeá levemente la espalda alta y sacá las puntas de los pies hacia afuera',
    ],
    commonMistakes: ['Hiperextender arriba', 'Hacerlo con impulso y rebote'],
  },
  'barbell-shrug': {
    description:
      'Encogimientos con barra. Aislamiento directo del trapecio superior, que es el único músculo cuya función es elevar la escápula.',
    tips: [
      'Solo subir y bajar los hombros, sin rotarlos',
      'Pausá arriba un segundo: el rango es corto y se desperdicia con impulso',
      'Usá correas si el agarre falla antes que el trapecio',
    ],
    commonMistakes: ['Rotar los hombros en círculos', 'Flexionar los codos para ayudarse'],
  },
}
