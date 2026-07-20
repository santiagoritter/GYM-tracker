import { CheckCircle2, Info, Trophy, X, XCircle } from 'lucide-react'
import { useToastStore, type ToastKind } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

const KIND_STYLE: Record<
  ToastKind,
  { icon: typeof Info; ring: string; iconClass: string }
> = {
  success: { icon: CheckCircle2, ring: 'ring-success/40', iconClass: 'text-success' },
  error: { icon: XCircle, ring: 'ring-danger/40', iconClass: 'text-danger' },
  info: { icon: Info, ring: 'ring-info/40', iconClass: 'text-info' },
  pr: { icon: Trophy, ring: 'ring-accent/50', iconClass: 'text-accent' },
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => {
        const { icon: Icon, ring, iconClass } = KIND_STYLE[t.kind]
        return (
          <div
            key={t.id}
            className={cn(
              'animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-surface-2/95 p-3.5 shadow-lg shadow-black/40 ring-1 backdrop-blur',
              ring
            )}
          >
            <Icon size={20} className={cn('mt-0.5 shrink-0', iconClass)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs text-ink-2">{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 text-ink-3 active:bg-surface-3"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
