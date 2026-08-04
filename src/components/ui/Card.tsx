import { cn } from '@/lib/utils'

/**
 * Superficie agrupadora. Es el patrón de Ajustes de iOS: UNA tarjeta con
 * filas separadas por hairlines, no una tarjeta con tarjetas adentro.
 *
 * Anidar superficies (`bg-surface` conteniendo `bg-surface-2`) es uno de los
 * tells más reconocibles de UI generada: agrega ruido visual y profundidad
 * que no significa nada. La jerarquía la hacen el espaciado, la tipografía y
 * los separadores. Ver DESIGN.md §3.
 */
export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}) {
  return (
    <Tag className={cn('overflow-hidden rounded-md bg-surface', className)}>{children}</Tag>
  )
}

/**
 * Encabezado de sección. Va FUERA de la tarjeta, como en iOS, para que la
 * tarjeta arranque directo con contenido.
 *
 * Deliberadamente no es una etiqueta diminuta en mayúsculas con tracking
 * abierto: ese "eyebrow" es de los tics más repetidos y le roba autoridad
 * visual a los títulos reales.
 */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-2 flex items-end justify-between gap-3 px-1', className)}>
      <h2 className="text-[17px] font-semibold leading-tight">{title}</h2>
      {action}
    </div>
  )
}

/**
 * Fila dentro de una Card. El separador se dibuja con `border-t` en todas
 * menos la primera, así no hace falta calcular cuál es la última ni queda
 * una línea colgando abajo.
 */
export function Row({
  children,
  className,
  onClick,
  as,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  as?: 'div' | 'button' | 'label'
}) {
  const Tag = as ?? (onClick ? 'button' : 'div')
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'flex w-full min-h-11 items-center gap-3 px-4 py-3 text-left',
        '[&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-2',
        onClick && 'transition-colors active:bg-surface-2',
        className
      )}
    >
      {children}
    </Tag>
  )
}

/** Estado vacío. Toda vista con datos necesita uno: nunca una pantalla en blanco. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md bg-surface px-6 py-12 text-center">
      {icon && <span className="text-ink-3">{icon}</span>}
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {description && (
          <p className="mx-auto max-w-[38ch] text-[14px] leading-relaxed text-ink-2">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
