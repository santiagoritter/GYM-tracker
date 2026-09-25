import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import {
  loadPurchaseOptions,
  purchase,
  PRODUCT_AD_FREE,
  PRODUCT_COACH,
  restorePurchases,
  subscriptionManagementHint,
  type PurchaseOption,
} from '@/lib/purchases'
import { COACH_PERKS } from '@/lib/coachSubscription'
import { toast } from '@/stores/toastStore'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'

export type PaywallKind = 'coach' | 'ad_free'

const COPY: Record<PaywallKind, { title: string; product: string; perks: readonly string[] }> = {
  coach: {
    title: 'Modo coach',
    product: PRODUCT_COACH,
    perks: COACH_PERKS,
  },
  ad_free: {
    title: 'Sin anuncios',
    product: PRODUCT_AD_FREE,
    perks: ['Sin banners en ninguna pantalla', 'Apoyás el desarrollo de la app'],
  },
}

/**
 * Pantalla de compra (Guideline 3.1.1 y 3.1.2): muestra el precio localizado
 * que devuelve StoreKit (nunca uno escrito a mano), que es una suscripción
 * mensual que se renueva sola y cómo cancelarla, con "Restaurar compras"
 * siempre visible y links a los términos y la política de privacidad. No hay
 * ninguna otra forma de pagar: nada de links externos.
 */
export default function Paywall({
  kind,
  onClose,
  onPurchased,
}: {
  kind: PaywallKind
  onClose: () => void
  onPurchased?: () => void
}) {
  const copy = COPY[kind]
  const [options, setOptions] = useState<PurchaseOption[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    loadPurchaseOptions()
      .then((o) => alive && setOptions(o))
      .catch(() => alive && setLoadError(true))
    return () => {
      alive = false
    }
  }, [])

  // En Android (Play Billing 5+) `productId` viene compuesto:
  // `gymtracker.coach.monthly:monthly-base` — un `===` exacto contra el id
  // "pelado" de `copy.product` nunca matcheaba ahí, así que la única
  // opción real quedaba invisible y el paywall decía "no disponible".
  const option = options?.find((o) => o.productId.split(':')[0] === copy.product) ?? null

  const buy = async () => {
    if (!option || busy) return
    setBusy(true)
    try {
      if (await purchase(option.packageId)) {
        toast.success('¡Listo!', `${copy.title} activado.`)
        onPurchased?.()
        onClose()
      }
    } catch (e) {
      toast.error('No se pudo completar la compra', e instanceof Error ? e.message : 'Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    if (busy) return
    setBusy(true)
    try {
      await restorePurchases()
      toast.success('Compras restauradas', 'Si tenías una suscripción activa, ya está de vuelta.')
      onPurchased?.()
    } catch (e) {
      toast.error('No se pudo restaurar', e instanceof Error ? e.message : 'Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ResponsiveSheet onClose={onClose} panelClassName="flex max-h-[90vh] flex-col">
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <h2 className="text-lg font-bold">{copy.title}</h2>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-2">
        <ul className="space-y-2">
          {copy.perks.map((p) => (
            <li key={p} className="flex items-start gap-2 text-[15px] text-ink-2">
              <Check size={16} className="mt-0.5 shrink-0 text-accent" />
              {p}
            </li>
          ))}
        </ul>

        {options === null && !loadError && <p className="text-sm text-ink-3">Cargando precio…</p>}
        {loadError && (
          <p className="rounded-sm bg-danger/10 p-3 text-sm text-danger">
            No se pudo cargar el precio. Revisá tu conexión e intentá de nuevo.
          </p>
        )}
        {options && !option && (
          <p className="rounded-sm bg-surface-2 p-3 text-sm text-ink-3">
            Este producto no está disponible ahora. Probá más tarde.
          </p>
        )}
        {option && (
          <div className="rounded-md bg-surface-2 p-4">
            <p className="font-mono text-2xl font-bold tabular-nums">
              {option.priceString}
              <span className="ml-1 text-[14px] font-medium text-ink-3">/ {option.period || 'mes'}</span>
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
              Suscripción con renovación automática. Se cobra a la cuenta de tu tienda al confirmar
              y se renueva cada período salvo que la canceles al menos 24 horas antes de que
              termine. La administrás o cancelás en {subscriptionManagementHint()}.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
        <button
          onClick={buy}
          disabled={!option || busy}
          className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-40"
        >
          {busy ? 'Procesando…' : option ? `Suscribirme — ${option.priceString}` : 'Suscribirme'}
        </button>
        <button
          onClick={restore}
          disabled={busy}
          className="h-11 w-full text-[14px] font-semibold text-accent disabled:opacity-40"
        >
          Restaurar compras
        </button>
        <p className="text-center text-[12px] text-ink-3">
          <Link to="/legal/terminos" className="underline">
            Términos de uso
          </Link>{' '}
          ·{' '}
          <Link to="/legal/privacidad" className="underline">
            Política de privacidad
          </Link>
        </p>
      </div>
    </ResponsiveSheet>
  )
}
