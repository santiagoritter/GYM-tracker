import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import { ClipboardPaste, X } from 'lucide-react'
import { decodePayload, importPayload, type QRPayload } from '@/lib/qr'

export function QRScanner({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [payload, setPayload] = useState<QRPayload | null>(null)
  const [name, setName] = useState('')
  const [cameraError, setCameraError] = useState(false)

  useEffect(() => {
    if (payload) return // cámara pausada durante el preview
    let stream: MediaStream | null = null
    let interval: ReturnType<typeof setInterval> | null = null
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
          // El canvas usa el tamaño real del video (no un valor fijo)
          if (!video.videoWidth) return
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return
          ctx.drawImage(video, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (code) {
            const parsed = decodePayload(code.data)
            if (parsed) {
              navigator.vibrate?.(100)
              setPayload(parsed)
              setName(parsed.n)
            }
          }
        }, 300)
      } catch {
        setCameraError(true)
      }
    })()

    return () => {
      if (interval) clearInterval(interval)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [payload])

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = decodePayload(text.trim())
      if (parsed) {
        setPayload(parsed)
        setName(parsed.n)
      } else {
        alert('El texto pegado no es una rutina válida de GymTracker')
      }
    } catch {
      alert('No se pudo leer el portapapeles')
    }
  }

  const handleImport = async () => {
    if (!payload) return
    const { routineId, skipped } = await importPayload(payload, name)
    if (skipped > 0) {
      alert(`Rutina importada. ${skipped} ejercicio(s) no se encontraron en el catálogo y se omitieron.`)
    }
    onClose()
    navigate(`/rutina/${routineId}`)
  }

  // ── Preview de importación ──
  if (payload) {
    const totalExercises = payload.d.reduce((sum, d) => sum + (d.e?.length ?? 0), 0)
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-lg font-bold">Importar rutina</h2>
            <button onClick={onClose} className="rounded-lg p-2 text-ink-2">
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-surface px-3 py-2.5 font-semibold outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-sm text-ink-2">
              {payload.d.length} días · {totalExercises} ejercicios
            </p>

            {payload.d.map((day, i) => (
              <div key={i} className="rounded-xl bg-surface p-4">
                <p className="font-semibold">
                  {day.n}
                  {day.r && <span className="ml-2 text-xs text-ink-3">descanso</span>}
                </p>
                {day.e && day.e.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {day.e.map((ex, j) => (
                      <li key={j} className="flex justify-between text-sm text-ink-2">
                        <ExerciseName id={ex.id} />
                        <span className="font-mono">
                          {ex.s}×{ex.r[0]}–{ex.r[1]}
                          {ex.w ? ` · ${ex.w}kg` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-line px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              onClick={handleImport}
              className="w-full rounded-xl bg-accent py-4 font-bold text-bg"
            >
              Importar rutina
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista de cámara ──
  return (
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
            </>
          )}
        </div>

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
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'

function ExerciseName({ id }: { id: string }) {
  const exercise = useLiveQuery(() => db.exercises.get(id), [id])
  return <span>{exercise?.name ?? `(desconocido: ${id})`}</span>
}
