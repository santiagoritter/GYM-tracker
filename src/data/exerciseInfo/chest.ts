import type { ExerciseInfo } from './index'

export const CHEST_INFO: Record<string, ExerciseInfo> = {
  'bench-press': {
    description:
      'El ejercicio rey del pecho. Desarrolla fuerza y masa en el pectoral mayor, con participación secundaria de tríceps y deltoides anterior. Es el movimiento de empuje horizontal por excelencia.',
    tips: [
      'Arco natural en la espalda baja, no exagerado',
      'Escápulas retraídas y deprimidas durante todo el movimiento',
      'Agarre ligeramente más ancho que los hombros',
      'Bajar la barra al pecho bajo, cerca del esternón',
      'Pies planos en el suelo o en la plataforma',
    ],
    commonMistakes: [
      'Rebotar la barra contra el pecho',
      'Levantar las caderas del banco',
      'Bloquear los codos al subir (mantené un leve ángulo)',
    ],
    videoQuery: 'press de banca técnica correcta barra',
  },
  'incline-bench-press': {
    description:
      'Variante inclinada que enfatiza la porción clavicular (superior) del pectoral. Ángulo óptimo: 30–45°. Más demandante para el hombro que el press plano.',
    tips: [
      'Ángulo de 30–45°, no más para no convertirlo en press de hombros',
      'Misma técnica de escápulas que el press plano',
      'La barra baja hacia la parte superior del pecho',
    ],
    commonMistakes: ['Inclinar el banco por encima de 45°', 'Bajar la barra al esternón como en plano'],
  },
  'decline-bench-press': {
    description:
      'Press con banco declinado (15–30° hacia abajo). Enfatiza la porción esternal baja del pectoral y suele permitir más carga que el plano, con menos estrés en el hombro.',
    tips: [
      'Trabá bien las piernas antes de descargar la barra',
      'La barra baja a la parte baja del pecho',
      'Pedí ayuda para entregar y guardar la barra: la posición es incómoda',
    ],
    commonMistakes: ['Declinación excesiva (marea y sube la presión en la cabeza)'],
  },
  'db-bench-press': {
    description:
      'La versión con mancuernas permite mayor rango de movimiento y trabaja mejor la simetría entre ambos lados. Requiere más estabilización.',
    tips: [
      'Las mancuernas se tocan levemente al tope del movimiento',
      'Rotación natural de muñecas permitida',
      'Mayor profundidad de bajada que con barra',
      'Para arrancar, apoyá las mancuernas en los muslos y empujá con las piernas al acostarte',
    ],
    commonMistakes: ['Bajar demasiado y forzar la cápsula del hombro', 'Chocar las mancuernas arriba'],
  },
  'db-incline-press': {
    description:
      'Combina el énfasis en pectoral superior del banco inclinado con el rango extra de las mancuernas. Una de las mejores opciones para desarrollar la parte alta del pecho.',
    tips: [
      'Banco a 30°: más grados desplazan el trabajo al deltoides',
      'Codos a unos 45° del torso, no abiertos a 90°',
      'Controlá la bajada, es donde está el estímulo',
    ],
  },
  'chest-fly-machine': {
    description:
      'Aislamiento del pectoral en máquina (peck deck). Al eliminar la estabilización, permite concentrarse en la aducción del brazo, que es la función principal del pectoral.',
    tips: [
      'Ajustá el asiento para que las manijas queden a la altura del pecho',
      'Codos levemente flexionados y fijos durante todo el recorrido',
      'Apretá un segundo en la posición cerrada',
    ],
    commonMistakes: ['Usar demasiado peso y convertirlo en un press', 'Despegar la espalda del respaldo'],
  },
  'cable-fly': {
    description:
      'Aperturas en polea. A diferencia de las mancuernas, el cable mantiene tensión constante en todo el rango, incluida la posición cerrada donde el pectoral está más contraído.',
    tips: [
      'Un paso adelante para tensar los cables desde el inicio',
      'Torso levemente inclinado hacia adelante',
      'Cruzá levemente las manos al final para máxima aducción',
      'Poleas altas apuntan al pecho bajo; poleas bajas, al pecho alto',
    ],
    commonMistakes: ['Flexionar y extender los codos (se convierte en extensión de tríceps)'],
  },
  'db-fly': {
    description:
      'Aperturas con mancuernas acostado. Aislamiento clásico del pectoral con gran estiramiento en la posición baja, que es donde más tensión recibe la fibra.',
    tips: [
      'Codos con flexión fija de 15–20°, como si abrazaras un barril',
      'Bajá hasta sentir estiramiento, sin forzar',
      'Mucho menos peso del que usarías en press: el brazo de palanca es enorme',
    ],
    commonMistakes: ['Bajar demasiado y comprometer el hombro', 'Usar peso de press'],
  },
  'push-up': {
    description:
      'El empuje horizontal con peso corporal. Trabaja pecho, tríceps y deltoides anterior, y exige core para mantener el cuerpo rígido. Escalable en dificultad sin equipamiento.',
    tips: [
      'Cuerpo en línea recta de la cabeza a los talones',
      'Manos a la altura del pecho, no de los hombros',
      'Codos a 45° del torso',
      'Glúteos y abdomen apretados durante todo el movimiento',
    ],
    commonMistakes: ['Cadera caída o levantada', 'Rango parcial (no bajar el pecho)', 'Codos abiertos a 90°'],
  },
  'incline-push-up': {
    description:
      'Flexiones con las manos elevadas en un banco o barra. Reducen el porcentaje de peso corporal levantado, así que son la progresión ideal si todavía no salen las flexiones completas.',
    tips: [
      'Cuanto más alta la superficie, más fácil',
      'Misma alineación de cuerpo que en flexiones normales',
      'Bajá la altura progresivamente hasta llegar al suelo',
    ],
  },
  'diamond-push-up': {
    description:
      'Flexiones con las manos juntas formando un diamante. Desplazan buena parte del trabajo del pectoral al tríceps, que pasa a ser el motor principal.',
    tips: [
      'Índices y pulgares se tocan bajo el esternón',
      'Codos pegados al cuerpo, no abiertos',
      'Si molesta la muñeca, separá un poco las manos',
    ],
    commonMistakes: ['Abrir los codos y perder el énfasis en tríceps'],
  },
  'dips-chest': {
    description:
      'Fondos en paralelas con el torso inclinado hacia adelante, lo que traslada el énfasis del tríceps al pectoral inferior. Muy efectivo y muy exigente para el hombro.',
    tips: [
      'Inclinar el torso ~30° hacia adelante',
      'Codos algo abiertos (a diferencia de la versión de tríceps)',
      'Bajar hasta que el brazo quede paralelo al suelo, no más',
    ],
    commonMistakes: ['Bajar demasiado y estresar la cápsula del hombro', 'Hacer rebote en la posición baja'],
  },
  'chest-press-machine': {
    description:
      'Press de pecho guiado. Al no requerir estabilización es la opción más segura para entrenar al fallo o cuando entrenás sin ayudante.',
    tips: [
      'Asiento a una altura que deje las manijas a la altura del pecho medio',
      'Espalda apoyada y escápulas retraídas',
      'No bloquees los codos al final',
    ],
  },
  'smith-bench-press': {
    description:
      'Press de banca en multipower. El recorrido guiado permite forzar más cerca del fallo con seguridad, a costa de eliminar el trabajo de estabilización.',
    tips: [
      'Posicioná el banco para que la barra baje al pecho bajo',
      'Aprendé bien el mecanismo de trabado antes de cargar pesado',
      'Sirve para series de alta intensidad al final del entreno',
    ],
    commonMistakes: ['Asumir que el peso es equivalente al de barra libre: no lo es'],
  },
  'db-pullover': {
    description:
      'Pullover con una mancuerna. Movimiento en el plano sagital que trabaja pectoral y dorsal ancho a la vez, con un gran estiramiento de la caja torácica.',
    tips: [
      'Apoyá solo la parte alta de la espalda en el banco, o acostate a lo largo',
      'Codos semiflexionados y fijos',
      'Bajá hasta sentir estiramiento en pecho y axila, sin dolor',
    ],
    commonMistakes: ['Arquear en exceso la lumbar al bajar', 'Empezar con demasiado peso'],
  },
}
