import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calendar, Play, QrCode, ScanLine, Sparkles, Star, Trash2 } from 'lucide-react'
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
import type { Routine } from '@/types'
import { cn } from '@/lib/utils'

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
          className="flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-2 text-sm font-medium text-ink-2 active:bg-surface"
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
            className="flex-1 rounded-lg bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent placeholder:text-ink-3"
          />
          <button
            onClick={handleCreate}
            className="rounded-lg bg-accent px-4 font-semibold text-bg"
          >
            Crear
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setCreating(true)}
            className="flex-1 rounded-2xl border border-dashed border-line-2 py-4 font-semibold text-ink-2 active:bg-surface"
          >
            + Nueva rutina
          </button>
          <button
            onClick={() => setPickingTemplate(true)}
            className="flex items-center gap-1.5 rounded-2xl border border-line-2 px-4 font-semibold text-ink-2 active:bg-surface"
          >
            <Sparkles size={16} /> Clásicas
          </button>
        </div>
      )}

      {(routines ?? []).map((routine) => {
        const routineDays = days
          .filter((d) => d.routineId === routine.id)
          .sort((a, b) => a.dayOrder - b.dayOrder)
        return (
          <div
            key={routine.id}
            className={cn(
              'rounded-2xl bg-surface p-4',
              routine.isActive === 1 && 'ring-1 ring-accent/50'
            )}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(`/rutina/${routine.id}`)}
                className="flex items-center gap-2 text-left"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: routine.color }}
                />
                <span className="font-semibold">{routine.name}</span>
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => setSharing(routine)}
                  className="rounded-lg p-2 text-ink-3"
                  title="Compartir por QR"
                >
                  <QrCode size={18} />
                </button>
                <button
                  onClick={() => userId && setActiveRoutine(userId, routine.id)}
                  className={cn(
                    'rounded-lg p-2',
                    routine.isActive === 1 ? 'text-accent' : 'text-ink-3'
                  )}
                  title="Marcar como rutina activa"
                >
                  <Star size={18} fill={routine.isActive === 1 ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar la rutina "${routine.name}"?`)) {
                      deleteRoutine(routine.id)
                    }
                  }}
                  className="rounded-lg p-2 text-ink-3"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {routineDays.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
                >
                  <span className={cn('text-sm', day.isRest === 1 && 'text-ink-3')}>
                    {day.name}
                    {day.isRest === 1 && ' · descanso'}
                  </span>
                  {day.isRest === 0 && (
                    <button
                      onClick={() => handleTrain(day.id)}
                      className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-bold text-bg"
                    >
                      <Play size={12} fill="currentColor" /> Entrenar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

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
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-10 text-center">
          <Calendar size={40} className="text-ink-3" />
          <p className="text-sm text-ink-2">
            Armá tu rutina por días, agregá ejercicios estilo playlist y arrancá cada
            entreno con un tap.
          </p>
        </div>
      )}
    </div>
  )
}
