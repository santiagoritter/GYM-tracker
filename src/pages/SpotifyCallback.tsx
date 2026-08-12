import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { exchangeCodeForToken, fetchSpotifyDisplayName } from '@/lib/spotifyAuth'
import { useSpotifyStore } from '@/stores/spotifyStore'
import { toast } from '@/stores/toastStore'

/**
 * Destino del redirect de Spotify después de autorizar (o cancelar).
 * Pantalla de tránsito, no de navegación: intercambia el código por
 * token y vuelve sola a Ajustes — el usuario no debería quedarse acá
 * más de un instante salvo que algo falle.
 */
export default function SpotifyCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const connect = useSpotifyStore((s) => s.connect)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const spotifyError = searchParams.get('error')

    if (spotifyError) {
      setError(spotifyError === 'access_denied' ? 'Cancelaste el login en Spotify.' : spotifyError)
      return
    }
    if (!code) {
      setError('Spotify no mandó ningún código de autorización.')
      return
    }

    exchangeCodeForToken(code)
      .then(async (token) => {
        const displayName = await fetchSpotifyDisplayName(token.accessToken)
        connect(token, displayName)
        toast.success('Spotify conectado', displayName ?? undefined)
        navigate('/ajustes', { replace: true })
      })
      .catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto flex min-h-screen content-width flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <AlertTriangle size={32} className="text-danger" />
          <p className="font-semibold">No se pudo conectar con Spotify</p>
          <p className="text-sm text-ink-2">{error}</p>
          <button
            onClick={() => navigate('/ajustes', { replace: true })}
            className="mt-2 flex h-11 items-center rounded-sm bg-accent px-5 text-sm font-bold text-bg active:bg-accent-dim"
          >
            Volver a Ajustes
          </button>
        </>
      ) : (
        <>
          <Loader2 size={28} className="animate-spin text-accent" />
          <p className="text-sm text-ink-2">Conectando con Spotify…</p>
        </>
      )}
    </div>
  )
}
