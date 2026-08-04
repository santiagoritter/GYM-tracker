import type { ExerciseInfo } from './index'

export const SHOULDERS_INFO: Record<string, ExerciseInfo> = {
  'overhead-press': {
    description:
      'Press militar de pie. El mejor constructor de fuerza y masa en los hombros, y una prueba real de estabilidad de core: todo el cuerpo tiene que sostener el peso por encima de la cabeza.',
    tips: [
      'Agarre apenas más ancho que los hombros',
      'Glúteos y abdomen apretados: el cuerpo es la base',
      'Sacá la cabeza levemente hacia atrás para que la barra suba recto',
      'Al pasar la frente, mové la cabeza hacia adelante y terminá con la barra sobre el mediopié',
    ],
    commonMistakes: [
      'Arquear la lumbar y convertirlo en un press inclinado de pie',
      'Empujar la barra hacia adelante en vez de recto',
      'Usar impulso de piernas (eso ya es push press)',
    ],
    videoQuery: 'press militar de pie técnica correcta',
  },
  'push-press': {
    description:
      'Press por encima de la cabeza con un impulso inicial de piernas. La ayuda de la cadera permite mover más peso que en el press estricto, así que sirve para sobrecargar hombros y tríceps.',
    tips: [
      'Flexión corta y explosiva de rodillas: 10–15 cm, no una sentadilla',
      'La transición de piernas a brazos tiene que ser continua',
      'Bajá controlado al pecho, no dejes caer la barra',
    ],
    commonMistakes: ['Flexionar demasiado las rodillas', 'Desconectar el impulso del empuje de brazos'],
  },
  'db-shoulder-press': {
    description:
      'Press de hombros con mancuernas. Cada brazo trabaja independiente, lo que corrige asimetrías, y la trayectoria libre suele ser más cómoda para el hombro que la barra.',
    tips: [
      'Sentado con respaldo si buscás aislar; de pie si querés core',
      'Codos levemente adelante del plano del torso, no abiertos del todo',
      'Bajá hasta que el codo quede a la altura del hombro',
    ],
    commonMistakes: ['Bajar demasiado buscando rango extra', 'Chocar las mancuernas arriba'],
  },
  'arnold-press': {
    description:
      'Press con rotación: se arranca con las palmas hacia el cuerpo y se rota mientras se empuja. Suma la porción anterior del deltoides a un press que ya trabaja la media.',
    tips: [
      'Empezá con las mancuernas a la altura del mentón, palmas hacia vos',
      'La rotación es progresiva durante toda la subida',
      'Peso claramente menor que en un press normal',
    ],
    commonMistakes: ['Rotar de golpe al final en vez de progresivamente'],
  },
  'machine-shoulder-press': {
    description:
      'Press de hombros guiado. La trayectoria fija permite entrenar cerca del fallo sin riesgo y es una buena opción para cerrar el trabajo de hombro.',
    tips: [
      'Ajustá el asiento para que las manijas queden a la altura de los hombros',
      'Espalda apoyada en el respaldo',
      'No bloquees los codos arriba',
    ],
  },
  'lateral-raise': {
    description:
      'Aislamiento del deltoides medio (cabeza lateral). Clave para construir hombros anchos y la forma de "V" del torso.',
    tips: [
      'Ligera flexión del codo (15–20°) para proteger la articulación',
      'Subir hasta paralelo al suelo, no más',
      'El meñique ligeramente más alto que el pulgar en el punto alto',
      'Control total, sin balanceo',
    ],
    commonMistakes: [
      'Subir los hombros al elevar (encogimiento de trapecios)',
      'Usar demasiado peso con mala técnica',
      'No controlar la bajada',
    ],
  },
  'cable-lateral-raise': {
    description:
      'Elevación lateral en polea baja. A diferencia de la mancuerna, el cable mantiene tensión también en la parte baja del recorrido, que es justo donde el deltoides medio más trabaja.',
    tips: [
      'Polea en el punto más bajo, cruzada por detrás del cuerpo',
      'Un solo brazo por vez, agarrando algo firme con el otro',
      'Rango algo mayor: podés cruzar la mano frente al cuerpo al bajar',
    ],
  },
  'front-raise': {
    description:
      'Elevación frontal. Aísla el deltoides anterior, aunque conviene tenerlo en cuenta: esa porción ya recibe mucho trabajo en cualquier press de pecho u hombro.',
    tips: [
      'Subí hasta la altura de los ojos, no más',
      'Alterná brazos para controlar mejor el balanceo',
      'Es un ejercicio de poco volumen: no necesita mucho',
    ],
    commonMistakes: ['Balancear el torso', 'Programarlo con el mismo volumen que las laterales'],
  },
  'rear-delt-fly': {
    description:
      'Pájaros. Trabajan el deltoides posterior, la porción que casi todo el mundo tiene subdesarrollada, y ayudan a equilibrar hombros redondeados por exceso de pecho.',
    tips: [
      'Torso paralelo al suelo (de pie inclinado o sentado en el borde del banco)',
      'Codos casi fijos, abrí desde el hombro',
      'Pensá en separar los codos, no en levantar las manos',
      'Peso bajo: es un músculo chico',
    ],
    commonMistakes: ['Usar la espalda alta para tirar (se convierte en remo)', 'Demasiado peso'],
  },
  'reverse-pec-deck': {
    description:
      'Pájaros en máquina (peck deck invertido). La versión guiada del trabajo de deltoides posterior, más fácil de ejecutar bien porque no hay que sostener la posición inclinada.',
    tips: [
      'Pecho apoyado contra el respaldo',
      'Manijas a la altura de los hombros',
      'Apretá al final sin arquear la espalda',
    ],
  },
  'face-pull': {
    description:
      'Tirón a la cara con soga en polea alta. Trabaja deltoides posterior y rotadores externos: es el mejor ejercicio preventivo para la salud del hombro, sobre todo si hacés mucho press.',
    tips: [
      'Polea a la altura de la cara o algo más arriba',
      'Tirar la soga hacia la frente separando las manos',
      'Rotación externa al final (como haciendo un doble bíceps)',
      'Peso liviano, alto volumen: es un ejercicio correctivo',
    ],
    commonMistakes: ['Demasiado peso, que lo convierte en un remo alto', 'No rotar externamente al final'],
  },
  'upright-row': {
    description:
      'Remo al mentón. Trabaja deltoides medio y trapecio. Conviene hacerlo con agarre ancho y sin subir demasiado: el agarre cerrado con codo muy alto es una posición de pinzamiento clásica.',
    tips: [
      'Agarre a lo ancho de los hombros o más, nunca cerrado',
      'No subas los codos por encima de la altura del hombro',
      'Si te molesta el hombro, reemplazalo por elevaciones laterales',
    ],
    commonMistakes: ['Agarre cerrado + codo alto (pinzamiento subacromial)', 'Usar impulso de cadera'],
  },
}
