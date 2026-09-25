import { Suspense, lazy, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { workoutsFor } from '@/db/scoped'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { useEntitlementsStore } from '@/stores/entitlementsStore'
import { purchasesAvailable } from '@/lib/purchases'
import { platform } from '@/lib/native'
import { ADS_INTRO_KEY, adsAvailable, hideBannerAd, showBannerAd } from '@/lib/ads'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'

const Paywall = lazy(() => import('@/components/gym/Paywall'))

/** Pantallas de "consulta" donde se permite el banner. Nunca en entrenos, correr,
 * cardio, sheets ni nada que se use con las manos ocupadas. */
const AD_ROUTES = ['/progreso', '/rutinas', '/ejercicios', '/ajustes']

function introSeen(): boolean {
  try {
    return localStorage.getItem(ADS_INTRO_KEY) === '1'
  } catch {
    return true // si el storage falla no se insiste con el aviso
  }
}

/**
 * Banner de AdMob (solo iOS, solo con el flag prendido). Se monta una vez en el
 * layout; decide solo cuándo mostrarlo y lo saca en cuanto deja de corresponder
 * (otra pantalla, entreno en curso, suscripción "Sin anuncios", rol de coach).
 */
export default function AdBanner() {
  const { pathname } = useLocation()
  const userId = useCurrentUserId()
  const role = useAuthStore((s) => s.role)
  const adFree = useEntitlementsStore((s) => s.adFree)
  const activeWorkout = useLiveQuery(
    () => (userId ? workoutsFor(userId).filter((w) => !w.finishedAt).first() : undefined),
    [userId]
  )
  const [introOpen, setIntroOpen] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const [accepted, setAccepted] = useState(introSeen)

  const onAdRoute = AD_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
  const eligible =
    adsAvailable() && onAdRoute && !adFree && role !== 'coach' && role !== 'admin' && !activeWorkout

  useEffect(() => {
    if (!eligible) return
    if (!accepted) {
      setIntroOpen(true)
      return
    }
    let cancelled = false
    showBannerAd(() => cancelled).catch(() => undefined)
    return () => {
      cancelled = true
      void hideBannerAd()
    }
  }, [eligible, accepted])

  if (!introOpen) return null

  const accept = () => {
    try {
      localStorage.setItem(ADS_INTRO_KEY, '1')
    } catch {
      // sin storage: se vuelve a preguntar la próxima
    }
    setIntroOpen(false)
    setAccepted(true)
  }

  return (
    <>
      <ResponsiveSheet onClose={accept} panelClassName="flex flex-col">
        <div className="space-y-3 px-5 pt-5 pb-2">
          <h2 className="text-lg font-bold">Anuncios en Repe</h2>
          <p className="text-[14px] leading-relaxed text-ink-2">
            La app es gratis y se sostiene con anuncios en las pantallas de consulta; nunca aparecen
            mientras entrenás.{' '}
            {platform === 'ios'
              ? 'A continuación iOS te va a preguntar si permitís que Repe te siga entre apps y sitios: si decís que no, igual ves anuncios, pero no personalizados.'
              : 'Si hay anuncios personalizados disponibles en tu región, te vamos a pedir tu consentimiento; si no, ves anuncios no personalizados igual.'}
          </p>
          {purchasesAvailable() && (
            <p className="text-[14px] leading-relaxed text-ink-2">
              También podés quitarlos con la suscripción "Sin anuncios".
            </p>
          )}
        </div>
        <div className="space-y-2 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
          <button
            onClick={accept}
            className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg active:bg-accent-dim"
          >
            Continuar
          </button>
          {purchasesAvailable() && (
            <button
              onClick={() => setPaywall(true)}
              className="h-11 w-full text-[14px] font-semibold text-accent"
            >
              Quitar anuncios
            </button>
          )}
        </div>
      </ResponsiveSheet>
      {paywall && (
        <Suspense fallback={null}>
          <Paywall kind="ad_free" onClose={() => setPaywall(false)} onPurchased={accept} />
        </Suspense>
      )}
    </>
  )
}
