import { useEffect, useRef, useState } from 'react'

/**
 * Input numérico con borrador local en vez de escribir en cada tecla al
 * valor controlado. Sin esto, un `value` atado directo a la fuente (Dexie
 * vía useLiveQuery, o cualquier estado externo) con `Number(e.target.value)
 * || fallback` hace que borrar el campo para reescribirlo guarde el
 * fallback al toque, y el input se re-renderiza a mitad de la edición —
 * no se puede vaciar. Commit recién al blur o tras 600ms sin tipear; campo
 * vacío se descarta sin escribir nada. Mismo criterio que
 * `NumberStepper.tsx` (peso de series durante el entreno).
 */
export default function DraftNumberInput({
  value,
  onCommit,
  className,
}: {
  value: number
  onCommit: (n: number) => void
  className?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commitTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(commitTimer.current), [])

  const commit = (raw: string) => {
    window.clearTimeout(commitTimer.current)
    setDraft(null)
    if (raw.trim() === '') return
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    onCommit(parsed)
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      value={draft ?? String(value)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value
        setDraft(raw)
        window.clearTimeout(commitTimer.current)
        commitTimer.current = window.setTimeout(() => commit(raw), 600)
      }}
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={className}
    />
  )
}
