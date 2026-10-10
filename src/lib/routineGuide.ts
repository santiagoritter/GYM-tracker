/**
 * Guía "Cómo ordenar tu rutina" (RoutineEditor). Contenido aparte de la pantalla
 * para poder revisarlo y probarlo. Cada punto dice si es evidencia o regla práctica:
 * no se vende una regla de gimnasio como si fuera ciencia.
 */

export interface GuidePoint {
  title: string
  body: string
}

export const ROUTINE_GUIDE: readonly GuidePoint[] = [
  {
    title: 'Lo que más te importa, primero',
    body: 'Arrancá con el ejercicio que más querés mejorar: al principio de la sesión rendís más y hacés más repeticiones con la misma carga. Es lo mejor respaldado en los estudios sobre el orden de los ejercicios (Simão et al., 2012).',
  },
  {
    title: 'Grandes antes que chicos, compuestos antes que aislados',
    body: 'Pecho, espalda y piernas antes que bíceps, tríceps u hombros; sentadilla o press antes que extensiones o aperturas. Si cansás un músculo chico primero, el grande rinde menos en los ejercicios pesados. Es la recomendación estándar del ACSM (2009). Para ganar músculo a largo plazo la diferencia es chica: usalo como una buena regla, no como una ley.',
  },
  {
    title: 'Repeticiones y descanso',
    body: '8 a 12 repeticiones es un buen punto de partida (ACSM, 2009). Como regla práctica, descansá 2 a 3 minutos en los ejercicios pesados y 1 a 2 en los accesorios. Podés ajustar el descanso de cada ejercicio con los botones de abajo.',
  },
  {
    title: 'Cuántas series por músculo',
    body: 'Más series por semana dan más crecimiento muscular, hasta cierto punto (Schoenfeld, Ogborn y Krieger, 2017). Como orientación, 10 a 20 series por músculo por semana: empezá por la parte baja y subí de a poco.',
  },
  {
    title: 'Dos veces por semana',
    body: 'Entrenar cada músculo unas 2 veces por semana te deja repartir las series sin llegar agotado a cada sesión. Es una forma cómoda de distribuir el volumen, no un requisito.',
  },
  {
    title: 'Superseries',
    body: 'Sirven para ahorrar tiempo. Unilas entre músculos que no compiten (por ejemplo bíceps y tríceps) y evitá hacerlas en los ejercicios pesados, donde importa rendir al máximo. Con el botón de enlace de cada ejercicio lo unís con el anterior.',
  },
  {
    title: 'Armá cada día',
    body: 'Entre 4 y 6 ejercicios por día alcanzan. Empezá con una o dos series livianas del primer ejercicio para entrar en calor.',
  },
]

export const ROUTINE_GUIDE_TITLE = 'Cómo ordenar tu rutina'

export const ROUTINE_GUIDE_FOOTNOTE =
  'Guía general, no una prescripción personalizada. Fuentes: ACSM (2009), Simão et al. (2012), Schoenfeld et al. (2017).'
