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
import { Card, EmptyState, Row } from '@/components/ui/Card'
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

      {(routines ?? []).map((routine) => {
        const routineDays = days
          .filter((d) => d.routineId === routine.id)
          .sort((a, b) => a.dayOrder - b.dayOrder)
        return (
          <Card
            key={routine.id}
            className={cn(routine.isActive === 1 && 'ring-1 ring-accent/50')}
          >
            <Row>
              <button
                onClick={() => navigate(`/rutina/${routine.id}`)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: routine.color }}
                />
                <span className="truncate font-semibold">{routine.name}</span>
              </button>
              <div className="flex shrink-0">
                <button
                  onClick={() => setSharing(routine)}
                  aria-label="Compartir por QR"
                  className="flex h-11 w-9 items-center justify-center text-ink-3"
                >
                  <QrCode size={18} />
                </button>
                <button
                  onClick={() => userId && setActiveRoutine(userId, routine.id)}
                  aria-label="Marcar como rutina favorita"
                  className={cn(
                    'flex h-11 w-9 items-center justify-center',
                    routine.isActive === 1 ? 'text-accent' : 'text-ink-3'
                  )}
                >
                  <Star size={18} fill={routine.isActive === 1 ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar la rutina "${routine.name}"?`)) {
                      deleteRoutine(routine.id)
                    }
                  }}
                  aria-label="Eliminar rutina"
                  className="flex h-11 w-9 items-center justify-center text-ink-3"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Row>

            {routineDays.map((day) => (
              <Row key={day.id}>
                <span className={cn('min-w-0 flex-1 truncate text-[14px]', day.isRest === 1 && 'text-ink-3')}>
                  {day.name}
                  {day.isRest === 1 && ' · descanso'}
                </span>
                {day.isRest === 0 && (
                  <button
                    onClick={() => handleTrain(day.id)}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-xs bg-accent px-3 text-[13px] font-bold text-bg"
                  >
                    <Play size={13} fill="currentColor" /> Entrenar
                  </button>
                )}
              </Row>
            ))}
          </Card>
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
        <EmptyState
          icon={<Calendar size={32} />}
          title="Todavía no tenés rutinas"
          description="Armá tu rutina por días, agregá ejercicios estilo playlist y arrancá cada entreno con un tap."
        />
      )}
    </div>
  )
}
