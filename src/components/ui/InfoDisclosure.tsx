import { ChevronDown } from 'lucide-react'

/**
 * Desplegable de información (cerrado por defecto), con el mismo patrón que las
 * preguntas frecuentes: `<details>` nativo, así que funciona sin JS, con teclado y
 * lector de pantalla. Fila de 44 px mínimo; el cuerpo se separa con líneas finas,
 * no con tarjetas adentro de tarjetas (DESIGN.md).
 */
export default function InfoDisclosure({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <details className="group overflow-hidden rounded-md bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
        {icon && <span className="shrink-0 text-ink-2">{icon}</span>}
        <span className="min-w-0 flex-1">{title}</span>
        <ChevronDown
          size={18}
          className="shrink-0 text-ink-3 transition-transform motion-reduce:transition-none group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-line-2">{children}</div>
    </details>
  )
}
