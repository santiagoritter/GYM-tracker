import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Menu, Music, Pause, Play, SkipBack, SkipForward, Square, X } from 'lucide-react'
import { useElapsedDuration } from '@/hooks/useElapsedDuration'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useWorkoutStore } from '@/stores/workoutStore'
import { useCardioStore } from '@/stores/cardioStore'
import { useSpotifyStore } from '@/stores/spotifyStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { cardioMachine, currentDistanceKm, formatCardioNotes } from '@/lib/cardio'
import { fetchPlaybackState, sendPlaybackCommand, type PlaybackResult } from '@/lib/spotifyPlayer'
import { hapticTick } from '@/lib/native'
import { cn } from '@/lib/utils'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import NumberStepper from '@/components/ui/NumberStepper'
import HoldButton from '@/components/ui/HoldButton'

const SPOTIFY_POLL_MS = 5000

function isPlaybackState(x: PlaybackResult | 'loading'): x is Exclude<PlaybackResult, string> {
  return typeof x === 'object' && x !== null
}

/**
 * Pantalla completa del modo cardio (fuera de AppShell, mismo criterio que
 * Workout.tsx) — arranca directo en la vista activa, leyendo la sesión que
 * ya empezó CardioSetupSheet.tsx desde Inicio. Si se entra sin sesión
 * (refresh, link directo), vuelve a Inicio: no tiene sentido propio sin
 * el setup previo.
 */
export default function Cardio() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const reduced = useReducedMotion()
  const isLandscape = useMediaQuery('(orientation: landscape)')
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout)
  const discardWorkout = useWorkoutStore((s) => s.discardWorkout)
  const session = useCardioStore((s) => s.session)
  const setSpeed = useCardioStore((s) => s.setSpeed)
  const setIncline = useCardioStore((s) => s.setIncline)
  const endSession = useCardioStore((s) => s.endSession)
  const [adjustOpen, setAdjustOpen] = useState(false)

  useEffect(() => {
    if (!session) navigate('/', { replace: true })
  }, [session, navigate])

  const machine = cardioMachine(session?.machineId ?? 'treadmill')
  const elapsed = useElapsedDuration(session?.startedAt)

  const spotifyConnected = useSpotifyStore((s) => Boolean(s.accessToken))
  const [playback, setPlayback] = useState<PlaybackResult | 'loading'>('loading')

  useEffect(() => {
    if (!spotifyConnected) return
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
  }, [spotifyConnected])

  if (!session) return null

  const distanceKm = currentDistanceKm(session.distanceAtCheckpointKm, session.speedKmh, session.checkpointAt)
  const canAdjust = machine.hasSpeed || machine.hasIncline

  const handleFinish = async () => {
    if (!userId) return
    const { distanceKm: finalKm } = endSession()
    const durationSec = (Date.now() - new Date(session.startedAt).getTime()) / 1000
    await finishWorkout(userId, session.workoutId, formatCardioNotes(machine, finalKm, durationSec))
    navigate('/')
  }

  const handleCancel = async () => {
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

  const counter = (
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm font-medium text-ink-3">
        {machine.label}
        {machine.hasSpeed && ` · ${session.speedKmh.toFixed(1)} km/h`}
        {machine.hasIncline && session.inclinePct > 0 && ` · ${session.inclinePct.toFixed(1)}%`}
      </p>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={elapsed}
          initial={reduced ? undefined : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="font-mono font-bold leading-none tabular-nums text-ink"
          style={{ fontSize: 'clamp(56px, 17vw, 108px)' }}
        >
          {elapsed}
        </motion.span>
      </AnimatePresence>
      {machine.hasSpeed && (
        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-accent">
          {distanceKm.toFixed(2)} km
        </p>
      )}
    </div>
  )

  const controls = (
    <div className="flex w-full flex-col gap-5">
      {spotifyConnected ? (
        isPlaybackState(playback) && (
          <div className="flex flex-col items-center gap-3">
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
        )
      ) : (
        <button
          onClick={() => navigate('/ajustes')}
          className="flex items-center justify-center gap-2 rounded-xl bg-fill py-3 text-sm font-semibold text-ink-2 active:bg-fill-2"
        >
          <Music size={16} /> Conectar Spotify para manejar la música
        </button>
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

  return (
    <div
      className={cn(
        'relative flex min-h-screen flex-col bg-bg px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
        isLandscape && 'flex-row items-center gap-8 px-10'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          isLandscape ? 'absolute left-4 right-4 top-4' : 'w-full'
        )}
      >
        <button
          onClick={handleCancel}
          aria-label="Cancelar sesión"
          className="flex h-11 w-11 items-center justify-center text-ink-3"
        >
          <X size={24} />
        </button>
        {canAdjust && (
          <button
            onClick={() => setAdjustOpen(true)}
            aria-label="Ajustar velocidad e inclinación"
            className="flex h-11 w-11 items-center justify-center text-ink-3"
          >
            <Menu size={22} />
          </button>
        )}
      </div>

      {isLandscape ? (
        <>
          <div className="flex flex-1 items-center justify-center">{counter}</div>
          <div className="flex w-full max-w-xs flex-col justify-center">{controls}</div>
        </>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center">{counter}</div>
          <div className="mt-6">{controls}</div>
        </>
      )}

      {adjustOpen && (
        <ResponsiveSheet onClose={() => setAdjustOpen(false)}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-lg font-bold">Ajustar</h2>
            <button
              onClick={() => setAdjustOpen(false)}
              aria-label="Cerrar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-3 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
            {machine.hasSpeed && (
              <div className="flex-1">
                <NumberStepper
                  label="km/h"
                  value={session.speedKmh}
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
                  value={session.inclinePct}
                  step={0.5}
                  min={0}
                  max={15}
                  decimals={1}
                  onChange={setIncline}
                />
              </div>
            )}
          </div>
        </ResponsiveSheet>
      )}
    </div>
  )
}
