import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, Columns2, Trash2, X } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '@/db/schema'
import { compressImage } from '@/lib/photos'
import type { ProgressPhoto } from '@/types'
import { cn, nowIso, uid } from '@/lib/utils'

export function PhotoGallery() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null)
  const [saving, setSaving] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])

  const photos = useLiveQuery(
    () => db.progressPhotos.orderBy('takenAt').reverse().toArray(),
    []
  )
  const profile = useLiveQuery(() => db.profile.get('local'), [])

  const weightData = useMemo(
    () =>
      (photos ?? [])
        .filter((p) => p.weightKg)
        .map((p) => ({
          label: new Date(p.takenAt).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'numeric',
          }),
          kg: p.weightKg!,
          date: p.takenAt,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [photos]
  )

  const comparing = useMemo(
    () =>
      compareIds.length === 2
        ? compareIds
            .map((id) => photos?.find((p) => p.id === id))
            .filter((p): p is ProgressPhoto => Boolean(p))
            .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
        : null,
    [compareIds, photos]
  )

  const toggleCompare = (photo: ProgressPhoto) => {
    setCompareIds((ids) => {
      if (ids.includes(photo.id)) return ids.filter((i) => i !== photo.id)
      if (ids.length >= 2) return [ids[1], photo.id]
      return [...ids, photo.id]
    })
  }

  const handleFile = async (file: File) => {
    setSaving(true)
    try {
      const blob = await compressImage(file)
      await db.progressPhotos.add({
        id: uid(),
        takenAt: nowIso(),
        weightKg: profile?.bodyWeightKg,
        blob,
      })
    } catch {
      alert('No se pudo procesar la imagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-line-2 py-4 font-semibold text-ink-2 active:bg-surface disabled:opacity-50"
        >
          <Camera size={20} /> {saving ? 'Guardando…' : 'Agregar foto'}
        </button>
        {(photos?.length ?? 0) >= 2 && (
          <button
            onClick={() => {
              setCompareMode((v) => !v)
              setCompareIds([])
            }}
            className={cn(
              'flex items-center justify-center gap-2 rounded-2xl border px-4 font-semibold',
              compareMode
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line-2 text-ink-2'
            )}
          >
            <Columns2 size={20} />
          </button>
        )}
      </div>

      {compareMode && (
        <p className="text-center text-xs text-ink-3">
          Elegí 2 fotos para comparar ({compareIds.length}/2)
        </p>
      )}

      {weightData.length >= 2 && !compareMode && (
        <div className="rounded-xl bg-surface p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-3">
            Peso corporal
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData} margin={{ top: 4, right: 8, bottom: 0, left: -25 }}>
                <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#606060" fontSize={10} />
                <YAxis stroke="#606060" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1C1C1C',
                    border: '1px solid #383838',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value} kg`, 'Peso']}
                />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  dot={{ fill: '#60A5FA', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {(photos ?? []).map((photo) => (
          <PhotoThumb
            key={photo.id}
            photo={photo}
            selected={compareIds.includes(photo.id)}
            onClick={() => (compareMode ? toggleCompare(photo) : setViewing(photo))}
          />
        ))}
      </div>

      {comparing && (
        <CompareViewer
          photos={comparing as [ProgressPhoto, ProgressPhoto]}
          onClose={() => {
            setCompareIds([])
            setCompareMode(false)
          }}
        />
      )}

      {photos?.length === 0 && (
        <p className="rounded-xl bg-surface p-8 text-center text-sm text-ink-3">
          Sacá una foto por semana y mirá el cambio con el tiempo. Las fotos se guardan
          solo en tu dispositivo.
        </p>
      )}

      {viewing && (
        <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

function usePhotoUrl(blob: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return url
}

function PhotoThumb({
  photo,
  selected,
  onClick,
}: {
  photo: ProgressPhoto
  selected?: boolean
  onClick: () => void
}) {
  const url = usePhotoUrl(photo.blob)
  if (!url) return <div className="aspect-square rounded-lg bg-surface" />
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative aspect-square overflow-hidden rounded-lg',
        selected && 'ring-2 ring-accent'
      )}
    >
      <img src={url} alt="" className="h-full w-full object-cover" />
      <span className="absolute bottom-1 left-1 rounded bg-bg/80 px-1.5 py-0.5 text-[10px] font-medium">
        {new Date(photo.takenAt).toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'numeric',
        })}
      </span>
    </button>
  )
}

function CompareViewer({
  photos,
  onClose,
}: {
  photos: [ProgressPhoto, ProgressPhoto]
  onClose: () => void
}) {
  const [before, after] = photos
  const beforeUrl = usePhotoUrl(before.blob)
  const afterUrl = usePhotoUrl(after.blob)
  const weightDiff =
    before.weightKg && after.weightKg
      ? Math.round((after.weightKg - before.weightKg) * 10) / 10
      : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-semibold">Comparación</p>
        <button onClick={onClose} className="rounded-lg p-2 text-ink-2">
          <X size={22} />
        </button>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 p-4">
        {[
          { photo: before, url: beforeUrl },
          { photo: after, url: afterUrl },
        ].map(({ photo, url }) => (
          <div key={photo.id} className="flex flex-col gap-2">
            <div className="flex-1 overflow-hidden rounded-xl bg-surface">
              {url && <img src={url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="text-center">
              <p className="text-xs text-ink-2">
                {new Date(photo.takenAt).toLocaleDateString('es-AR')}
              </p>
              {photo.weightKg && (
                <p className="font-mono text-sm font-bold">{photo.weightKg} kg</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {weightDiff !== null && (
        <p className="pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center text-sm text-ink-2">
          Diferencia:{' '}
          <span
            className={cn(
              'font-mono font-bold',
              weightDiff > 0 ? 'text-success' : weightDiff < 0 ? 'text-info' : ''
            )}
          >
            {weightDiff > 0 ? '+' : ''}
            {weightDiff} kg
          </span>
        </p>
      )}
    </div>
  )
}

function PhotoViewer({ photo, onClose }: { photo: ProgressPhoto; onClose: () => void }) {
  const url = usePhotoUrl(photo.blob)
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-medium">
            {new Date(photo.takenAt).toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          {photo.weightKg && (
            <p className="font-mono text-sm text-ink-2">{photo.weightKg} kg</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={async () => {
              if (confirm('¿Eliminar esta foto?')) {
                await db.progressPhotos.delete(photo.id)
                onClose()
              }
            }}
            className="rounded-lg p-2 text-danger/80"
          >
            <Trash2 size={20} />
          </button>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-2">
            <X size={22} />
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        {url && <img src={url} alt="" className="max-h-full max-w-full rounded-xl" />}
      </div>
    </div>
  )
}
