import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useSpotifyStore } from '@/stores/spotifyStore'
import {
  fetchPlaybackState,
  sendPlaybackCommand,
  type PlaybackResult,
  type PlaybackState,
} from '@/lib/spotifyPlayer'
import { hapticTick } from '@/lib/native'
import { toast } from '@/stores/toastStore'
import { Card, Row } from '@/components/ui/Card'

const POLL_MS = 5000
// Spotify reporta el dispositivo como inactivo (204) casi al instante
// después de pausar, mucho antes de que realmente se haya "ido" —
// un solo 204 no alcanza para dar la sesión por perdida, si no la
// fila parpadeaba a "abrí Spotify" cada vez que alguien pausaba unos
// segundos. Hacen falta dos confirmaciones seguidas.
const NO_DEVICE_CONFIRM_THRESHOLD = 2

function isPlaybackState(x: PlaybackResult | 'loading'): x is PlaybackState {
  return typeof x === 'object' && x !== null
}

/**
 * Control remoto de lo que suena en Spotify — nunca reproduce audio
 * acá adentro, solo lee/comanda un dispositivo que ya está sonando
 * (ver spotifyPlayer.ts). Fila opt-in, mismo criterio que
 * CalorieSummaryRow: si no hay sesión de Spotify, no ocupa lugar.
 */
export default function SpotifyNowPlaying() {
  const navigate = useNavigate()
  const accessToken = useSpotifyStore((s) => s.accessToken)
  const [state, setState] = useState<PlaybackResult | 'loading'>('loading')
  const [controlsDisabled, setControlsDisabled] = useState(false)
  const noDeviceStreak = useRef(0)

  // Solo cierra sobre refs y setState (ambos con identidad estable) —
  // useCallback con deps vacías la vuelve segura de meter en el efecto
  // de abajo sin que dispare un re-arranque del interval en cada render.
  const applyResult = useCallback((result: PlaybackResult) => {
    if (result === 'error') return
    if (result !== 'no-device') {
      noDeviceStreak.current = 0
      setState(result)
      return
    }
    noDeviceStreak.current += 1
    setState((prev) =>
      isPlaybackState(prev) && noDeviceStreak.current < NO_DEVICE_CONFIRM_THRESHOLD
        ? prev
        : 'no-device'
    )
  }, [])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    const poll = async () => {
      if (document.hidden) return
      const result = await fetchPlaybackState()
      if (cancelled) return
      applyResult(result)
    }

    poll()
    const interval = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [accessToken, applyResult])

  // 'error' nunca se guarda en el poll (ver arriba) — este chequeo es
  // solo para que TypeScript termine de angostar el tipo a PlaybackState.
  if (!accessToken || state === 'loading' || state === 'error') return null

  if (state === 'reauth-required') {
    return (
      <Card>
        <Row onClick={() => navigate('/ajustes')}>
          <Music size={18} className="shrink-0 text-ink-3" />
          <span className="min-w-0 flex-1 text-[14px] text-ink-2">
            Reconectá Spotify en Ajustes para verlo acá
          </span>
        </Row>
      </Card>
    )
  }

  if (state === 'no-device') {
    return (
      <Card>
        <Row>
          <Music size={18} className="shrink-0 text-ink-3" />
          <span className="min-w-0 flex-1 text-[14px] text-ink-2">
            Abrí Spotify en tu teléfono o parlante para controlarlo acá
          </span>
        </Row>
      </Card>
    )
  }

  const playback = state

  const runCommand = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    hapticTick()
    if (action === 'play' || action === 'pause') {
      setState({ ...playback, isPlaying: action === 'play' })
    }
    const result = await sendPlaybackCommand(action)
    if (result === 'premium-required') {
      setControlsDisabled(true)
      toast.error('Necesitás Spotify Premium', 'Los controles de reproducción no están disponibles en cuentas gratuitas.')
      return
    }
    if (result === 'no-device') {
      toast.error('Sin dispositivo activo', 'Abrí Spotify en tu teléfono o parlante primero.')
      return
    }
    if (result === 'reauth-required') {
      setState('reauth-required')
      return
    }
    setTimeout(async () => {
      applyResult(await fetchPlaybackState())
    }, 400)
  }

  return (
    <Card>
      <Row className="gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-2">
          {playback.albumArtUrl ? (
            <img src={playback.albumArtUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music size={18} className="text-ink-3" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium">{playback.trackName}</p>
          <p className="truncate text-[13px] text-ink-3">{playback.artistName}</p>
        </div>
        {!controlsDisabled && (
          <div className="flex shrink-0 items-center">
            <button
              onClick={() => runCommand('previous')}
              aria-label="Anterior"
              className="flex h-11 w-11 items-center justify-center text-ink-2 active:text-ink"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              onClick={() => runCommand(playback.isPlaying ? 'pause' : 'play')}
              aria-label={playback.isPlaying ? 'Pausar' : 'Reproducir'}
              className="flex h-11 w-11 items-center justify-center text-ink active:text-ink-2"
            >
              {playback.isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
            </button>
            <button
              onClick={() => runCommand('next')}
              aria-label="Siguiente"
              className="flex h-11 w-11 items-center justify-center text-ink-2 active:text-ink"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
          </div>
        )}
      </Row>
    </Card>
  )
}
