import { Suspense, lazy, useState } from 'react'
import { Lock } from 'lucide-react'
import { purchasesAvailable } from '@/lib/purchases'
import { useEntitlementsStore } from '@/stores/entitlementsStore'

const Paywall = lazy(() => import('@/components/gym/Paywall'))

/**
 * ¿Esta función Premium está bloqueada para este usuario? Solo donde se puede
 * pagar (`purchasesAvailable()`: iOS/Android con RevenueCat configurado): en una
 * plataforma sin compras la app se comporta como gratuita, así nunca queda una
 * función cerrada sin forma de abrirla. Las funciones gratis (series, rutinas,
 * cronómetro, récords) no pasan por acá.
 *
 * Es un candado de cliente: los datos son locales (Dexie) y no hay nada que
 * proteger en el servidor.
 */
export function usePremiumLocked(): boolean {
  const premium = useEntitlementsStore((s) => s.premium)
  return purchasesAvailable() && !premium
}

/** Tarjeta de "función Premium" con la entrada al paywall. */
export function PremiumLockCard({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col items-start gap-3 rounded-md bg-surface p-5">
      <Lock size={20} className="text-ink-3" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-[17px] font-semibold">{title}</p>
        <p className="text-[14px] leading-relaxed text-ink-3">{description}</p>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 items-center rounded-sm bg-accent px-4 text-[14px] font-bold text-bg active:bg-accent-dim"
      >
        Ver Repe Premium
      </button>
      {open && (
        <Suspense fallback={null}>
          <Paywall kind="premium" onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}

/** Muestra `children` o, si está bloqueado, la tarjeta de Premium. */
export default function PremiumGate({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  const locked = usePremiumLocked()
  return locked ? <PremiumLockCard title={title} description={description} /> : <>{children}</>
}
