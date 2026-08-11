import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calendar, ScanLine, Search, Sparkles, Star } from 'lucide-react'
import { db } from '@/db/schema'
import { routinesFor, workoutsFor } from '@/db/scoped'
import {
  createRoutine,
  deleteRoutine,
  setActiveRoutine,
  startWorkoutFromDay,
} from '@/db/routines'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { Suspense, lazy } from 'react'
import { EmptyState } from '@/components/ui/Card'
import RoutineStack from '@/components/gym/RoutineStack'
import RoutinePickerSheet from '@/components/gym/RoutinePickerSheet'
import type { Routine } from '@/types'

// Lazy: qrcode + jsqr + lz-string solo se descargan al compartir/escanear
const QRShareModal = lazy(() =>
  import('@/components/gym/QRShareModal').then((m) => ({ default: m.QRShareModal }))
)
const QRScanner = lazy(() =>
  import('@/components/gym/QRScanner').then((m) => ({ default: m.QRScanner }))
)
// Lazy: las 6 plantillas con todos sus ejercicios son ~8KB que solo hacen
// falta si el usuario abre el selector.
const TemplatePicker = lazy(() => import('@/components/gym/TemplatePicker'))

export default function Routines() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [sharing, setSharing] = useState<Routine | null>(null)
  const [scanning, setScanning] = useState(false)
  const [pickingTemplate, setPickingTemplate] = useState(false)
  const [pickingRoutine, setPickingRoutine] = useState(false)
  // Qué rutina está al frente del mazo — vive acá (no en RoutineStack)
  // para que "volver a favorita" y el picker de búsqueda puedan saltar
  // directo a una posición, no solo avanzar de a una (Fase 4).
  const [frontIndex, setFrontIndex] = useState(0)

  const routines = useLiveQuery(
    () => (userId ? routinesFor(userId).filter((r) => r.isArchived === 0).toArray() : []),
    [userId]
  )
  const days = useLiveQuery(() => db.routineDays.toArray(), []) ?? []
  const activeWorkout = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => !w.finishedAt).first() : undefined),
    [userId]
  )

  const daysByRoutine = useMemo(() => {
    const map = new Map<string, typeof days>()
    for (const day of days) {
      const list = map.get(day.routineId) ?? []
      list.push(day)
      map.set(day.routineId, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.dayOrder - b.dayOrder)
    return map
  }, [days])

  const handleDelete = (routine: Routine) => {
    if (confirm(`¿Eliminar la rutina "${routine.name}"?`)) {
      deleteRoutine(routine.id)
    }
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed || !userId) return
    const id = await createRoutine(userId, trimmed)
    setName('')
    setCreating(false)
    navigate(`/rutina/${id}`)
  }

  const handleTrain = async (dayId: string) => {
    if (!userId) return
    if (activeWorkout) {
      navigate(`/entreno/${activeWorkout.id}`)
      return
    }
    const workoutId = await startWorkoutFromDay(userId, dayId)
    navigate(`/entreno/${workoutId}`)
  }

  // Salto directo (no round-robin como "Cambiar rutina") a la posición de
  // la rutina favorita en el mazo.
  const favoriteIndex = (routines ?? []).findIndex((r) => r.isActive === 1)

  const handleSelectFromPicker = (routine: Routine) => {
    const index = (routines ?? []).findIndex((r) => r.id === routine.id)
    if (index >= 0) setFrontIndex(index)
    setPickingRoutine(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rutinas</h1>
        <div className="flex items-center gap-2">
          {favoriteIndex >= 0 && (routines?.length ?? 0) > 1 && (
            <button
              onClick={() => setFrontIndex(favoriteIndex)}
              aria-label="Ir a la rutina favorita"
              className="flex h-11 w-11 items-center justify-center rounded-sm border border-line-2 text-accent active:bg-surface"
            >
              <Star size={16} fill="currentColor" />
            </button>
          )}
          {(routines?.length ?? 0) > 1 && (
            <button
              onClick={() => setPickingRoutine(true)}
              aria-label="Buscar rutina"
              className="flex h-11 w-11 items-center justify-center rounded-sm border border-line-2 text-ink-2 active:bg-surface"
            >
              <Search size={16} />
            </button>
          )}
          {/* Ícono solo, en línea con favorita/buscar (arriba) — con las
              tres juntas, un botón con texto largo aparte no entra
              cómodo en 393px de ancho. */}
          <button
            onClick={() => setScanning(true)}
            aria-label="Escanear QR"
            className="flex h-11 w-11 items-center justify-center rounded-sm border border-line-2 text-ink-2 active:bg-surface"
          >
            <ScanLine size={16} />
          </button>
        </div>
      </div>

      {creating ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Nombre de la rutina (ej: Push Pull Legs)"
            className="h-12 flex-1 rounded-sm bg-surface px-3 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-ink-3"
          />
          <button
            onClick={handleCreate}
            className="h-12 rounded-sm bg-accent px-4 font-semibold text-bg"
          >
            Crear
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setCreating(true)}
            className="h-14 flex-1 rounded-md border border-dashed border-line-2 font-semibold text-ink-2 active:bg-surface"
          >
            Nueva rutina
          </button>
          <button
            onClick={() => setPickingTemplate(true)}
            className="flex h-14 items-center gap-1.5 rounded-md border border-line-2 px-4 font-semibold text-ink-2 active:bg-surface"
          >
            <Sparkles size={16} /> Clásicas
          </button>
        </div>
      )}

      <RoutineStack
        routines={routines ?? []}
        daysByRoutine={daysByRoutine}
        frontIndex={frontIndex}
        onFrontIndexChange={setFrontIndex}
        onTrain={handleTrain}
        onEdit={(routine) => navigate(`/rutina/${routine.id}`)}
        onShare={setSharing}
        onToggleFavorite={(routineId) => userId && setActiveRoutine(userId, routineId)}
        onDelete={handleDelete}
      />

      {pickingRoutine && (
        <RoutinePickerSheet
          routines={routines ?? []}
          daysByRoutine={daysByRoutine}
          onSelect={handleSelectFromPicker}
          onClose={() => setPickingRoutine(false)}
        />
      )}

      <Suspense fallback={null}>
        {sharing && <QRShareModal routine={sharing} onClose={() => setSharing(null)} />}
        {scanning && <QRScanner onClose={() => setScanning(false)} />}
        {pickingTemplate && userId && (
          <TemplatePicker
            userId={userId}
            onClose={() => setPickingTemplate(false)}
            onImported={(routineId) => {
              setPickingTemplate(false)
              navigate(`/rutina/${routineId}`)
            }}
          />
        )}
      </Suspense>

      {routines?.length === 0 && !creating && (
        <EmptyState
          icon={<Calendar size={32} />}
          title="Todavía no tenés rutinas"
          description="Armá tu rutina por días, agregá ejercicios estilo playlist y arrancá cada entreno con un tap."
        />
      )}
    </div>
  )
}
