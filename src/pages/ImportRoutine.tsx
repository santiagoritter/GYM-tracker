import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { importPayload, resolveShareCode, type QRPayload } from '@/lib/qr'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { RoutineImportPreview } from '@/components/gym/RoutineImportPreview'

/**
 * Deep-link de /importar/:code — se abre cuando alguien escanea el QR con
 * la cámara nativa del celular en vez de con el escáner de acá adentro
 * (Rutinas → Escanear QR, ver QRScanner.tsx). Misma vista previa, otro
 * punto de entrada.
 */
export default function ImportRoutine() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const [payload, setPayload] = useState<QRPayload | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    let cancelled = false
    resolveShareCode(code).then((result) => {
      if (cancelled) return
      if (result) {
        setPayload(result)
        setName(result.n)
      } else {
        setError('Este link de rutina no es válido o ya expiró.')
      }
    })
    return () => {
      cancelled = true
    }
  }, [code])

  const handleImport = async () => {
    if (!payload || !userId) return
    const { routineId, skipped } = await importPayload(userId, payload, name)
    if (skipped > 0) {
      alert(`Rutina importada. ${skipped} ejercicio(s) no se encontraron en el catálogo y se omitieron.`)
    }
    navigate(`/rutina/${routineId}`)
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-2">{error}</p>
        <button
          onClick={() => navigate('/rutinas')}
          className="rounded-xl bg-accent px-5 py-3 font-bold text-bg"
        >
          Volver a rutinas
        </button>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-ink-3">Buscando rutina…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <RoutineImportPreview
        payload={payload}
        name={name}
        onNameChange={setName}
        onImport={handleImport}
        onClose={() => navigate('/rutinas')}
      />
    </div>
  )
}
