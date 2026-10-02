import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import {
  loadPurchaseOptions,
  purchase,
  PRODUCT_AD_FREE,
  PRODUCT_COACH,
  PRODUCT_PREMIUM_ANNUAL,
  PRODUCT_PREMIUM_MONTHLY,
  restorePurchases,
  subscriptionManagementHint,
  type PurchaseOption,
} from '@/lib/purchases'
import { COACH_PERKS } from '@/lib/coachSubscription'
import { toast } from '@/stores/toastStore'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { useAuthStore } from '@/stores/authStore'
import { annualSavingPct, productBase } from '@/lib/premium'

export type PaywallKind = 'premium' | 'coach' | 'ad_free'

const COPY: Record<PaywallKind, { title: string; products: readonly string[]; perks: readonly string[] }> = {
  premium: {
    title: 'Repe Premium',
    products: [PRODUCT_PREMIUM_MONTHLY, PRODUCT_PREMIUM_ANNUAL],
    perks: [
      'Niveles de fuerza por grupo muscular',
      'Gráficos avanzados de progreso',
      'Comparación de fotos de progreso',
      'Sin anuncios en ninguna pantalla',
    ],
  },
  coach: {
    title: 'Modo coach',
    products: [PRODUCT_COACH],
    perks: COACH_PERKS,
  },
  ad_free: {
    title: 'Sin anuncios',
    products: [PRODUCT_AD_FREE],
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
  const navigate = useNavigate()
  // Una compra sin cuenta queda atada a un id anónimo de RevenueCat y el
  // webhook la ignora: se pide la cuenta primero.
  const isGuest = useAuthStore((s) => s.isGuest)
  const [selected, setSelected] = useState<string>(copy.products[0] ?? '')

  useEffect(() => {
    let alive = true
    loadPurchaseOptions()
      .then((o) => alive && setOptions(o))
      .catch(() => alive && setLoadError(true))
    return () => {
      alive = false
    }
  }, [])

  // En Android (Play Billing 5+) `productId` viene compuesto
  // (`gymtracker.coach.monthly:monthly-base`): se compara la base, no el id
  // entero, o la única opción real quedaba invisible.
  const available = copy.products
    .map((id) => options?.find((o) => productBase(o.productId) === id))
    .filter((o): o is PurchaseOption => Boolean(o))
  const option = available.find((o) => productBase(o.productId) === selected) ?? available[0] ?? null
  const monthly = available.find((o) => o.period === 'mes')
  const annual = available.find((o) => o.period === 'año')
  const saving = monthly && annual ? annualSavingPct(monthly.price, annual.price) : null

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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
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
        {available.length > 1 && (
          <SegmentedControl
            options={available.map((o) => ({
              value: productBase(o.productId),
              label: o.period === 'año' ? (saving ? `Anual · ahorrás ${saving} %` : 'Anual') : 'Mensual',
            }))}
            value={option ? productBase(option.productId) : ''}
            onChange={setSelected}
          />
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
        {isGuest ? (
          <>
            <p className="text-[13px] leading-relaxed text-ink-3">
              Para suscribirte hace falta una cuenta: así la compra queda atada a vos y la recuperás en otro teléfono.
              Tus datos actuales pasan a la cuenta.
            </p>
            <button
              onClick={() => {
                onClose()
                navigate('/registro')
              }}
              className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg"
            >
              Crear cuenta
            </button>
          </>
        ) : (
          <button
            onClick={buy}
            disabled={!option || busy}
            className="h-12 w-full rounded-sm bg-accent text-sm font-bold text-bg disabled:opacity-40"
          >
            {busy ? 'Procesando…' : option ? `Suscribirme — ${option.priceString}` : 'Suscribirme'}
          </button>
        )}
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
