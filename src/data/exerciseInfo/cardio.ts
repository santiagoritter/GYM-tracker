import type { ExerciseInfo } from './index'

export const CARDIO_INFO: Record<string, ExerciseInfo> = {
  'kb-swing': {
    description:
      'Swing con kettlebell. Bisagra de cadera explosiva que desarrolla potencia en glúteos e isquiotibiales y eleva mucho la frecuencia cardíaca. No es una sentadilla ni una elevación frontal.',
    tips: [
      'El movimiento viene de la cadera, no de los brazos',
      'La kettlebell pasa alto entre las piernas, cerca de la ingle',
      'Extendé la cadera con fuerza apretando los glúteos',
      'La pesa llega a la altura del pecho por inercia, no la levantes',
    ],
    commonMistakes: [
      'Hacer sentadillas en vez de bisagra de cadera',
      'Levantar la pesa con los hombros',
      'Redondear la espalda abajo',
    ],
  },
  'kb-goblet-clean': {
    description:
      'Clean con kettlebell: llevar la pesa desde el suelo a la posición de rack en el pecho. Movimiento técnico que desarrolla potencia y coordinación.',
    tips: [
      'Guiá la kettlebell cerca del cuerpo, no la dejes girar suelta',
      'Al llegar arriba, "atravesá" el asa con la mano en vez de dejar que golpee el antebrazo',
      'Aprendelo liviano: el golpe en el antebrazo es la señal de mala técnica',
    ],
    commonMistakes: ['Que la pesa golpee el antebrazo', 'Tirar con el brazo en vez de con la cadera'],
  },
  burpee: {
    description:
      'Burpee. Ejercicio de cuerpo completo que combina flexión, sentadilla y salto. Muy demandante a nivel cardiovascular y sin necesidad de equipamiento.',
    tips: [
      'Apoyá las manos antes de estirar las piernas hacia atrás',
      'Mantené el core firme al caer en plancha',
      'Si es mucho, sacá la flexión o el salto y escalá de a poco',
    ],
    commonMistakes: ['Dejar caer la cadera al llegar a la plancha', 'Perder la técnica por buscar velocidad'],
  },
  'jump-rope': {
    description:
      'Saltar la soga. Cardio de bajo costo y alta eficiencia que además mejora coordinación, elasticidad del tobillo y resistencia del gemelo.',
    tips: [
      'Saltos bajos: apenas lo suficiente para que pase la soga',
      'La soga la mueven las muñecas, no los brazos',
      'Codos pegados al cuerpo',
      'Caé sobre la punta del pie, con la rodilla suave',
    ],
    commonMistakes: ['Saltar demasiado alto y cansarse en un minuto', 'Mover los brazos enteros'],
  },
  'rowing-machine': {
    description:
      'Remo ergómetro. Cardio de cuerpo completo con muy poco impacto articular. La secuencia correcta reparte el trabajo: la mayor parte viene de las piernas.',
    tips: [
      'Secuencia del tirón: piernas, cadera, brazos',
      'Secuencia de la vuelta: brazos, cadera, piernas (al revés)',
      'Aproximadamente 60% piernas, 20% core, 20% brazos',
      'Espalda neutra, sin redondear al llegar adelante',
    ],
    commonMistakes: ['Tirar primero con los brazos', 'Redondear la espalda', 'Ritmo demasiado alto con técnica pobre'],
  },
  'assault-bike': {
    description:
      'Bicicleta de aire. La resistencia aumenta con el esfuerzo, así que es prácticamente imposible "hacer trampa": excelente para intervalos de alta intensidad.',
    tips: [
      'Empujá y tirá con los brazos, no solo pedalees',
      'Ajustá el asiento: rodilla casi extendida abajo',
      'Ideal para intervalos cortos (20–40 s) con pausas',
    ],
    commonMistakes: ['Usar solo las piernas', 'Arrancar a máxima intensidad y morir a los 30 segundos'],
  },
  'treadmill-run': {
    description:
      'Cinta de correr. Cardio controlable en velocidad e inclinación, lo que permite trabajar tanto sesiones largas de baja intensidad como intervalos precisos.',
    tips: [
      'Inclinación de 1% para simular mejor la carrera al aire libre',
      'No te agarres de los pasamanos: altera la mecánica y baja el gasto real',
      'Zancada natural, apoyando bajo el centro de masa',
    ],
    commonMistakes: ['Agarrarse del frente todo el tiempo', 'Inclinación muy alta con velocidad muy baja y postura vencida'],
  },
}
