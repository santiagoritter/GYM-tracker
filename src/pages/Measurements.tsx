import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Ruler, Trash2 } from 'lucide-react'
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
import { softDelete } from '@/db/mutations'
import { bodyMeasurementsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import type { BodyMeasurement } from '@/types'
import { nowIso, uid } from '@/lib/utils'
import { toast } from '@/stores/toastStore'

const FIELDS: { key: keyof BodyMeasurement; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'Peso', unit: 'kg' },
  { key: 'bodyFatPct', label: 'Grasa', unit: '%' },
  { key: 'chestCm', label: 'Pecho', unit: 'cm' },
  { key: 'waistCm', label: 'Cintura', unit: 'cm' },
  { key: 'hipsCm', label: 'Cadera', unit: 'cm' },
  { key: 'armCm', label: 'Brazo', unit: 'cm' },
  { key: 'thighCm', label: 'Muslo', unit: 'cm' },
]

export default function Measurements() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const entries = useLiveQuery(
    () =>
      userId
        ? bodyMeasurementsFor(userId)
            .toArray()
            .then((es) => es.sort((a, b) => b.takenAt.localeCompare(a.takenAt)))
        : [],
    [userId]
  )

  const weightSeries = useMemo(
    () =>
      (entries ?? [])
        .filter((e) => e.weightKg != null)
        .map((e) => ({
          label: new Date(e.takenAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' }),
          date: e.takenAt,
          kg: e.weightKg,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  )

  const handleSave = async () => {
    if (!userId) return
    const numbers = FIELDS.reduce<Partial<BodyMeasurement>>((acc, f) => {
      const raw = form[f.key as string]
      if (raw != null && raw !== '') acc[f.key] = Number(raw) as never
      return acc
    }, {})
    if (Object.keys(numbers).length === 0) {
      toast.error('Nada para guardar', 'Completá al menos un campo.')
      return
    }
    setSaving(true)
    try {
      const entry: BodyMeasurement = {
        id: uid(),
        userId,
        takenAt: nowIso(),
        ...numbers,
        dirty: 1,
        updatedAt: nowIso(),
      }
      await db.bodyMeasurements.add(entry)
      // Si registraste peso, actualizá el peso corporal del perfil también
      if (numbers.weightKg) await db.profile.update(userId, { bodyWeightKg: numbers.weightKg })
      setForm({})
      toast.success('Medida registrada', 'Seguí midiendo tu progreso.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await softDelete('bodyMeasurements', id)
    toast.info('Medida eliminada')
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button onClick={() => navigate('/perfil')} className="p-1 text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Ruler size={18} className="text-accent" />
          <h1 className="font-semibold">Medidas corporales</h1>
        </div>
      </header>

      <div className="space-y-6 px-4 py-4">
        {/* Gráfico de evolución de peso */}
        {weightSeries.length >= 2 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">
              Evolución del peso (kg)
            </h2>
            <div className="h-48 rounded-xl bg-surface p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightSeries} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#606060" fontSize={11} />
                  <YAxis stroke="#606060" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1C1C', border: '1px solid #383838', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#A0A0A0' }}
                    formatter={(v) => [`${v} kg`, 'Peso']}
                  />
                  <Line type="monotone" dataKey="kg" stroke="#E8FF47" strokeWidth={2} dot={{ fill: '#E8FF47', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Formulario nueva medida */}
        <section className="rounded-2xl bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-2">
            Nueva medida
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key as string}>
                <label className="mb-1 block text-xs text-ink-3">
                  {f.label} ({f.unit})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form[f.key as string] ?? ''}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key as string]: e.target.value }))}
                  placeholder="—"
                  className="w-full rounded-lg bg-surface-2 px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-bold text-bg disabled:opacity-40"
          >
            <Plus size={18} /> {saving ? 'Guardando…' : 'Guardar medida'}
          </button>
        </section>

        {/* Historial */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-2">
            Historial
          </h2>
          <div className="space-y-2">
            {(entries ?? []).map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {new Date(e.takenAt).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-2">
                    {FIELDS.filter((f) => e[f.key] != null).map((f) => (
                      <span key={f.key as string}>
                        <span className="text-ink-3">{f.label}:</span>{' '}
                        <span className="font-mono">{String(e[f.key])}</span>
                        {f.unit}
                      </span>
                    ))}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="shrink-0 p-1.5 text-danger/60 active:text-danger"
                  aria-label="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {entries?.length === 0 && (
              <p className="rounded-xl bg-surface p-8 text-center text-sm text-ink-3">
                Todavía no registraste medidas.
                <br />
                Empezá con tu peso de hoy.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
