import type { ExerciseInfo } from './index'

export const ARMS_INFO: Record<string, ExerciseInfo> = {
  // ── Bíceps ────────────────────────────────────────────────────────────────
  'barbell-curl': {
    description:
      'Curl con barra. El ejercicio básico de bíceps: permite más carga que las mancuernas y es el mejor punto de partida para ganar fuerza en flexión de codo.',
    tips: [
      'Codos pegados al torso y fijos: el hombro no se mueve',
      'Agarre a lo ancho de los hombros',
      'Bajá hasta extensión casi completa',
      'Si la muñeca molesta, usá barra Z',
    ],
    commonMistakes: ['Balancear el torso', 'Adelantar los codos al subir', 'Rango parcial arriba'],
  },
  'ez-bar-curl': {
    description:
      'Curl con barra Z. Los ángulos de la barra dejan la muñeca en semi-supinación, lo que reduce la tensión en el antebrazo sin perder carga.',
    tips: [
      'Agarrá en los ángulos internos de la barra',
      'Misma técnica que el curl con barra recta',
      'Buena opción si el curl con barra recta te molesta las muñecas',
    ],
  },
  'db-curl': {
    description:
      'Curl con mancuernas. Permite supinar la muñeca durante la subida, que es la otra función del bíceps además de flexionar el codo, y corrige diferencias entre brazos.',
    tips: [
      'Podés alternar brazos o hacerlos simultáneos',
      'Supiná (girá la palma hacia arriba) a medida que subís',
      'Apretá arriba un segundo',
    ],
    commonMistakes: ['Mover los codos hacia adelante', 'Usar impulso de hombro'],
  },
  'hammer-curl': {
    description:
      'Curl martillo, con agarre neutro. Trabaja el braquial y el braquiorradial además del bíceps: el braquial está debajo del bíceps y empujarlo hace que el brazo se vea más grueso.',
    tips: [
      'Palmas enfrentadas durante todo el recorrido',
      'Codos fijos al costado',
      'Se puede usar algo más de peso que en el curl supino',
    ],
  },
  'incline-db-curl': {
    description:
      'Curl en banco inclinado. Al quedar el brazo por detrás del torso, el bíceps arranca estirado, lo que aumenta el estímulo en la porción larga.',
    tips: [
      'Banco a 45–60°',
      'Dejá los brazos colgar completamente al bajar',
      'Peso bastante menor que de pie: la posición es muy desventajosa',
    ],
    commonMistakes: ['Adelantar los hombros para ayudarse', 'No bajar del todo y perder el estiramiento'],
  },
  'preacher-curl': {
    description:
      'Curl en banco Scott. El apoyo del brazo elimina cualquier impulso, así que aísla el bíceps por completo, con énfasis en la porción corta.',
    tips: [
      'Axilas apoyadas firmes en el respaldo',
      'No extiendas el codo al 100% de golpe con peso alto',
      'Subí hasta poco antes de la vertical, donde se pierde la tensión',
    ],
    commonMistakes: ['Despegar el brazo del respaldo', 'Extender de golpe abajo (riesgo en el tendón)'],
  },
  'concentration-curl': {
    description:
      'Curl concentrado, con el codo apoyado en la cara interna del muslo. Máximo aislamiento y el ejercicio donde más se siente el pico del bíceps.',
    tips: [
      'Sentado, codo firme contra el muslo interno',
      'Movimiento lento y controlado',
      'Es de baja carga y alta conexión: no busques peso',
    ],
  },
  'spider-curl': {
    description:
      'Curl con el pecho apoyado en un banco inclinado y los brazos colgando verticales. La tensión es máxima en la contracción, al revés que en el curl inclinado.',
    tips: [
      'Pecho apoyado en la parte alta del banco a 45°',
      'Brazos perpendiculares al suelo',
      'Apretá fuerte arriba, es donde está el estímulo',
    ],
  },
  'cable-curl': {
    description:
      'Curl en polea baja. Tensión constante en todo el rango, incluida la parte final, donde con peso libre el bíceps deja de trabajar.',
    tips: [
      'Un paso atrás de la polea para tensar desde el inicio',
      'Codos fijos al costado',
      'Ideal para cerrar el entreno de brazos con altas repeticiones',
    ],
  },
  'reverse-curl': {
    description:
      'Curl con agarre prono (palmas hacia abajo). Trabaja el braquiorradial y los extensores del antebrazo, que suelen ser el eslabón débil del agarre.',
    tips: [
      'Muñecas rectas y firmes',
      'Bastante menos peso que en curl supino: es normal',
      'Barra Z hace la posición más cómoda',
    ],
    commonMistakes: ['Doblar las muñecas hacia abajo al subir'],
  },

  // ── Tríceps ───────────────────────────────────────────────────────────────
  'triceps-pushdown': {
    description:
      'Extensión de tríceps en polea alta. El ejercicio de aislamiento más usado para tríceps: fácil de ejecutar bien y con tensión constante.',
    tips: [
      'Codos pegados al torso y fijos durante todo el movimiento',
      'Extensión completa abajo, apretando el tríceps',
      'Torso ligeramente inclinado hacia adelante y quieto',
    ],
    commonMistakes: [
      'Separar los codos del cuerpo',
      'Usar el peso del cuerpo para empujar hacia abajo',
      'Rango parcial (no extender del todo)',
    ],
  },
  'rope-pushdown': {
    description:
      'Extensión con soga. Al poder separar las manos al final, permite una contracción más completa que la barra, sobre todo de la cabeza lateral.',
    tips: [
      'Separá las manos al llegar abajo, abriendo la soga',
      'Codos fijos al costado',
      'Peso algo menor que con barra',
    ],
  },
  'overhead-triceps-ext': {
    description:
      'Extensión sobre la cabeza. Es el único patrón que estira la cabeza larga del tríceps, la porción más grande y la que menos se trabaja en los press.',
    tips: [
      'Codos apuntando al techo y cerca de la cabeza',
      'Bajá hasta sentir estiramiento detrás del brazo',
      'Se puede hacer con mancuerna, soga en polea o barra Z',
    ],
    commonMistakes: ['Abrir los codos hacia los costados', 'Arquear la lumbar al subir'],
  },
  'skull-crusher': {
    description:
      'Press francés acostado. Excelente para la cabeza larga del tríceps y uno de los ejercicios que más masa aporta al brazo, aunque exige cuidado con el codo.',
    tips: [
      'Barra Z para cuidar las muñecas',
      'Bajá hacia la frente o algo por detrás de la cabeza',
      'Codos apuntando al techo, no abiertos',
      'Si molesta el codo, bajá el peso y aumentá el rango',
    ],
    commonMistakes: ['Abrir los codos', 'Convertirlo en un press cerrado', 'Peso excesivo'],
  },
  'close-grip-bench': {
    description:
      'Press de banca con agarre cerrado. El ejercicio compuesto de tríceps por excelencia: permite mucha carga y transfiere directo al bloqueo del press de banca.',
    tips: [
      'Agarre a lo ancho de los hombros, no más cerrado',
      'Codos pegados al torso al bajar',
      'La barra baja al pecho bajo / borde inferior del esternón',
    ],
    commonMistakes: ['Agarre demasiado cerrado (estresa la muñeca sin trabajar más el tríceps)'],
  },
  'dips-triceps': {
    description:
      'Fondos en paralelas con el torso vertical. Con el cuerpo erguido el tríceps pasa a ser el motor principal. Ejercicio de peso corporal muy efectivo y muy exigente.',
    tips: [
      'Torso lo más vertical posible',
      'Codos pegados al cuerpo, apuntando hacia atrás',
      'Bajá hasta 90° de codo, no más',
      'Cuando sea fácil, sumá lastre con cinturón',
    ],
    commonMistakes: ['Bajar demasiado', 'Inclinarse hacia adelante (pasa a ser de pecho)'],
  },
  'db-kickback': {
    description:
      'Patada de tríceps. Aislamiento donde la máxima tensión ocurre con el brazo extendido, es decir en la contracción pico de la cabeza lateral.',
    tips: [
      'Brazo pegado al torso y paralelo al suelo',
      'Solo se mueve el antebrazo',
      'Poco peso y pausa arriba: si necesitás impulso, es demasiado',
    ],
    commonMistakes: ['Balancear el brazo entero', 'Peso excesivo que arruina el rango'],
  },
  'wrist-curl': {
    description:
      'Curl de muñeca. Aísla los flexores del antebrazo. Útil si el agarre limita tus tirones o si buscás desarrollar el antebrazo específicamente.',
    tips: [
      'Antebrazos apoyados en el muslo o en un banco',
      'Dejá que la barra ruede hasta los dedos al bajar',
      'Altas repeticiones: es un músculo de resistencia',
    ],
  },
  'farmers-walk': {
    description:
      'Paseo del granjero: caminar cargando peso a los costados. Desarrolla agarre, trapecios y estabilidad de core, y es uno de los ejercicios más transferibles a la vida real.',
    tips: [
      'Pecho arriba, hombros atrás, mirada al frente',
      'Pasos cortos y rápidos',
      'Medí por distancia o por tiempo, no por repeticiones',
      'Sin correas: el objetivo es justamente el agarre',
    ],
    commonMistakes: ['Encorvarse bajo el peso', 'Usar correas y anular el trabajo de agarre'],
  },
}
