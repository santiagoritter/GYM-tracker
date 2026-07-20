export interface MotivationalMessage {
  text: string
  author?: string
}

export const ONBOARDING_MESSAGES: MotivationalMessage[] = [
  { text: 'El único entrenamiento malo es el que no hiciste.', author: 'Joe Weider' },
  { text: 'No te limites. Mucha gente se limita a lo que piensa que puede hacer. Podés llegar tan lejos como tu mente te deje.', author: 'Mary Kay Ash' },
  { text: 'El dolor que sentís hoy es la fuerza que vas a sentir mañana.' },
  { text: 'Éxito no es un destino, es el viaje.', author: 'Zig Ziglar' },
  { text: 'La disciplina es el puente entre tus metas y tus logros.' },
  { text: 'Cada rep que hacés es una inversión en el cuerpo que querés tener.' },
  { text: 'El cuerpo alcanza lo que la mente cree.' },
  { text: 'No pares cuando estés cansado. Pará cuando hayas terminado.' },
  { text: 'Cuida tu cuerpo, es el único lugar que tenés para vivir.', author: 'Jim Rohn' },
  { text: 'Los campeones no son hechos en los gimnasios. Son hechos de algo profundo en su interior.', author: 'Muhammad Ali' },
]

export const WORKOUT_COMPLETE_MESSAGES: MotivationalMessage[] = [
  { text: '¡Otro entreno en el banco! Sos más fuerte de lo que eras ayer.' },
  { text: 'El trabajo de hoy es el resultado de mañana. ¡Bien hecho!' },
  { text: '¡Rompiste el límite de hoy! El progreso es constante.' },
  { text: 'Mientras otros duermen, vos crecés. ¡Excelente sesión!' },
  { text: '¡Eso es todo! Cada kilo, cada rep, cuenta.' },
  { text: 'Tu cuerpo lo logró de nuevo. Dale el descanso que merece.' },
  { text: '¡Aplausos para vos! Otro paso hacia tu mejor versión.' },
]

export const HOME_MESSAGES: MotivationalMessage[] = [
  { text: 'Un día sin entrenar es un día sin progreso. ¿Arrancamos?' },
  { text: 'Tu yo del futuro te agradece cada sesión de hoy.' },
  { text: 'Comenzar es la mitad de la batalla. ¡Vamos!' },
  { text: '¿Listo para superar tu último entreno?' },
  { text: 'La consistencia vence al talento siempre.' },
  { text: 'Hoy es un buen día para ser más fuerte.' },
  { text: 'No necesitás motivación para empezar. Empezá y la motivación llega.' },
]

export const PR_MESSAGES: MotivationalMessage[] = [
  { text: '¡Nuevo récord personal! Sos literalmente la versión más fuerte de vos mismo.' },
  { text: '¡PR caído! El techo de ayer es el piso de hoy.' },
  { text: '¡Récord nuevo! Cada PR es una promesa cumplida.' },
]

let homeIdx = Math.floor(Math.random() * HOME_MESSAGES.length)
export function getDailyMessage(): MotivationalMessage {
  return HOME_MESSAGES[homeIdx++ % HOME_MESSAGES.length]
}

export function getRandomMessage(list: MotivationalMessage[]): MotivationalMessage {
  return list[Math.floor(Math.random() * list.length)]
}
