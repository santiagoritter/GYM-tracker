import { motion, type PanInfo } from 'motion/react'
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

// Igual que useSheetDrag.ts, pero horizontal: acá no hay un handle
// separado (el toast entero es chico y no tiene grip visual), así que
// arrastra desde cualquier punto — mismo gesto que los banners nativos
// de iOS/Android para descartar una notificación.
const DISMISS_OFFSET_PX = 100
const DISMISS_VELOCITY = 600

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => {
        const { icon: Icon, ring, iconClass } = KIND_STYLE[t.kind]
        const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
          if (Math.abs(info.offset.x) > DISMISS_OFFSET_PX || Math.abs(info.velocity.x) > DISMISS_VELOCITY) {
            dismiss(t.id)
          }
        }
        return (
          <motion.div
            key={t.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.9}
            onDragEnd={handleDragEnd}
            className={cn(
              'animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-surface-2/95 p-3.5 shadow-lg shadow-black/40 ring-1 backdrop-blur',
              ring
            )}
            style={{ touchAction: 'pan-y' }}
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
          </motion.div>
        )
      })}
    </div>
  )
}
