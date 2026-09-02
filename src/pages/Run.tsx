import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Lock, LockOpen, MapPin, Pause, Play, Square, X } from 'lucide-react'
import { db } from '@/db/schema'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useRunStore, type RunTarget } from '@/stores/runStore'
import { startWatch, type GeoWatch } from '@/lib/geo'
import {
  currentPaceSecPerKm,
  formatDistanceKm,
  formatPace,
  formatRunHms,
  formatRunNotes,
  summarizeRun,
} from '@/lib/run'
import { hapticSuccess, hapticTick } from '@/lib/native'
import { uid } from '@/lib/utils'
import { toast } from '@/stores/toastStore'
import HoldButton from '@/components/ui/HoldButton'
import NumberStepper from '@/components/ui/NumberStepper'
import RunPermissionGate from '@/components/gym/RunPermissionGate'
import RunSplits from '@/components/gym/RunSplits'

const RunMap = lazy(() => import('@/components/gym/RunMap'))

type Phase = 'permission' | 'setup' | 'active' | 'summary'

export default function Run() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const reduced = useReducedMotion()
  const profile = useLiveQuery(() => (userId ? db.profile.get(userId) : undefined), [userId])

  const session = useRunStore((s) => s.session)
  const startRun = useRunStore((s) => s.start)
  const addPoint = useRunStore((s) => s.addPoint)
  const pauseRun = useRunStore((s) => s.pause)
  const resumeRun = useRunStore((s) => s.resume)
  const endRun = useRunStore((s) => s.end)
  const discardRun = useRunStore((s) => s.discard)
  const startWorkout = useWorkoutStore((s) => s.startWorkout)
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout)
  const discardWorkout = useWorkoutStore((s) => s.discardWorkout)

  // Si ya había una sesión (recarga a mitad de salida), entra directo a activa.
  const [phase, setPhase] = useState<Phase>(session ? 'active' : 'permission')
  const [hasFix, setHasFix] = useState(false)
  const [locked, setLocked] = useState(false)
  const [targetKind, setTargetKind] = useState<'none' | 'distance' | 'time'>('none')
  const [targetDistanceKm, setTargetDistanceKm] = useState(5)
  const [targetTimeMin, setTargetTimeMin] = useState(30)
  const [savedSummary, setSavedSummary] = useState<ReturnType<typeof summarizeRun> | null>(null)
  const [savedPoints, setSavedPoints] = useState<{ lat: number; lng: number; t: number }[]>([])

  const watchRef = useRef<GeoWatch | null>(null)

  // Un solo watcher para setup + active. onFix guarda el fix y, si la sesión
  // está corriendo, lo agrega al recorrido.
  useEffect(() => {
    if (phase !== 'setup' && phase !== 'active') return
    if (watchRef.current) return
    let cleared = false
    startWatch((fix) => {
      setHasFix(true)
      if (useRunStore.getState().session?.status === 'active') addPoint(fix)
    }).then((w) => {
      if (cleared) w.clear()
      else watchRef.current = w
    })
    return () => {
      cleared = true
      watchRef.current?.clear()
      watchRef.current = null
    }
  }, [phase, addPoint])

  const points = session?.points ?? []
  // Recalcula por cantidad de puntos (un fix cada 1-5 s): resumir unos miles
  // de puntos es < 5 ms, no hace falta throttle extra.
  const live = useMemo(
    () => summarizeRun(points, profile?.bodyWeightKg),
    [points.length, profile?.bodyWeightKg]
  )
  const currentPace = useMemo(() => currentPaceSecPerKm(points), [points.length])

  // Ticker de 1 s para el reloj (los fixes no llegan cada segundo).
  const [, setTick] = useState(0)
  useEffect(() => {
    if (phase !== 'active') return
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  const elapsedSec = session ? (Date.now() - new Date(session.startedAt).getTime()) / 1000 : 0

  // Objetivo alcanzado → háptico una vez.
  const target: RunTarget | null = session?.target ?? null
  const targetProgress = target
    ? Math.min(1, (target.kind === 'distance' ? live.distanceM : elapsedSec) / target.value)
    : 0
  const targetReached = target ? targetProgress >= 1 : false
  const reachedFired = useRef(false)
  useEffect(() => {
    if (targetReached && !reachedFired.current) {
      reachedFired.current = true
      hapticSuccess()
      toast.success('Objetivo cumplido', 'Podés seguir o terminar cuando quieras.')
    }
  }, [targetReached])

  const buildTarget = (): RunTarget | null => {
    if (targetKind === 'distance') return { kind: 'distance', value: targetDistanceKm * 1000 }
    if (targetKind === 'time') return { kind: 'time', value: targetTimeMin * 60 }
    return null
  }

  const handleStart = useCallback(async () => {
    if (!userId) return
    const workoutId = await startWorkout(userId, 'Salida a correr')
    startRun(workoutId, buildTarget())
    setPhase('active')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, startWorkout, startRun, targetKind, targetDistanceKm, targetTimeMin])

  const handleFinish = async () => {
    if (!userId || !session) return
    const summary = summarizeRun(session.points, profile?.bodyWeightKg)
    watchRef.current?.clear()
    watchRef.current = null
    await finishWorkout(userId, session.workoutId, formatRunNotes(summary))
    await db.runs.add({
      id: uid(),
      userId,
      workoutId: session.workoutId,
      startedAt: session.startedAt,
      finishedAt: new Date().toISOString(),
      route: session.points,
      summary: {
        distanceM: summary.distanceM,
        durationSec: summary.durationSec,
        movingSec: summary.movingSec,
        avgPaceSecPerKm: summary.avgPaceSecPerKm,
        avgSpeedMs: summary.avgSpeedMs,
        maxSpeedMs: summary.maxSpeedMs,
        elevationGainM: summary.elevationGainM,
        elevationLossM: summary.elevationLossM,
        bestSplitSecPerKm: summary.bestSplitSecPerKm,
        kcal: summary.kcal,
      },
      target: session.target ?? undefined,
      // updatedAt / dirty los sella el hook de syncHooks
    } as never)
    setSavedSummary(summary)
    setSavedPoints(session.points)
    endRun()
    setPhase('summary')
  }

  const handleCancel = async () => {
    watchRef.current?.clear()
    watchRef.current = null
    if (session) await discardWorkout(session.workoutId)
    discardRun()
    navigate('/')
  }

  // ── Render por fase ──────────────────────────────────────────────────────

  if (phase === 'permission') {
    return (
      <RunPermissionGate onGranted={() => setPhase('setup')} onCancel={() => navigate('/')} />
    )
  }

  if (phase === 'setup') {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/')}
          aria-label="Cerrar"
          className="flex h-11 w-11 items-center justify-center self-start text-ink-3"
        >
          <X size={24} />
        </button>

        <div className="flex flex-1 flex-col justify-center gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Salir a correr</h1>
            <p
              className={hasFix ? 'text-[14px] text-success' : 'flex items-center gap-1.5 text-[14px] text-ink-3'}
            >
              <MapPin size={14} /> {hasFix ? 'Señal de GPS lista' : 'Buscando señal de GPS…'}
            </p>
          </div>

          <div className="space-y-3 rounded-xl bg-surface-2 p-4">
            <p className="text-[14px] font-semibold">Objetivo (opcional)</p>
            <div className="flex gap-2">
              {(['none', 'distance', 'time'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setTargetKind(k)}
                  className={
                    'h-10 flex-1 rounded-full text-[13px] font-medium transition-colors ' +
                    (targetKind === k ? 'bg-accent text-bg' : 'bg-fill text-ink-2 active:bg-fill-2')
                  }
                >
                  {k === 'none' ? 'Libre' : k === 'distance' ? 'Distancia' : 'Tiempo'}
                </button>
              ))}
            </div>
            {targetKind === 'distance' && (
              <NumberStepper label="km" value={targetDistanceKm} step={0.5} min={1} max={50} decimals={1} onChange={setTargetDistanceKm} />
            )}
            {targetKind === 'time' && (
              <NumberStepper label="min" value={targetTimeMin} step={5} min={5} max={240} onChange={setTargetTimeMin} />
            )}
          </div>
        </div>

        <HoldButton
          onComplete={handleStart}
          holdDuration={500}
          className="card-shine flex w-full flex-col items-center gap-0.5 rounded-2xl bg-accent py-4 font-bold text-bg active:bg-accent-dim"
        >
          <span className="flex items-center gap-2 text-lg">
            <Play size={20} fill="currentColor" /> Empezar
          </span>
          <span className="text-[12px] font-semibold opacity-70">Mantené presionado</span>
        </HoldButton>
      </div>
    )
  }

  if (phase === 'summary' && savedSummary) {
    const s = savedSummary
    return (
      <div className="mx-auto min-h-screen max-w-md px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Salida guardada</h1>
          <button onClick={() => navigate('/')} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center text-ink-3">
            <X size={24} />
          </button>
        </div>

        {savedPoints.length > 1 && (
          <Suspense fallback={<div className="mt-4 h-56 rounded-xl bg-surface-2" />}>
            <RunMap points={savedPoints} className="mt-4 h-56 w-full overflow-hidden rounded-xl" />
          </Suspense>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Distancia" value={`${formatDistanceKm(s.distanceM)} km`} />
          <Stat label="Tiempo" value={formatRunHms(s.durationSec)} />
          <Stat label="Ritmo prom." value={s.avgPaceSecPerKm ? `${formatPace(s.avgPaceSecPerKm)} /km` : '—'} />
          <Stat label="Mejor km" value={s.bestSplitSecPerKm ? `${formatPace(s.bestSplitSecPerKm)} /km` : '—'} />
          <Stat label="Desnivel +" value={`${s.elevationGainM} m`} />
          <Stat label="Calorías" value={s.kcal != null ? `${s.kcal}` : '—'} />
        </div>

        {s.splits.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold text-ink-2">Parciales por km</p>
            <RunSplits splits={s.splits} />
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="mt-6 h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg active:bg-accent-dim"
        >
          Listo
        </button>
      </div>
    )
  }

  // ── active ──────────────────────────────────────────────────────────────
  const paused = session?.status === 'paused'
  return (
    <div className="relative flex min-h-screen flex-col bg-bg px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setLocked((l) => !l)}
          aria-label={locked ? 'Desbloquear pantalla' : 'Bloquear pantalla'}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
        >
          {locked ? <Lock size={18} /> : <LockOpen size={18} />}
        </button>
        {!hasFix && <span className="text-[13px] text-warning">Sin señal de GPS</span>}
        <button
          onClick={handleCancel}
          disabled={locked}
          aria-label="Cancelar salida"
          className="flex h-11 w-11 items-center justify-center text-ink-3 disabled:opacity-30"
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-1">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={Math.floor(elapsedSec)}
            initial={reduced ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="font-mono font-bold leading-none tabular-nums text-ink"
            style={{ fontSize: 'clamp(52px, 16vw, 96px)' }}
          >
            {formatRunHms(elapsedSec)}
          </motion.span>
        </AnimatePresence>
        <p className="font-mono text-3xl font-semibold tabular-nums text-accent">
          {formatDistanceKm(live.distanceM)} km
        </p>
        <p className="text-sm text-ink-3">
          {currentPace ? `${formatPace(currentPace)} /km` : '— /km'}
          {live.avgPaceSecPerKm ? ` · prom. ${formatPace(live.avgPaceSecPerKm)}` : ''}
        </p>

        {target && (
          <div className="mt-3 w-full max-w-[280px]">
            <div className="h-1 overflow-hidden rounded-full bg-fill">
              <div
                className="h-full origin-left rounded-full bg-accent"
                style={{ transform: `scaleX(${targetProgress})`, transition: 'transform 1s linear' }}
              />
            </div>
            <p className="mt-1.5 text-center text-[13px] text-ink-3">
              {targetReached
                ? 'Objetivo cumplido'
                : target.kind === 'distance'
                  ? `Faltan ${formatDistanceKm(target.value - live.distanceM)} km`
                  : `Faltan ${formatRunHms(Math.max(0, target.value - elapsedSec))}`}
            </p>
          </div>
        )}
      </div>

      <Suspense fallback={<div className="h-36 rounded-xl bg-surface-2" />}>
        {points.length > 1 && (
          <RunMap points={points} interactive={false} className="h-36 w-full overflow-hidden rounded-xl" />
        )}
      </Suspense>

      {live.splits.length > 0 && (
        <div className="mt-3 max-h-28 overflow-y-auto">
          <RunSplits splits={live.splits} />
        </div>
      )}

      {!locked && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              hapticTick()
              paused ? resumeRun() : pauseRun()
            }}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-fill text-lg font-bold text-ink active:bg-fill-2"
          >
            {paused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
            {paused ? 'Reanudar' : 'Pausar'}
          </button>
          <HoldButton
            onComplete={handleFinish}
            holdDuration={600}
            className="flex h-14 flex-1 flex-col items-center justify-center rounded-2xl bg-accent font-bold text-bg active:bg-accent-dim"
          >
            <span className="flex items-center gap-2 text-lg">
              <Square size={18} fill="currentColor" /> Terminar
            </span>
            <span className="text-[11px] font-semibold opacity-70">Mantené</span>
          </HoldButton>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}
