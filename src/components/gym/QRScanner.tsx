import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import { ClipboardPaste, X } from 'lucide-react'
import { decodePayload, extractShareCode, importPayload, resolveShareCode, type QRPayload } from '@/lib/qr'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import Portal from '@/components/ui/Portal'
import { RoutineImportPreview } from '@/components/gym/RoutineImportPreview'

/** Intenta resolver lo escaneado/pegado, en orden: código/URL de share
 * (Supabase, formato nuevo) y recién si eso falla, el payload local viejo
 * "GYMTR:" (rutinas compartidas antes de este cambio). */
async function resolveScannedText(raw: string): Promise<QRPayload | null> {
  const code = extractShareCode(raw)
  if (code) {
    const payload = await resolveShareCode(code)
    if (payload) return payload
  }
  return decodePayload(raw)
}

export function QRScanner({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [payload, setPayload] = useState<QRPayload | null>(null)
  const [name, setName] = useState('')
  const [cameraError, setCameraError] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [scanError, setScanError] = useState('')
  const resolvingRef = useRef(false)

  useEffect(() => {
    if (payload) return // cámara pausada durante el preview
    let stream: MediaStream | null = null
    let interval: ReturnType<typeof setInterval> | null = null
    let cancelled = false
    const canvas = document.createElement('canvas')

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()

        interval = setInterval(() => {
          // Ya hay una resolución en curso (código de Supabase, red de por
          // medio) — no arrancar otra por el mismo frame.
          if (resolvingRef.current) return
          if (!video.videoWidth) return
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return
          ctx.drawImage(video, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (!code) return

          resolvingRef.current = true
          setResolving(true)
          resolveScannedText(code.data).then((parsed) => {
            if (cancelled) return
            resolvingRef.current = false
            setResolving(false)
            if (parsed) {
              navigator.vibrate?.(100)
              setPayload(parsed)
              setName(parsed.n)
            } else {
              setScanError('Ese código no es una rutina válida de GymTracker.')
            }
          })
        }, 300)
      } catch {
        setCameraError(true)
      }
    })()

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [payload])

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setResolving(true)
      const parsed = await resolveScannedText(text.trim())
      setResolving(false)
      if (parsed) {
        setPayload(parsed)
        setName(parsed.n)
      } else {
        alert('El texto pegado no es una rutina válida de GymTracker')
      }
    } catch {
      setResolving(false)
      alert('No se pudo leer el portapapeles')
    }
  }

  const handleImport = async () => {
    if (!payload || !userId) return
    const { routineId, skipped } = await importPayload(userId, payload, name)
    if (skipped > 0) {
      alert(`Rutina importada. ${skipped} ejercicio(s) no se encontraron en el catálogo y se omitieron.`)
    }
    onClose()
    navigate(`/rutina/${routineId}`)
  }

  // ── Preview de importación ──
  if (payload) {
    return (
      <Portal>
        <div className="fixed inset-0 z-50 flex flex-col bg-bg">
          <RoutineImportPreview
            payload={payload}
            name={name}
            onNameChange={setName}
            onImport={handleImport}
            onClose={onClose}
          />
        </div>
      </Portal>
    )
  }

  // ── Vista de cámara ──
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex flex-col bg-bg">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-bold">Escanear rutina</h2>
            <button onClick={onClose} className="rounded-lg p-2 text-ink-2">
              <X size={22} />
            </button>
          </div>

          <div className="relative mx-4 flex-1 overflow-hidden rounded-2xl bg-surface">
            {cameraError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-ink-2">
                  No se pudo acceder a la cámara. Podés pegar el código copiado desde la
                  otra app.
                </p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-56 w-56 rounded-2xl border-2 border-accent/70" />
                </div>
                {resolving && (
                  <div className="absolute inset-x-0 bottom-3 flex justify-center">
                    <span className="rounded-full bg-bg/80 px-3 py-1.5 text-xs font-medium text-ink-2 backdrop-blur">
                      Buscando rutina…
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {scanError && (
            <p className="mx-4 mt-3 rounded-lg bg-danger/10 px-3 py-2 text-center text-xs text-danger">
              {scanError}
            </p>
          )}

          <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              onClick={handlePaste}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line-2 py-3 font-semibold text-ink-2"
            >
              <ClipboardPaste size={18} /> Pegar código
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
