import type { Equipment } from '@/types'

/**
 * Salto de peso realista según el equipo.
 *
 * Un incremento fijo de 2.5 kg para todo es incorrecto casi siempre: las
 * mancuernas de gimnasio suelen ir de 2 en 2, las máquinas de placas de 5 en
 * 5, y las kettlebells saltan de 4 en 4. Además hace que subir el peso en
 * elevaciones laterales sea un salto enorme y en peso muerto, ridículo.
 */
export const WEIGHT_INCREMENT: Record<Equipment, number> = {
  barbell: 2.5, // dos discos de 1.25 por lado
  dumbbell: 2, // el par sube de 2 en 2 en la mayoría de los racks
  machine: 5, // placa típica
  cable: 2.5,
  kettlebell: 4, // 8, 12, 16, 20…
  band: 1,
  bodyweight: 1, // lastre, si se usa
  other: 2.5,
}

/**
 * Mínimo que se puede cargar de verdad con ese equipo. Sirve para no sugerir
 * nunca un peso imposible (ni 0) a alguien sin historial: una barra vacía ya
 * pesa 20 kg, y no existe la placa de 1 kg en una máquina.
 */
export const MIN_LOAD_KG: Record<Equipment, number> = {
  barbell: 20, // barra olímpica vacía
  dumbbell: 2,
  machine: 5,
  cable: 2.5,
  kettlebell: 4,
  band: 0,
  bodyweight: 0,
  other: 0,
}

/** Equipos donde el peso no aplica: se registran solo con repeticiones. */
export function isBodyweight(equipment: Equipment): boolean {
  return equipment === 'bodyweight' || equipment === 'band'
}

/** Redondea al múltiplo cargable más cercano, con piso en el mínimo real. */
export function roundToLoadable(kg: number, equipment: Equipment): number {
  const step = WEIGHT_INCREMENT[equipment]
  const min = MIN_LOAD_KG[equipment]
  const rounded = Math.round(kg / step) * step
  return Math.round(Math.max(min, rounded) * 10) / 10
}
