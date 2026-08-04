import type { ExerciseInfo } from './index'

export const LEGS_INFO: Record<string, ExerciseInfo> = {
  // ── Cuádriceps ────────────────────────────────────────────────────────────
  squat: {
    description:
      'La reina de los ejercicios de pierna. Desarrolla cuádriceps, glúteos e isquiotibiales simultáneamente. Es el movimiento de sentadilla más funcional y transferible a la vida cotidiana.',
    tips: [
      'Pies a la altura de los hombros o ligeramente más abiertos',
      'Puntas levemente abiertas (15–30°)',
      'Rodillas siguiendo la línea de los pies',
      'Bajar hasta que la cadera pase por debajo de la rodilla, si la movilidad lo permite',
      'Pecho arriba y espalda neutra',
      'Empujar con todo el pie, no solo con las puntas',
    ],
    commonMistakes: [
      'Rodillas colapsando hacia adentro',
      'Levantar los talones',
      'Redondear la espalda baja al llegar abajo',
      'Rango parcial por exceso de peso',
    ],
    videoQuery: 'sentadilla con barra técnica correcta',
  },
  'front-squat': {
    description:
      'Sentadilla frontal, con la barra apoyada adelante. La posición obliga a un torso mucho más vertical, lo que carga más el cuádriceps y menos la espalda baja.',
    tips: [
      'La barra descansa en los deltoides anteriores, no en las manos',
      'Codos bien altos durante todo el movimiento',
      'Si no llegás al agarre limpio, usá agarre cruzado o correas',
      'Torso vertical: si se va adelante, la barra se cae',
    ],
    commonMistakes: ['Bajar los codos y perder la barra', 'Intentar la misma carga que en back squat'],
  },
  'smith-squat': {
    description:
      'Sentadilla en multipower. El recorrido guiado permite adelantar los pies y castigar más el cuádriceps, además de fallar sin riesgo entrenando solo.',
    tips: [
      'Pies algo adelantados respecto a la barra',
      'Aprendé el mecanismo de trabado antes de cargar',
      'Buena opción para series al fallo sin ayudante',
    ],
    commonMistakes: ['Comparar la carga con la sentadilla libre: no son equivalentes'],
  },
  'hack-squat': {
    description:
      'Sentadilla hack en máquina. Trayectoria fija con la espalda apoyada: aísla el cuádriceps casi por completo y saca la lumbar de la ecuación.',
    tips: [
      'Espalda y cadera pegadas al respaldo en todo momento',
      'Pies más bajos en la plataforma para más cuádriceps',
      'Bajá al menos hasta 90° de rodilla',
    ],
    commonMistakes: ['Despegar la cadera del respaldo abajo', 'Rango muy corto con mucho peso'],
  },
  'goblet-squat': {
    description:
      'Sentadilla sosteniendo una mancuerna o kettlebell contra el pecho. El contrapeso adelante ayuda a mantener el torso erguido, así que es la mejor forma de aprender a sentadillar.',
    tips: [
      'Sostené la pesa contra el esternón, codos hacia abajo',
      'Bajá entre las rodillas, usando los codos para abrirlas',
      'Excelente para movilidad de cadera y tobillo',
    ],
  },
  'leg-press': {
    description:
      'Prensa de piernas. Permite mover mucha carga con la espalda apoyada y sin riesgo de fallar bajo la barra. Ideal para hipertrofia de cuádriceps y glúteos.',
    tips: [
      'Espalda baja siempre apoyada en el respaldo',
      'Pies a la altura de los hombros, en el centro de la plataforma',
      'No bloquear las rodillas al extender',
      'Pies altos = más glúteo/isquios; pies bajos = más cuádriceps',
    ],
    commonMistakes: [
      'Despegar la cadera del asiento al bajar (la lumbar se redondea)',
      'Bloquear las rodillas con peso alto',
      'Bajar demasiado poco por exceso de carga',
    ],
  },
  'single-leg-press': {
    description:
      'Prensa a una pierna. Trabaja cada lado por separado, lo que corrige asimetrías y suma trabajo de estabilizadores de cadera sin cargar la columna.',
    tips: [
      'Pie en el centro de la plataforma',
      'Empezá por la pierna más débil y igualá reps con la otra',
      'La mitad del peso que usás a dos piernas es un buen punto de partida',
    ],
  },
  'leg-extension': {
    description:
      'Extensión de piernas en máquina. Aislamiento puro del cuádriceps, con la máxima tensión en la contracción final. Muy útil para pre-fatigar o cerrar el trabajo de pierna.',
    tips: [
      'Rodilla alineada con el eje de giro de la máquina',
      'Extendé por completo y pausá arriba',
      'Bajada controlada, sin dejar caer las placas',
    ],
    commonMistakes: ['Usar impulso levantando la cadera', 'Peso excesivo con rango corto'],
  },
  'sissy-squat': {
    description:
      'Sentadilla sissy. Movimiento avanzado que lleva la rodilla muy por delante del pie, estirando el recto femoral al máximo. Exige rodillas sanas y buen control.',
    tips: [
      'Sostenete de algo firme al principio',
      'Talones elevados y cadera extendida durante todo el recorrido',
      'Empezá con peso corporal y rango parcial',
    ],
    commonMistakes: ['Hacerlo pesado antes de dominar el patrón', 'Flexionar la cadera (se convierte en sentadilla)'],
  },
  lunge: {
    description:
      'Estocadas. Ejercicio unilateral que trabaja cuádriceps y glúteos exigiendo equilibrio y estabilidad de cadera. Corrige desbalances entre piernas.',
    tips: [
      'Paso largo para más glúteo, corto para más cuádriceps',
      'Rodilla de atrás baja hasta casi tocar el suelo',
      'Torso erguido, sin inclinarse hacia adelante',
      'La rodilla de adelante alineada con el pie',
    ],
    commonMistakes: ['Paso demasiado corto', 'Rodilla de adelante colapsando hacia adentro', 'Perder el equilibrio por mirar al piso'],
  },
  'walking-lunge': {
    description:
      'Estocadas caminando. Versión dinámica de la estocada: suma un componente de equilibrio y coordinación, y es muy demandante a nivel cardiovascular.',
    tips: [
      'Espacio libre por delante antes de empezar',
      'Alterná la pierna de adelante en cada paso',
      'Medí por distancia o por pasos totales',
    ],
  },
  'bulgarian-split-squat': {
    description:
      'Sentadilla búlgara, con el pie trasero elevado. Probablemente el mejor ejercicio unilateral de pierna: brutal para cuádriceps y glúteos, con muy poca carga axial.',
    tips: [
      'Pie trasero apoyado en un banco a la altura de la rodilla',
      'Distancia al banco: unos 60–70 cm',
      'Torso inclinado hacia adelante para más glúteo, vertical para más cuádriceps',
      'Peso corporal primero: es más difícil de lo que parece',
    ],
    commonMistakes: ['Quedar demasiado cerca del banco', 'Apoyar mucho peso en la pierna de atrás'],
  },
  'step-up': {
    description:
      'Subida al cajón. Movimiento unilateral muy funcional que trabaja glúteo y cuádriceps, con énfasis en la fase concéntrica de extensión de cadera.',
    tips: [
      'Altura del cajón: rodilla a 90° al apoyar el pie',
      'Empujá con el talón de la pierna de arriba',
      'No te impulses con la pierna de abajo',
    ],
    commonMistakes: ['Usar el pie de abajo para saltar', 'Cajón demasiado alto y perder la técnica'],
  },

  // ── Femorales y glúteos ───────────────────────────────────────────────────
  'romanian-deadlift': {
    description:
      'Peso muerto rumano. El mejor ejercicio para isquiotibiales y glúteos: trabaja la bisagra de cadera con rodillas casi fijas, maximizando el estiramiento de la cadena posterior.',
    tips: [
      'Rodillas con leve flexión fija, no se mueven',
      'Llevá la cadera hacia atrás, no bajes doblando la espalda',
      'La barra roza los muslos todo el recorrido',
      'Bajá hasta sentir el estiramiento en los isquios, no más',
      'Extendé la cadera apretando los glúteos al subir',
    ],
    commonMistakes: [
      'Convertirlo en una sentadilla flexionando las rodillas',
      'Redondear la espalda buscando bajar más',
      'Alejar la barra del cuerpo',
    ],
  },
  'stiff-leg-deadlift': {
    description:
      'Peso muerto con piernas rígidas. Similar al rumano pero con las rodillas aún más extendidas y arrancando desde el suelo, lo que aumenta el estiramiento y la exigencia lumbar.',
    tips: [
      'Rodillas casi bloqueadas, apenas desbloqueadas',
      'Rango completo desde el suelo',
      'Requiere buena movilidad de isquios: si no llegás, hacé rumano',
    ],
    commonMistakes: ['Redondear la lumbar para tocar el suelo'],
  },
  'good-morning': {
    description:
      'Buenos días. Bisagra de cadera con la barra en la espalda. Muy efectivo para isquios y erectores espinales, y excelente accesorio para mejorar la sentadilla.',
    tips: [
      'Barra bien apoyada en los trapecios, como en sentadilla',
      'Cadera atrás, espalda rígida y neutra',
      'Peso muy conservador: la palanca sobre la lumbar es enorme',
    ],
    commonMistakes: ['Cargar como si fuera una sentadilla', 'Perder la neutralidad de la columna'],
  },
  'leg-curl': {
    description:
      'Curl femoral en máquina. Aísla la flexión de rodilla, que es la función de los isquiotibiales que el peso muerto rumano no entrena.',
    tips: [
      'Alineá la rodilla con el eje de la máquina',
      'Punta del pie hacia la espinilla para más énfasis',
      'Bajada lenta: la fase excéntrica previene lesiones de isquio',
    ],
    commonMistakes: ['Levantar la cadera del banco', 'Soltar el peso de golpe al bajar'],
  },
  'nordic-curl': {
    description:
      'Curl nórdico. Excéntrico de isquiotibiales con peso corporal, con la mejor evidencia disponible para prevenir lesiones de isquio. Muy difícil.',
    tips: [
      'Necesitás que alguien te sostenga los tobillos o un anclaje firme',
      'Bajá lo más lento posible y amortiguá con las manos',
      'Empezá con rango parcial: bajar 30° ya es mucho',
    ],
    commonMistakes: ['Flexionar la cadera para hacerlo más fácil', 'Intentar el rango completo desde el día uno'],
  },
  'hip-thrust': {
    description:
      'Hip thrust. El ejercicio con mayor activación de glúteo medida en laboratorio: la tensión es máxima justo en la extensión completa de cadera, que es donde el glúteo más trabaja.',
    tips: [
      'Borde del banco justo debajo de las escápulas',
      'Pies a una distancia tal que la tibia quede vertical arriba',
      'Mentón hacia el pecho y costillas abajo, sin arquear la lumbar',
      'Pausá 1–2 segundos arriba apretando el glúteo',
    ],
    commonMistakes: [
      'Hiperextender la lumbar en vez de extender la cadera',
      'Pies demasiado cerca (pasa a trabajar cuádriceps)',
      'Rango incompleto',
    ],
  },
  'glute-bridge': {
    description:
      'Puente de glúteos en el suelo. Versión más simple del hip thrust, con menos rango pero sin necesidad de banco. Ideal para aprender el patrón o para calentar.',
    tips: [
      'Talones cerca de los glúteos',
      'Empujá con los talones y apretá arriba',
      'Se puede cargar con barra o disco sobre la cadera',
    ],
  },
  'glute-kickback': {
    description:
      'Patada de glúteo en polea. Aislamiento unilateral del glúteo mayor mediante extensión de cadera pura, sin participación de cuádriceps.',
    tips: [
      'Torso firme, sin arquear la lumbar para llegar más atrás',
      'El movimiento viene de la cadera, no de la espalda',
      'Pausá al final del recorrido',
    ],
    commonMistakes: ['Compensar con hiperextensión lumbar', 'Rango exagerado con impulso'],
  },
  'hip-abduction': {
    description:
      'Abducción de cadera en máquina. Trabaja glúteo medio y menor, responsables de estabilizar la pelvis al caminar, correr y hacer cualquier ejercicio unilateral.',
    tips: [
      'Torso inclinado hacia adelante para más glúteo medio',
      'Movimiento controlado, sin rebote',
      'Pausá en la posición abierta',
    ],
  },

  // ── Gemelos ───────────────────────────────────────────────────────────────
  'standing-calf-raise': {
    description:
      'Elevación de talones de pie. Con la rodilla extendida el gastrocnemio (el gemelo visible) es el motor principal.',
    tips: [
      'Rango completo: estirá abajo y subí hasta la punta del pie',
      'Pausá arriba un segundo, es un músculo que responde a la contracción',
      'Rodillas extendidas durante todo el movimiento',
    ],
    commonMistakes: ['Rebotar sin control aprovechando el tendón de Aquiles', 'Rango corto'],
  },
  'seated-calf-raise': {
    description:
      'Elevación de talones sentado. Con la rodilla flexionada el gastrocnemio queda acortado y trabaja el sóleo, que es el músculo profundo de la pantorrilla.',
    tips: [
      'Rodilla a 90°',
      'Mismo principio: rango completo y pausa arriba',
      'El sóleo responde bien a repeticiones altas (15–25)',
    ],
  },
  'db-calf-raise': {
    description:
      'Elevación de talones con mancuernas, apoyando la punta del pie en un escalón o disco. La opción sin máquina para trabajar gemelo.',
    tips: [
      'Punta del pie en un escalón para lograr el estiramiento completo',
      'Sostenete de algo para no perder el equilibrio',
      'Se puede hacer a una pierna para más carga relativa',
    ],
  },
}
