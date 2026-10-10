import { Play, Plus } from 'lucide-react'

/**
 * Acción de un día de rutina: "Entrenar", o "Agregar" si el día no tiene
 * ejercicios. Un día vacío se ofrecía igual y creaba un entreno sin series que
 * quedaba "en curso" (los "ejercicios fantasma" que reportaron los testers).
 * Un solo componente para la hoja de días, el mazo y la lista plana.
 */
export default function DayAction({
  isEmpty,
  onTrain,
  onAdd,
}: {
  /** `true` solo cuando ya se sabe que no tiene ejercicios (no mientras carga). */
  isEmpty: boolean
  onTrain: () => void
  onAdd: () => void
}) {
  return isEmpty ? (
    <button
      onClick={onAdd}
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-sm bg-fill px-3.5 text-[13px] font-semibold text-ink active:bg-fill-2"
    >
      <Plus size={14} /> Agregar ejercicios
    </button>
  ) : (
    <button
      onClick={onTrain}
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-sm bg-accent px-3.5 text-[13px] font-bold text-bg active:bg-accent-dim"
    >
      <Play size={13} fill="currentColor" /> Entrenar
    </button>
  )
}

/** "3 ejercicios" / "Sin ejercicios", para la fila del día. */
export function dayCountLabel(count: number | undefined): string | null {
  if (count === undefined) return null
  if (count === 0) return 'Sin ejercicios'
  return `${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`
}
