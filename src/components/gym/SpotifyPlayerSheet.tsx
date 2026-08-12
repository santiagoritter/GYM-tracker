import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ListMusic, Music, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import {
  fetchUserPlaylists,
  playContext,
  sendPlaybackCommand,
  type PlaybackState,
  type PlaylistsResult,
  type SpotifyPlaylist,
} from '@/lib/spotifyPlayer'
import { hapticTick } from '@/lib/native'
import { toast } from '@/stores/toastStore'
import Portal from '@/components/ui/Portal'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import {
  sheetItemVariants,
  sheetItemVariantsReduced,
  sheetPanelVariants,
  sheetPanelVariantsReduced,
} from '@/lib/motionVariants'
import { cn } from '@/lib/utils'

/**
 * Se abre al mantener presionada la fila de "sonando ahora" (ver
 * SpotifyNowPlaying.tsx) — mismo criterio que un reproductor completo:
 * los mismos controles de la fila pero más grandes, más la lista de
 * playlists propias para elegir qué suena. No reproduce audio acá adentro
 * (ver nota de spotifyPlayer.ts): solo comanda el dispositivo que ya está
 * sonando.
 */
export default function SpotifyPlayerSheet({
  playback,
  onClose,
}: {
  playback: PlaybackState
  onClose: () => void
}) {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const { panelDragProps, handleDragProps } = useSheetDrag(onClose)
  const [playlistsResult, setPlaylistsResult] = useState<PlaylistsResult | null>(null)
  const [loadingUri, setLoadingUri] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(playback.isPlaying)

  useEffect(() => {
    let cancelled = false
    fetchUserPlaylists().then((result) => {
      if (!cancelled) setPlaylistsResult(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const runCommand = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    hapticTick()
    if (action === 'play' || action === 'pause') setIsPlaying(action === 'play')
    const result = await sendPlaybackCommand(action)
    if (result === 'premium-required') {
      toast.error('Necesitás Spotify Premium', 'Los controles de reproducción no están disponibles en cuentas gratuitas.')
    } else if (result === 'no-device') {
      toast.error('Sin dispositivo activo', 'Abrí Spotify en tu teléfono o parlante primero.')
    }
  }

  const handlePlaylist = async (playlist: SpotifyPlaylist) => {
    hapticTick()
    setLoadingUri(playlist.uri)
    const result = await playContext(playlist.uri)
    setLoadingUri(null)
    if (result === 'ok') {
      setIsPlaying(true)
      toast.success('Reproduciendo', playlist.name)
    } else if (result === 'premium-required') {
      toast.error('Necesitás Spotify Premium', 'Elegir qué suena no está disponible en cuentas gratuitas.')
    } else if (result === 'no-device') {
      toast.error('Sin dispositivo activo', 'Abrí Spotify en tu teléfono o parlante primero.')
    } else {
      toast.error('No se pudo reproducir', 'Probá de nuevo en un momento.')
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm animate-glass-in" onClick={onClose} />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={reduced ? sheetPanelVariantsReduced : sheetPanelVariants}
        {...panelDragProps}
        className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-float"
        style={{ maxHeight: '85vh' }}
      >
        <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
          <div className="flex justify-center pt-3 pb-1" {...handleDragProps}>
            <div className="h-1 w-10 rounded-full bg-line-2" />
          </div>

          <div className="flex items-start justify-between px-5 pt-1 pb-4">
            <h2 className="text-xl font-bold leading-tight">Spotify</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-4 px-5 pb-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
              {playback.albumArtUrl ? (
                <img src={playback.albumArtUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Music size={28} className="text-ink-3" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold">{playback.trackName}</p>
              <p className="truncate text-[14px] text-ink-3">{playback.artistName}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 px-5 pb-5">
            <button
              onClick={() => runCommand('previous')}
              aria-label="Anterior"
              className="flex h-12 w-12 items-center justify-center text-ink-2 active:text-ink"
            >
              <SkipBack size={22} fill="currentColor" />
            </button>
            <button
              onClick={() => runCommand(isPlaying ? 'pause' : 'play')}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-bg active:bg-accent-dim"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button
              onClick={() => runCommand('next')}
              aria-label="Siguiente"
              className="flex h-12 w-12 items-center justify-center text-ink-2 active:text-ink"
            >
              <SkipForward size={22} fill="currentColor" />
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}
          className="flex-1 overflow-y-auto border-t border-line-2 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"
        >
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-2">
            <ListMusic size={15} /> Tus playlists
          </p>

          {playlistsResult === null ? (
            <p className="py-6 text-center text-sm text-ink-3">Cargando…</p>
          ) : playlistsResult.kind === 'missing-scope' ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm text-ink-2">
                Tu conexión con Spotify es de antes de esta función y no tiene el permiso
                para ver playlists.
              </p>
              <button
                onClick={() => {
                  onClose()
                  navigate('/ajustes')
                }}
                className="text-sm font-semibold text-accent"
              >
                Reconectar en Ajustes
              </button>
            </div>
          ) : playlistsResult.kind === 'reauth-required' ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm text-ink-2">Tu sesión de Spotify venció.</p>
              <button
                onClick={() => {
                  onClose()
                  navigate('/ajustes')
                }}
                className="text-sm font-semibold text-accent"
              >
                Reconectar en Ajustes
              </button>
            </div>
          ) : playlistsResult.kind === 'error' ? (
            <p className="py-6 text-center text-sm text-ink-3">No se pudieron cargar las playlists.</p>
          ) : playlistsResult.playlists.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">No encontramos playlists en tu cuenta.</p>
          ) : (
            <div className="space-y-1">
              {playlistsResult.playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handlePlaylist(playlist)}
                  disabled={loadingUri !== null}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg py-2 text-left active:bg-surface-2',
                    loadingUri === playlist.uri && 'opacity-60'
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-2">
                    {playlist.imageUrl ? (
                      <img src={playlist.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Music size={16} className="text-ink-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{playlist.name}</p>
                    <p className="text-[12px] text-ink-3">{playlist.trackCount} canciones</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </Portal>
  )
}
