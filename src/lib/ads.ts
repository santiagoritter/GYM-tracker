import { create } from 'zustand'
import { platform } from '@/lib/native'

/**
 * Anuncios (AdMob) — solo un banner, solo en pantallas de consulta, nunca durante
 * un entrenamiento, una salida a correr o el cardio. Apagado por defecto: sin
 * `VITE_ADS_ENABLED=on` y un id de bloque de anuncios, o fuera de iOS, no hay ni
 * un byte de anuncios en la app.
 *
 * Privacidad (Guideline 5.1.2 / ATT): antes del primer anuncio se muestra una
 * explicación propia, después el aviso de "seguimiento" de iOS y, donde aplica
 * (UE), el formulario de consentimiento de Google (UMP). Si el usuario no
 * autoriza el seguimiento, los anuncios son no personalizados.
 */

const BANNER_ID = import.meta.env.VITE_ADMOB_BANNER_ID as string | undefined
/** Bloque de banner de PRUEBA de Google: en desarrollo nunca se pide uno real. */
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/2934735716'
/** Alto del banner adaptable + margen; lo usa el layout para no tapar contenido. */
export const BANNER_SPACE_PX = 62
/** El banner flota sobre la tab bar: se levanta lo que ocupa (cápsula + safe area). */
const TAB_BAR_MARGIN = 88

export const ADS_INTRO_KEY = 'gymtracker-ads-intro-seen'

export function adsAvailable(): boolean {
  return import.meta.env.VITE_ADS_ENABLED === 'on' && platform === 'ios' && Boolean(BANNER_ID)
}

/** ¿El banner está en pantalla? El layout suma espacio abajo mientras sea true. */
export const useAdsState = create<{ visible: boolean }>()(() => ({ visible: false }))

type AdMobModule = typeof import('@capacitor-community/admob')

let ready: Promise<{ mod: AdMobModule; personalized: boolean; canRequestAds: boolean }> | null = null

/** Consentimiento + ATT + inicialización del SDK. Se hace una sola vez. */
export function prepareAds() {
  if (!ready) {
    ready = (async () => {
      const mod = await import('@capacitor-community/admob')
      const { AdMob } = mod

      const consent = await AdMob.requestConsentInfo()
      let canRequestAds = consent.canRequestAds !== false
      if (consent.isConsentFormAvailable && String(consent.status) === 'REQUIRED') {
        const after = await AdMob.showConsentForm()
        canRequestAds = after.canRequestAds !== false
      }

      let { status } = await AdMob.trackingAuthorizationStatus()
      if (status === 'notDetermined') {
        await AdMob.requestTrackingAuthorization()
        status = (await AdMob.trackingAuthorizationStatus()).status
      }

      await AdMob.initialize({})
      return { mod, personalized: status === 'authorized', canRequestAds }
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

/** `isCancelled` cubre la carrera: la pantalla puede cambiar mientras se pide el
 * consentimiento o carga el banner, y no debe quedar uno colgado en otra. */
export async function showBannerAd(isCancelled: () => boolean): Promise<void> {
  const { mod, personalized, canRequestAds } = await prepareAds()
  if (!canRequestAds || isCancelled()) return
  await mod.AdMob.showBanner({
    adId: import.meta.env.DEV ? TEST_BANNER_ID : BANNER_ID!,
    adSize: mod.BannerAdSize.ADAPTIVE_BANNER,
    position: mod.BannerAdPosition.BOTTOM_CENTER,
    margin: TAB_BAR_MARGIN,
    isTesting: import.meta.env.DEV,
    npa: !personalized,
  })
  if (isCancelled()) {
    await mod.AdMob.removeBanner().catch(() => undefined)
    return
  }
  useAdsState.setState({ visible: true })
}

export async function hideBannerAd(): Promise<void> {
  useAdsState.setState({ visible: false })
  if (!ready) return
  try {
    const { mod } = await ready
    await mod.AdMob.removeBanner()
  } catch {
    // no había banner
  }
}
