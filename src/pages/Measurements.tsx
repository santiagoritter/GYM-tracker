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
import { useChartColors } from '@/hooks/useChartColors'
import { Card, EmptyState, Row, SectionHeader } from '@/components/ui/Card'
import type { BodyMeasurement, LocalProfile } from '@/types'
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
  const chartColors = useChartColors()
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
      // Si registraste peso o grasa corporal, actualizá el perfil también —
      // son el valor "actual" que usan el recomendador y los niveles de
      // fuerza, no hace falta pedirlos dos veces.
      const profilePatch: Partial<LocalProfile> = {}
      if (numbers.weightKg) profilePatch.bodyWeightKg = numbers.weightKg
      if (numbers.bodyFatPct) profilePatch.bodyFatPct = numbers.bodyFatPct
      if (Object.keys(profilePatch).length > 0) await db.profile.update(userId, profilePatch)
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
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/perfil')}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
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
            <SectionHeader title="Evolución del peso" />
            <Card className="p-3">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightSeries} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="label" stroke={chartColors.axis} fontSize={11} />
                    <YAxis stroke={chartColors.axis} fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: chartColors.tooltipText }}
                      formatter={(v) => [`${v} kg`, 'Peso']}
                    />
                    <Line type="monotone" dataKey="kg" stroke={chartColors.accent} strokeWidth={2} dot={{ fill: chartColors.accent, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>
        )}

        {/* Formulario nueva medida */}
        <section>
          <SectionHeader title="Nueva medida" />
          <Card className="p-4">
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
                    className="h-11 w-full rounded-sm bg-surface-2 px-3 font-mono text-[15px] tabular-nums outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-accent font-bold text-bg disabled:opacity-40"
            >
              <Plus size={18} /> {saving ? 'Guardando…' : 'Guardar medida'}
            </button>
          </Card>
        </section>

        {/* Historial */}
        <section>
          <SectionHeader title="Historial" />
          {(entries?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Ruler size={28} />}
              title="Todavía no registraste medidas"
              description="Empezá con tu peso de hoy."
            />
          ) : (
            <Card>
              {entries!.map((e) => (
                <Row key={e.id}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">
                      {new Date(e.takenAt).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-ink-2">
                      {FIELDS.filter((f) => e[f.key] != null).map((f) => (
                        <span key={f.key as string}>
                          <span className="text-ink-3">{f.label}:</span>{' '}
                          <span className="font-mono tabular-nums">{String(e[f.key])}</span>
                          {f.unit}
                        </span>
                      ))}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    aria-label="Eliminar medida"
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-danger/70 active:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </Row>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
