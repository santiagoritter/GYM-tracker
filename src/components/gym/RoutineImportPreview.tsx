import { useLiveQuery } from 'dexie-react-hooks'
import { OverlayCloseButton } from '@/components/ui/FullScreenOverlay'
import { db } from '@/db/schema'
import type { QRPayload } from '@/lib/qr'

/** Vista previa antes de confirmar la importación — compartida entre el
 * escaneo con cámara/pegado dentro de la app (QRScanner.tsx) y la página
 * de deep-link (/importar/:code, ImportRoutine.tsx) que se abre cuando el
 * QR se escanea con la cámara nativa del celular en vez de la de acá. */
export function RoutineImportPreview({
  payload,
  name,
  onNameChange,
  onImport,
  onClose,
}: {
  payload: QRPayload
  name: string
  onNameChange: (name: string) => void
  onImport: () => void
  onClose: () => void
}) {
  const totalExercises = payload.d.reduce((sum, d) => sum + (d.e?.length ?? 0), 0)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-1">
        <h2 className="text-lg font-bold">Importar rutina</h2>
        <OverlayCloseButton onClick={onClose} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-lg bg-surface px-3 py-2.5 font-semibold outline-none focus:ring-1 focus:ring-accent"
        />
        <p className="text-sm text-ink-2">
          {payload.d.length} días · {totalExercises} ejercicios
        </p>

        {payload.d.map((day, i) => (
          <div key={`${i}-${day.n}`} className="rounded-xl bg-surface p-4">
            <p className="font-semibold">
              {day.n}
              {day.r && <span className="ml-2 text-xs text-ink-3">descanso</span>}
            </p>
            {day.e && day.e.length > 0 && (
              <ul className="mt-2 space-y-1">
                {day.e.map((ex, j) => (
                  <li key={j} className="flex justify-between text-sm text-ink-2">
                    <ExerciseName id={ex.id} />
                    <span className="font-mono">
                      {ex.s}×{ex.r[0]}–{ex.r[1]}
                      {ex.w ? ` · ${ex.w}kg` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-line px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button onClick={onClose} className="h-14 flex-1 rounded-md bg-fill font-semibold text-ink active:bg-fill-2">
          Cancelar
        </button>
        <button onClick={onImport} className="h-14 flex-[1.6] rounded-md bg-accent font-bold text-bg active:bg-accent-dim">
          Importar rutina
        </button>
      </div>
    </div>
  )
}

function ExerciseName({ id }: { id: string }) {
  const exercise = useLiveQuery(() => db.exercises.get(id), [id])
  return <span>{exercise?.name ?? `(desconocido: ${id})`}</span>
}
