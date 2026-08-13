import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, Music, Pause, Play, SkipBack, SkipForward, Square, X } from 'lucide-react'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useElapsedDuration } from '@/hooks/useElapsedDuration'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useCardioStore } from '@/stores/cardioStore'
import { useSpotifyStore } from '@/stores/spotifyStore'
import { CARDIO_MACHINES, cardioMachine, currentDistanceKm, formatCardioNotes, type CardioMachineId } from '@/lib/cardio'
import { fetchPlaybackState, sendPlaybackCommand, type PlaybackResult } from '@/lib/spotifyPlayer'
import { hapticTick } from '@/lib/native'
import { nowIso, cn } from '@/lib/utils'
import HoldButton from '@/components/ui/HoldButton'
import NumberStepper from '@/components/ui/NumberStepper'
import { Card } from '@/components/ui/Card'

const SPOTIFY_POLL_MS = 5000

function isPlaybackState(x: PlaybackResult | 'loading'): x is Exclude<PlaybackResult, string> {
  return typeof x === 'object' && x !== null
}

/**
 * Modo cardio: pantalla completa (fuera de AppShell, mismo criterio que
 * Workout.tsx) para caminadora/bici/elíptica. Arranca en `setup` (elegir
 * aparato, velocidad, inclinación), pasa a `active` (pantalla negra,
 * contador grande, distancia en vivo, Spotify, finalizar). Cuenta como un
 * Workout más (reusa startWorkout/finishWorkout de workoutStore, sin
 * WorkoutSets) para que sume a racha/calendario/historial — el resumen
 * (aparato, distancia, ritmo) se guarda en Workout.notes, no hace falta
 * columnas nuevas en Postgres para un solo texto.
 */
export default function Cardio() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const reduced = useReducedMotion()
  const startWorkout = useWorkoutStore((s) => s.startWorkout)
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout)
  const discardWorkout = useWorkoutStore((s) => s.discardWorkout)
  const session = useCardioStore((s) => s.session)
  const startSession = useCardioStore((s) => s.startSession)
  const setSpeed = useCardioStore((s) => s.setSpeed)
  const setIncline = useCardioStore((s) => s.setIncline)
  const endSession = useCardioStore((s) => s.endSession)

  const [phase, setPhase] = useState<'setup' | 'active'>('setup')
  const [machineId, setMachineId] = useState<CardioMachineId>('treadmill')
  const [setupSpeed, setSetupSpeed] = useState(6)
  const [setupIncline, setSetupIncline] = useState(1)
  const [startedAt, setStartedAt] = useState<string | null>(null)

  const machine = cardioMachine(machineId)
  const elapsed = useElapsedDuration(startedAt ?? undefined)

  const spotifyConnected = useSpotifyStore((s) => Boolean(s.accessToken))
  const [playback, setPlayback] = useState<PlaybackResult | 'loading'>('loading')

  useEffect(() => {
    if (!spotifyConnected || phase !== 'active') return
    let cancelled = false
    const poll = () => {
      fetchPlaybackState().then((r) => {
        if (!cancelled) setPlayback(r)
      })
    }
    poll()
    const interval = setInterval(poll, SPOTIFY_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [spotifyConnected, phase])

  const handleStart = async () => {
    if (!userId) return
    const workoutId = await startWorkout(userId, `Cardio · ${machine.label}`)
    startSession(workoutId, machineId, machine.hasSpeed ? setupSpeed : 0, setupIncline)
    setStartedAt(nowIso())
    setPhase('active')
  }

  const handleFinish = async () => {
    if (!userId || !session) return
    const { distanceKm } = endSession()
    const durationSec = startedAt ? (Date.now() - new Date(startedAt).getTime()) / 1000 : 0
    await finishWorkout(userId, session.workoutId, formatCardioNotes(machine, distanceKm, durationSec))
    navigate('/')
  }

  const handleCancel = async () => {
    if (!session) return
    endSession()
    await discardWorkout(session.workoutId)
    navigate('/')
  }

  const runCommand = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    hapticTick()
    if (action === 'play' || action === 'pause') {
      setPlayback((prev) => (isPlaybackState(prev) ? { ...prev, isPlaying: action === 'play' } : prev))
    }
    await sendPlaybackCommand(action)
  }

  if (phase === 'setup') {
    return (
      <div className="mx-auto flex min-h-screen content-width flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-6">
        <button
          onClick={() => navigate('/')}
          aria-label="Volver"
          className="mb-4 flex h-11 w-11 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>

        <h1 className="mb-1 text-2xl font-bold">Modo cardio</h1>
        <p className="mb-6 text-sm text-ink-2">Elegí el aparato y arrancá cuando estés listo.</p>

        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold text-ink-2">Aparato</p>
          <div className="mb-5 flex flex-wrap gap-2">
            {CARDIO_MACHINES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMachineId(m.id)}
                className={cn(
                  'flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors',
                  machineId === m.id ? 'bg-accent text-bg' : 'bg-fill text-ink-2 active:bg-fill-2'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {machine.hasSpeed && (
            <div className="mb-4">
              <NumberStepper
                label="Velocidad (km/h)"
                value={setupSpeed}
                step={0.5}
                min={0.5}
                max={30}
                decimals={1}
                onChange={setSetupSpeed}
              />
            </div>
          )}

          {machine.hasIncline && (
            <NumberStepper
              label="Inclinación (%)"
              value={setupIncline}
              step={0.5}
              min={0}
              max={15}
              decimals={1}
              onChange={setSetupIncline}
            />
          )}

          {!machine.hasSpeed && (
            <p className="text-[13px] text-ink-3">
              Este aparato no calcula distancia — el modo cardio va a cronometrar la sesión igual.
            </p>
          )}
        </Card>

        <div className="flex-1" />

        <HoldButton
          onComplete={handleStart}
          holdDuration={500}
          className="card-shine flex w-full flex-col items-center gap-0.5 rounded-2xl bg-accent py-5 font-bold text-bg active:bg-accent-dim"
        >
          <span className="flex items-center gap-2 text-lg">
            <Play size={22} fill="currentColor" /> Comenzar
          </span>
          <span className="text-[13px] font-semibold opacity-70">Mantené presionado</span>
        </HoldButton>
      </div>
    )
  }

  const distanceKm = session
    ? currentDistanceKm(session.distanceAtCheckpointKm, session.speedKmh, session.checkpointAt)
    : 0

  return (
    <div className="flex min-h-screen flex-col bg-bg px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <button
        onClick={handleCancel}
        aria-label="Cancelar sesión"
        className="flex h-11 w-11 items-center justify-center self-start text-ink-3"
      >
        <X size={24} />
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-1">
        <p className="text-sm font-medium text-ink-3">{machine.label}</p>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={elapsed}
            initial={reduced ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="font-mono text-[72px] font-bold leading-none tabular-nums text-ink"
          >
            {elapsed}
          </motion.span>
        </AnimatePresence>

        {machine.hasSpeed && (
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-accent">
            {distanceKm.toFixed(2)} km
          </p>
        )}
      </div>

      {(machine.hasSpeed || machine.hasIncline) && (
        <div className="mb-6 flex gap-3">
          {machine.hasSpeed && (
            <div className="flex-1">
              <NumberStepper
                label="km/h"
                value={session?.speedKmh ?? 0}
                step={0.5}
                min={0}
                max={30}
                decimals={1}
                onChange={setSpeed}
              />
            </div>
          )}
          {machine.hasIncline && (
            <div className="flex-1">
              <NumberStepper
                label="Inclinación %"
                value={session?.inclinePct ?? 0}
                step={0.5}
                min={0}
                max={15}
                decimals={1}
                onChange={setIncline}
              />
            </div>
          )}
        </div>
      )}

      {spotifyConnected && isPlaybackState(playback) && (
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-center">
            <Music size={16} className="shrink-0 text-ink-3" />
            <p className="max-w-[220px] truncate text-sm text-ink-2">
              {playback.trackName} · {playback.artistName}
            </p>
          </div>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => runCommand('previous')}
              aria-label="Anterior"
              className="flex h-14 w-14 items-center justify-center text-ink-2 active:text-ink"
            >
              <SkipBack size={26} fill="currentColor" />
            </button>
            <button
              onClick={() => runCommand(playback.isPlaying ? 'pause' : 'play')}
              aria-label={playback.isPlaying ? 'Pausar' : 'Reproducir'}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-fill text-ink active:bg-fill-2"
            >
              {playback.isPlaying ? (
                <Pause size={28} fill="currentColor" />
              ) : (
                <Play size={28} fill="currentColor" />
              )}
            </button>
            <button
              onClick={() => runCommand('next')}
              aria-label="Siguiente"
              className="flex h-14 w-14 items-center justify-center text-ink-2 active:text-ink"
            >
              <SkipForward size={26} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      <HoldButton
        onComplete={handleFinish}
        holdDuration={500}
        className="flex w-full flex-col items-center gap-0.5 rounded-2xl bg-fill py-5 font-bold text-ink active:bg-fill-2"
      >
        <span className="flex items-center gap-2 text-lg">
          <Square size={20} fill="currentColor" /> Finalizar entreno
        </span>
        <span className="text-[13px] font-semibold opacity-70">Mantené presionado</span>
      </HoldButton>
    </div>
  )
}
