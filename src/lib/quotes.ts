import type { MotivationalMessage } from '@/lib/motivational'

/**
 * Frases para el momento reflexivo de la app (bloque de cierre en Inicio y
 * cuerpo de los recordatorios por hora). A diferencia de `motivational.ts`
 * —tono de vestuario, directo y corto— acá la vara es otra: frases con peso
 * propio, la mayoría de filosofía real y con autor verificable (estoicos,
 * existencialistas, algún clásico). Nada de "no pain no gain" traducido.
 *
 * Cada frase se etiqueta con el/los `daypart` donde tiene sentido leerla:
 *   - `dawn`    madrugada / antes de que arranque el día (00–05)
 *   - `morning` mañana (06–11)
 *   - `afternoon` tarde (12–18)
 *   - `night`   noche / cierre del día (19–23)
 * Una frase sin `daypart` sirve para cualquier hora.
 */

export type DayPart = 'dawn' | 'morning' | 'afternoon' | 'night'

export interface Quote extends MotivationalMessage {
  daypart?: DayPart[]
}

export const PHILOSOPHICAL_QUOTES: Quote[] = [
  // — Estoicos: empezar el día, acción sobre pereza —
  {
    text: 'Al amanecer, cuando te cueste levantarte, acordate: me despierto para hacer el trabajo de un ser humano.',
    author: 'Marco Aurelio',
    daypart: ['dawn', 'morning'],
  },
  {
    text: 'No digas que algo es imposible de hacer si otro ya lo hizo. Si es posible para un hombre, es alcanzable para vos.',
    author: 'Marco Aurelio',
    daypart: ['morning', 'afternoon'],
  },
  {
    text: 'La calidad de tu vida depende de la calidad de tus pensamientos.',
    author: 'Marco Aurelio',
  },
  {
    text: 'Empezá de una vez a ser el que querés ser, y hacelo con lo que tenés ahora.',
    author: 'Epicteto',
    daypart: ['morning'],
  },
  {
    text: 'No son los hechos los que perturban a los hombres, sino sus opiniones sobre los hechos.',
    author: 'Epicteto',
  },
  {
    text: 'Ninguna persona es libre si no es dueña de sí misma.',
    author: 'Epicteto',
    daypart: ['afternoon'],
  },
  {
    text: 'Primero decidí quién querés ser; después hacé lo que haya que hacer.',
    author: 'Epicteto',
    daypart: ['morning'],
  },
  {
    text: 'No es que tengamos poco tiempo, es que perdemos mucho.',
    author: 'Séneca',
    daypart: ['afternoon', 'night'],
  },
  {
    text: 'Mientras se espera vivir, la vida pasa.',
    author: 'Séneca',
  },
  {
    text: 'Las dificultades fortalecen la mente igual que el trabajo fortalece el cuerpo.',
    author: 'Séneca',
    daypart: ['morning', 'afternoon'],
  },
  {
    text: 'La suerte es lo que pasa cuando la preparación se cruza con la oportunidad.',
    author: 'Séneca',
    daypart: ['morning'],
  },
  {
    text: 'No hay viento favorable para el que no sabe a qué puerto va.',
    author: 'Séneca',
  },

  // — Voluntad, hábito, esfuerzo —
  {
    text: 'Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto sino un hábito.',
    author: 'Will Durant, sobre Aristóteles',
  },
  {
    text: 'Conocé al enemigo y conocete a vos mismo; en cien batallas nunca vas a estar en peligro.',
    author: 'Sun Tzu',
    daypart: ['morning'],
  },
  {
    text: 'El que tiene un porqué para vivir puede soportar casi cualquier cómo.',
    author: 'Friedrich Nietzsche',
  },
  {
    text: 'Lo que no me mata me hace más fuerte.',
    author: 'Friedrich Nietzsche',
    daypart: ['afternoon'],
  },
  {
    text: 'Hay que tener todavía caos dentro de uno para poder parir una estrella que baile.',
    author: 'Friedrich Nietzsche',
    daypart: ['night'],
  },
  {
    text: 'Hay que imaginarse a Sísifo feliz.',
    author: 'Albert Camus',
    daypart: ['afternoon', 'night'],
  },
  {
    text: 'En medio del invierno aprendí por fin que había en mí un verano invencible.',
    author: 'Albert Camus',
    daypart: ['dawn', 'morning'],
  },
  {
    text: 'El hombre es libre en el momento en que decide serlo.',
    author: 'Voltaire',
    daypart: ['morning'],
  },
  {
    text: 'No aflojes con la constancia por más lenta que parezca; la gota horada la piedra no por su fuerza sino por su insistencia.',
    author: 'Ovidio',
  },
  {
    text: 'El que quiere mover el mundo primero se mueve a sí mismo.',
    author: 'Sócrates',
    daypart: ['morning'],
  },
  {
    text: 'La única sabiduría verdadera está en saber que no sabés nada.',
    author: 'Sócrates',
    daypart: ['night'],
  },
  {
    text: 'Cuídate de la esterilidad de una vida ocupada.',
    author: 'Sócrates',
    daypart: ['afternoon'],
  },

  // — Cierre del día, reflexión —
  {
    text: 'Que ningún día se te vaya sin haber sumado una línea.',
    author: 'Plinio el Viejo',
    daypart: ['night'],
  },
  {
    text: 'Al caer la noche, preguntate: ¿qué mal corregí hoy? ¿contra qué defecto luché? ¿en qué soy mejor?',
    author: 'Séneca',
    daypart: ['night'],
  },
  {
    text: 'El descanso también es parte del trabajo; el campo que no se deja en barbecho deja de dar.',
    author: 'Ovidio',
    daypart: ['night'],
  },
  {
    text: 'Cada noche entrego lo que hice y no me arrepiento de nada que dependiera de mí.',
    author: 'Séneca',
    daypart: ['night'],
  },
  {
    text: 'La vida bien vivida es larga.',
    author: 'Leonardo da Vinci',
    daypart: ['night'],
  },

  // — Acción, cuerpo, presente —
  {
    text: 'Cuidá tu cuerpo. Es el único lugar que tenés para vivir.',
    author: 'Jim Rohn',
  },
  {
    text: 'El cuerpo humano es el carruaje; el yo, el que lo maneja; el pensamiento, las riendas; y las emociones, los caballos.',
    author: 'Platón',
    daypart: ['afternoon'],
  },
  {
    text: 'La disciplina es elegir entre lo que querés ahora y lo que querés más.',
    author: 'Abraham Lincoln',
    daypart: ['morning', 'afternoon'],
  },
  {
    text: 'No esperes; nunca va a ser el momento justo. Empezá donde estás, con lo que tenés.',
    author: 'Napoleon Hill',
    daypart: ['morning'],
  },
  {
    text: 'El obstáculo es el camino.',
    author: 'Marco Aurelio',
    daypart: ['morning', 'afternoon'],
  },
  {
    text: 'Lo que hacés todos los días importa más que lo que hacés de vez en cuando.',
    author: 'Gretchen Rubin',
  },
  {
    text: 'La montaña no se mueve; vos subís un paso, y después otro.',
  },
  {
    text: 'Nadie se baña dos veces en el mismo río: ni el río ni vos son los mismos.',
    author: 'Heráclito',
    daypart: ['afternoon'],
  },
  {
    text: 'El carácter es el destino.',
    author: 'Heráclito',
  },
  {
    text: 'Grande es el que hace poco a poco lo que otros creen imposible de golpe.',
    author: 'Buda',
    daypart: ['morning'],
  },
  {
    text: 'Regá hoy lo que querés cosechar en un año.',
  },
]

const HOUR_TO_DAYPART = (hour: number): DayPart => {
  if (hour < 6) return 'dawn'
  if (hour < 12) return 'morning'
  if (hour < 19) return 'afternoon'
  return 'night'
}

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 0)
  const diff = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start
  return Math.floor(diff / 86_400_000)
}

/**
 * Frase para el momento del día en que se lo llama. Pura: la misma fecha
 * devuelve siempre la misma frase (estable dentro del día, rota día a día),
 * así se puede calcular en render sin efecto (CLAUDE.md §5). El daypart
 * acota el pool; si por lo que sea quedara vacío, cae al pool completo.
 */
export function getQuoteForNow(date: Date = new Date()): Quote {
  const part = HOUR_TO_DAYPART(date.getHours())
  const pool = PHILOSOPHICAL_QUOTES.filter((q) => !q.daypart || q.daypart.includes(part))
  const list = pool.length > 0 ? pool : PHILOSOPHICAL_QUOTES
  // Índice determinístico por día: rota sin depender de Math.random (que
  // rompería la pureza) y sin repetir la misma frase dos días seguidos
  // mientras el pool tenga más de una.
  return list[dayOfYear(date) % list.length]
}
