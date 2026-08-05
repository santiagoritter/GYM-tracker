import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Calculator as CalculatorIcon } from 'lucide-react'
import { db } from '@/db/schema'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { Card, Row, SectionHeader } from '@/components/ui/Card'
import { BY_GOAL } from '@/lib/recommendation'
import { calc1RM, calc1RMBrzycki, displayToKg, formatWeight } from '@/lib/utils'
import type { FitnessGoal } from '@/types'

const GOAL_LABELS: Record<FitnessGoal, string> = {
  strength: 'Fuerza máxima',
  mass: 'Ganar masa',
  endurance: 'Resistencia',
  health: 'Salud general',
  general: 'Todo un poco',
}

const GOAL_ORDER: FitnessGoal[] = ['strength', 'mass', 'general', 'health', 'endurance']

export default function Calculator() {
  const navigate = useNavigate()
  const userId = useCurrentUserId()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const units = profile?.units ?? 'kg'

  const [weightInput, setWeightInput] = useState('100')
  const [repsInput, setRepsInput] = useState('5')

  const weightDisplay = Number(weightInput) || 0
  const reps = Math.floor(Number(repsInput)) || 0
  const weightKg = displayToKg(weightDisplay, units)
  const valid = weightKg > 0 && reps > 0

  const epley1RM = valid ? calc1RM(weightKg, reps) : 0
  const brzycki1RM = valid ? calc1RMBrzycki(weightKg, reps) : 0

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-line px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/ajustes')}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <CalculatorIcon size={18} className="text-accent" />
          <h1 className="font-semibold">Calculadora de 1RM</h1>
        </div>
      </header>

      <div className="space-y-5 px-4 py-4">
        <section>
          <SectionHeader title="Serie de referencia" />
          <Card className="flex gap-2 p-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-medium text-ink-2">
                Peso ({units})
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={weightInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setWeightInput(e.target.value)}
                className="h-11 w-full rounded-xs bg-surface-2 px-3 text-center font-mono tabular-nums outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-medium text-ink-2">
                Repeticiones
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={repsInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRepsInput(e.target.value)}
                className="h-11 w-full rounded-xs bg-surface-2 px-3 text-center font-mono tabular-nums outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader title="1RM estimado" />
          <Card>
            <Row>
              <span className="min-w-0 flex-1 text-[15px]">Epley</span>
              <span className="font-mono text-[15px] font-semibold tabular-nums">
                {valid ? `${formatWeight(epley1RM, units)} ${units}` : '—'}
              </span>
            </Row>
            <Row>
              <span className="min-w-0 flex-1 text-[15px]">Brzycki</span>
              <span className="font-mono text-[15px] font-semibold tabular-nums">
                {valid ? `${formatWeight(brzycki1RM, units)} ${units}` : '—'}
              </span>
            </Row>
          </Card>
          <p className="mt-2 px-1 text-[13px] leading-relaxed text-ink-3">
            Epley es la que usa el recomendador en tus entrenos. Brzycki suele
            ser más precisa entre 2 y 6 repeticiones — a partir de ahí se
            capa, porque deja de ser confiable.
          </p>
        </section>

        {valid && (
          <section>
            <SectionHeader title="Peso sugerido por objetivo" />
            <Card>
              {GOAL_ORDER.map((goal) => {
                const rx = BY_GOAL[goal]
                const targetKg = epley1RM * rx.percent1RM
                return (
                  <Row key={goal}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px]">{GOAL_LABELS[goal]}</p>
                      <p className="text-[13px] text-ink-3">
                        {rx.repsMin}–{rx.repsMax} reps · {Math.round(rx.percent1RM * 100)}% de 1RM
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[15px] font-semibold tabular-nums">
                      {formatWeight(targetKg, units)} {units}
                    </span>
                  </Row>
                )
              })}
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}
