import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calendar, ScanLine, Sparkles } from 'lucide-react'
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rutinas</h1>
        <button
          onClick={() => setScanning(true)}
          className="flex h-11 items-center gap-1.5 rounded-sm border border-line-2 px-3 text-sm font-medium text-ink-2 active:bg-surface"
        >
          <ScanLine size={16} /> Escanear QR
        </button>
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
        onTrain={handleTrain}
        onEdit={(routine) => navigate(`/rutina/${routine.id}`)}
        onShare={setSharing}
        onToggleFavorite={(routineId) => userId && setActiveRoutine(userId, routineId)}
        onDelete={handleDelete}
      />

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
