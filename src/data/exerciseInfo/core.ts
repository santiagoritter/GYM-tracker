import type { ExerciseInfo } from './index'

export const CORE_INFO: Record<string, ExerciseInfo> = {
  plank: {
    description:
      'Plancha isométrica. Entrena el core en su función real: resistir el movimiento, no generarlo. Fortalece el transverso abdominal, que estabiliza la columna en todos los demás ejercicios.',
    tips: [
      'Codos justo debajo de los hombros',
      'Cuerpo en línea recta de la cabeza a los talones',
      'Glúteos y abdomen apretados, costillas hacia abajo',
      'Respirá normal: si no podés hablar, estás aguantando la respiración',
      'Mejor 30 segundos perfectos que 2 minutos con la cadera caída',
    ],
    commonMistakes: ['Cadera caída (arquea la lumbar)', 'Cadera muy alta', 'Aguantar la respiración'],
  },
  'side-plank': {
    description:
      'Plancha lateral. Trabaja los oblicuos y el cuadrado lumbar, responsables de resistir la flexión lateral de la columna y estabilizar la pelvis.',
    tips: [
      'Codo debajo del hombro',
      'Cadera bien alta, cuerpo en línea recta vista de frente',
      'Si es muy difícil, apoyá las rodillas',
    ],
    commonMistakes: ['Dejar caer la cadera', 'Rotar el torso hacia el suelo'],
  },
  crunch: {
    description:
      'Abdominal clásico. Flexión de la columna que trabaja el recto abdominal, sobre todo en su porción superior.',
    tips: [
      'Despegá solo los omóplatos, no toda la espalda',
      'Manos en el pecho o al costado de la cabeza, sin tirar del cuello',
      'Exhalá al subir y apretá el abdomen',
    ],
    commonMistakes: ['Tirar de la nuca con las manos', 'Hacerlo con impulso y velocidad'],
  },
  'v-up': {
    description:
      'Abdominal en V. Sube tren superior e inferior a la vez, así que trabaja recto abdominal completo y flexores de cadera. Bastante más exigente que el crunch.',
    tips: [
      'Piernas rectas y brazos extendidos si podés; si no, flexioná las rodillas',
      'Tocá los pies con las manos arriba',
      'Bajá controlado sin apoyar del todo entre reps',
    ],
    commonMistakes: ['Usar impulso de brazos', 'Arquear la lumbar al bajar'],
  },
  'hanging-leg-raise': {
    description:
      'Elevación de piernas colgado de la barra. El mejor ejercicio para la porción baja del recto abdominal, y además exige mucho al agarre.',
    tips: [
      'Retrovertí la pelvis al subir: es el detalle que hace trabajar al abdomen y no solo al psoas',
      'Sin balanceo: si te movés como un péndulo, bajá el rango',
      'Progresión: rodillas flexionadas primero, piernas rectas después',
    ],
    commonMistakes: ['Balancearse', 'Subir solo con los flexores de cadera sin curvar la pelvis'],
  },
  'cable-crunch': {
    description:
      'Crunch arrodillado en polea alta. La única forma cómoda de cargar progresivamente el abdomen, que es un músculo como cualquier otro y también necesita sobrecarga.',
    tips: [
      'Arrodillado, con la soga a los costados de la cabeza',
      'Curvá la columna llevando el esternón hacia la pelvis',
      'La cadera queda fija: no es una bisagra de cadera',
    ],
    commonMistakes: ['Flexionar desde la cadera en vez de curvar la columna', 'Tirar con los brazos'],
  },
  'russian-twist': {
    description:
      'Giro ruso. Trabaja los oblicuos mediante rotación del torso, con el añadido del trabajo isométrico de sostener la posición en V.',
    tips: [
      'Torso a unos 45° del suelo y espalda recta',
      'La rotación viene del torso, no de los brazos',
      'Talones elevados si querés más dificultad',
    ],
    commonMistakes: ['Mover solo los brazos de lado a lado', 'Redondear la espalda'],
  },
  'ab-wheel': {
    description:
      'Rueda abdominal. Uno de los ejercicios de core más exigentes: el abdomen tiene que resistir la extensión de toda la columna en una palanca larguísima.',
    tips: [
      'Empezá de rodillas y con recorrido corto',
      'Pelvis retrovertida y costillas abajo durante todo el movimiento',
      'Si sentís la lumbar, acortá el rango inmediatamente',
    ],
    commonMistakes: ['Arquear la lumbar al extenderse', 'Intentar de pie sin dominar la versión de rodillas'],
  },
  'dead-bug': {
    description:
      'Bicho muerto. Enseña a mantener la lumbar pegada al suelo mientras se mueven brazos y piernas. Es el ejercicio de control de core más seguro y el mejor para aprender el patrón.',
    tips: [
      'Lumbar siempre en contacto con el suelo',
      'Movés brazo y pierna contrarios, lento',
      'Exhalá al extender',
    ],
    commonMistakes: ['Despegar la lumbar del suelo', 'Ir demasiado rápido'],
  },
  'mountain-climber': {
    description:
      'Escaladores. Movimiento dinámico que combina estabilidad de core en posición de plancha con demanda cardiovascular alta.',
    tips: [
      'Mantené la posición de plancha: hombros sobre las manos',
      'La cadera no sube ni baja al alternar piernas',
      'Trabajá por tiempo, no por repeticiones',
    ],
    commonMistakes: ['Levantar la cadera', 'Perder la alineación por ir demasiado rápido'],
  },
  'pallof-press': {
    description:
      'Press Pallof. Ejercicio anti-rotación: el core trabaja resistiendo el giro que provoca la polea lateral. Muy transferible a la estabilidad en sentadilla y peso muerto.',
    tips: [
      'De pie perpendicular a la polea, a la altura del pecho',
      'Extendé los brazos al frente sin dejar que el torso rote',
      'Cuanto más lejos de la polea, más difícil',
    ],
    commonMistakes: ['Dejar que el torso gire', 'Usar demasiado peso y compensar con la cadera'],
  },
}
