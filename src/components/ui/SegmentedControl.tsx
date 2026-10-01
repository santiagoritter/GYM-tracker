import { cn } from '@/lib/utils'

/**
 * Selector de una opción entre pocas (2–4). Antes cada pantalla lo armaba a
 * mano con un radio distinto (`rounded-full` en Correr, `rounded-xs` con
 * borde en Ajustes); este es el único: radio `sm`, activa en acento, 44 px
 * de alto (target táctil mínimo).
 */
export default function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className,
  mono,
}: {
  options: readonly { value: T; label: React.ReactNode }[]
  value: T
  onChange: (value: T) => void
  className?: string
  /** Números: fuente mono tabular. */
  mono?: boolean
}) {
  return (
    <div role="radiogroup" className={cn('flex gap-1 rounded-sm bg-fill p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-11 flex-1 rounded-xs text-[13px] font-semibold transition-colors',
              mono && 'font-mono tabular-nums',
              active ? 'bg-accent text-bg' : 'text-ink-2 active:bg-fill-2'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
