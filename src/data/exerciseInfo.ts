export interface ExerciseInfo {
  description: string
  tips: string[]
  commonMistakes?: string[]
}

export const EXERCISE_INFO: Record<string, ExerciseInfo> = {
  'bench-press': {
    description: 'El ejercicio rey del pecho. Desarrolla fuerza y masa en el pectoral mayor, con participación secundaria de tríceps y deltoides anterior. Es el movimiento de empuje horizontal por excelencia.',
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
  },
  'incline-bench-press': {
    description: 'Variante inclinada que enfatiza la porción clavicular (superior) del pectoral. Ángulo óptimo: 30–45°. Más demandante para el hombro que el press plano.',
    tips: [
      'Ángulo de 30–45°, no más para no convertirlo en press de hombros',
      'Misma técnica de escápulas que el press plano',
      'La barra baja hacia la parte superior del pecho',
    ],
  },
  'db-bench-press': {
    description: 'La versión con mancuernas permite mayor rango de movimiento y trabaja mejor la simetría entre ambos lados. Requiere más estabilización.',
    tips: [
      'Las mancuernas se tocan levemente al tope del movimiento',
      'Rotación natural de muñecas permitida',
      'Mayor profundidad de bajada que con barra',
    ],
  },
  'deadlift': {
    description: 'El levantamiento más completo: involucra casi todos los músculos del cuerpo. Desarrolla fuerza real de la cadena posterior (espalda baja, glúteos, isquiotibiales) y es fundamental para cualquier programa de fuerza.',
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
  },
  'squat': {
    description: 'La reina de los ejercicios de pierna. Desarrolla cuádriceps, glúteos e isquiotibiales simultáneamente. Es el movimiento de sentadilla más funcional y transferible a la vida cotidiana.',
    tips: [
      'Pies a la altura de los hombros o ligeramente más abiertos',
      'Puntas levemente abiertas (15–30°)',
      'Rodillas siguiendo la línea de las puntas',
      'Profundidad: al menos hasta paralela (muslo paralelo al suelo)',
      'Peso en todo el pie, talón no levanta',
      'Pecho arriba, mirada al frente',
    ],
    commonMistakes: [
      'Rodillas cayendo hacia adentro (cave-in)',
      'Talones levantándose',
      'Inclinar demasiado el torso hacia adelante',
    ],
  },
  'pull-up': {
    description: 'Ejercicio de tracción vertical que desarrolla el dorsal ancho y bíceps. El mejor indicador de fuerza relativa (fuerza por unidad de peso corporal). Excelente para la amplitud de la espalda.',
    tips: [
      'Agarre prono (palmas hacia afuera), ligeramente más ancho que hombros',
      'Empezar desde el "hang muerto" con escápulas deprimidas',
      'Llevar el pecho a la barra, no la barbilla',
      'Evitar el balanceo del cuerpo',
      'Bajar de forma controlada hasta estiramiento completo',
    ],
  },
  'overhead-press': {
    description: 'El press militar desarrolla fuerza y masa en todo el complejo de hombros, especialmente el deltoides anterior y medio. También involucra tríceps y core como estabilizadores.',
    tips: [
      'Agarre a la anchura de los hombros o ligeramente más',
      'La barra apoya sobre los deltoides antes del press',
      'Empujar la cabeza hacia adelante una vez pasa la barra',
      'Glúteos y core contraídos durante toda la repetición',
      'Completa extensión de codos arriba',
    ],
    commonMistakes: [
      'Arquear excesivamente la zona lumbar',
      'No extender completamente arriba',
      'No mantener el core activo',
    ],
  },
  'barbell-row': {
    description: 'Remo con barra para desarrollar el grosor de la espalda (romboides, trapecio medio, dorsal). Movimiento de tracción horizontal fundamental en cualquier programa.',
    tips: [
      'Torso casi paralelo al suelo (45–90°)',
      'Barra hacia el abdomen bajo/ombligo',
      'Escápulas juntas en la contracción',
      'Controlar la bajada (excéntrico)',
    ],
  },
  'lat-pulldown': {
    description: 'Alternativa a las dominadas para desarrollar el dorsal ancho. Ideal para principiantes o como complemento de volumen cuando ya no se pueden hacer más dominadas.',
    tips: [
      'Agarre prono, ligeramente más ancho que hombros',
      'Llevar la barra hacia la parte superior del pecho',
      'No inclinar demasiado el torso hacia atrás',
      'Escápulas deprimidas durante el movimiento',
    ],
  },
  'db-curl': {
    description: 'Curl básico con mancuernas para el desarrollo del bíceps. La versión alternada permite mayor concentración en cada brazo y supinación completa del antebrazo.',
    tips: [
      'Supinar (rotar la muñeca hacia afuera) durante la subida',
      'Codo fijo, pegado al costado del cuerpo',
      'Control total en la bajada (excéntrico)',
      'No balancear el cuerpo para subir el peso',
    ],
  },
  'barbell-curl': {
    description: 'Variante con barra que permite mayor carga total. Excelente para ganar masa en el bíceps. La barra EZ reduce la tensión en las muñecas.',
    tips: [
      'Agarre supino (palmas hacia arriba), a la anchura de los hombros',
      'Codos fijos durante todo el recorrido',
      'Subida explosiva, bajada controlada',
    ],
  },
  'triceps-pushdown': {
    description: 'Aislamiento de tríceps en polea. Muy efectivo para desarrollar el volumen del tríceps, especialmente la cabeza lateral. La polea mantiene tensión constante.',
    tips: [
      'Codos fijos, pegados al costado',
      'Extensión completa abajo, sin bloquear violentamente',
      'No inclinar el cuerpo hacia adelante',
      'Usar agarre con cuerda para mayor rango de movimiento',
    ],
  },
  'lateral-raise': {
    description: 'Aislamiento del deltoides medio (cabeza lateral). Clave para construir hombros anchos y la forma de "V" del torso.',
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
  'leg-press': {
    description: 'Ejercicio de cuádriceps y glúteos en máquina. Permite cargar mucho más peso que la sentadilla al no requerir estabilización de la columna. Ideal para hipetrofia.',
    tips: [
      'Pies a la anchura de los hombros en la plataforma',
      'No bloquear las rodillas al final de la extensión',
      'Rodillas siguiendo la línea de las puntas',
      'Bajar hasta 90° mínimo de flexión',
    ],
    commonMistakes: [
      'Despegar la zona lumbar de la máquina',
      'Rango de movimiento demasiado corto',
      'Bloquear rodillas (riesgo de lesión)',
    ],
  },
  'lunges': {
    description: 'Zancadas que trabajan cuádriceps y glúteos unilateralmente. Excelentes para corregir desequilibrios entre piernas y mejorar estabilidad.',
    tips: [
      'Paso largo, rodilla trasera casi toca el suelo',
      'Torso recto, no inclinado',
      'Rodilla delantera no sobrepasa la punta del pie',
    ],
  },
  'romanian-deadlift': {
    description: 'Variante del peso muerto que aísla los isquiotibiales y glúteos. Menor intervención de cuádriceps que el deadlift convencional. Excelente para la cadena posterior.',
    tips: [
      'Rodillas levemente flexionadas, fijas durante el movimiento',
      'Bajar la barra deslizándola por las piernas',
      'Sentir el estiramiento de isquiotibiales antes de subir',
      'Espalda neutral en todo momento',
    ],
  },
  'face-pull': {
    description: 'Ejercicio de salud del hombro que trabaja el deltoides posterior y los rotadores externos. Fundamental para mantener el balance muscular y prevenir lesiones de hombro.',
    tips: [
      'Polea a la altura de los ojos o ligeramente superior',
      'Tirar hacia la cara, no al cuello',
      'Rotación externa máxima al final del movimiento',
      'Codos arriba durante toda la ejecución',
    ],
  },
  'plank': {
    description: 'Ejercicio isométrico de core que trabaja toda la musculatura estabilizadora del tronco. Base de cualquier programa de fortalecimiento abdominal.',
    tips: [
      'Cuerpo en línea recta de cabeza a talones',
      'Core contraído, no dejar que las caderas caigan',
      'Respiración normal durante la postura',
      'Progresión: aumentar tiempo gradualmente',
    ],
  },
  'bench-dips': {
    description: 'Fondos en banco para tríceps. Ejercicio accesible que no requiere equipamiento especial. Ideal para finalizar un entrenamiento de brazos.',
    tips: [
      'Manos justo al lado de las caderas en el banco',
      'Bajar hasta que los codos formen 90°',
      'Mantener la espalda pegada al banco en la bajada',
    ],
  },
  'cable-fly': {
    description: 'Apertura en cables para el pecho. La tensión constante del cable hace este ejercicio superior a las aperturas con mancuernas para activación muscular.',
    tips: [
      'Ligera flexión de codo durante todo el movimiento',
      'Movimiento semicircular, como si abrazar un árbol',
      'La contracción máxima en el punto de cruce de las manos',
    ],
  },
  'hip-thrust': {
    description: 'El mejor ejercicio para el desarrollo de los glúteos. Activación máxima del glúteo mayor con mínima intervención de cuádriceps e isquiotibiales.',
    tips: [
      'Barra sobre las caderas, protegida con colchoneta',
      'Empuje desde los talones',
      'Extensión completa de cadera arriba sin arquear la lumbar',
      'Pausa de 1 segundo en el punto alto',
    ],
  },
}

export function getExerciseInfo(exerciseId: string): ExerciseInfo | null {
  return EXERCISE_INFO[exerciseId] ?? null
}
