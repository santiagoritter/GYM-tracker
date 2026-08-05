import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Copy, Download, X } from 'lucide-react'
import { buildPayload, encodePayload, generateQRDataUrl } from '@/lib/qr'
import type { Routine } from '@/types'
import Portal from '@/components/ui/Portal'
import {
  sheetItemVariants,
  sheetItemVariantsReduced,
  sheetPanelVariantsFlex,
  sheetPanelVariantsFlexReduced,
} from '@/lib/motionVariants'
import { cn } from '@/lib/utils'

export function QRShareModal({ routine, onClose }: { routine: Routine; onClose: () => void }) {
  const [includeWeights, setIncludeWeights] = useState(true)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [encoded, setEncoded] = useState('')
  const [tooBig, setTooBig] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const payload = await buildPayload(routine, { includeWeights })
      const data = encodePayload(payload)
      if (cancelled) return
      setEncoded(data)
      // ~2KB es el límite práctico para escanear con cámara de celular
      setTooBig(data.length > 2000)
      const url = await generateQRDataUrl(data)
      if (!cancelled) setQrUrl(url)
    })()
    return () => {
      cancelled = true
    }
  }, [routine, includeWeights])

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm animate-glass-in">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={reduced ? sheetPanelVariantsFlexReduced : sheetPanelVariantsFlex}
          className="w-full max-w-lg rounded-t-3xl border-t border-line-2 bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <motion.div
            variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}
            className="mb-4 flex items-center justify-between"
          >
            <h2 className="text-lg font-bold">Compartir rutina</h2>
            <button onClick={onClose} className="rounded-lg p-2 text-ink-2">
              <X size={22} />
            </button>
          </motion.div>

          <motion.div
            variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}
            className="flex flex-col items-center gap-4"
          >
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR de ${routine.name}`}
                className="h-64 w-64 rounded-2xl"
              />
            ) : (
              <div className="h-64 w-64 animate-pulse rounded-2xl bg-surface-2" />
            )}

            <p className="text-center text-sm text-ink-2">
              {routine.name} · el otro escanea desde{' '}
              <span className="text-ink">Rutinas → Escanear QR</span>
            </p>

            {tooBig && (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-center text-xs text-warning">
                Rutina muy grande para un QR confiable — probá sin pesos.
              </p>
            )}

            <button
              onClick={() => setIncludeWeights((v) => !v)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium',
                includeWeights
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line-2 text-ink-3'
              )}
            >
              {includeWeights ? 'Incluye tus pesos' : 'Sin pesos'}
            </button>

            <div className="flex w-full gap-2">
              <a
                href={qrUrl ?? '#'}
                download={`rutina-${routine.name.toLowerCase().replace(/\s+/g, '-')}.png`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-3 font-bold text-bg"
              >
                <Download size={18} /> Descargar
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(encoded)
                  alert('Código copiado — también se puede importar pegándolo')
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-line-2 px-4 py-3 font-semibold text-ink-2"
              >
                <Copy size={18} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Portal>
  )
}
