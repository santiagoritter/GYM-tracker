import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Dumbbell, UserCog } from 'lucide-react'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { Card, EmptyState, Row } from '@/components/ui/Card'
import {
  LEVEL_LABELS,
  STANDARDS,
  ageFromDob,
  getStrengthLevel,
} from '@/lib/strengthStandards'

export function StrengthLevels() {
  const userId = useCurrentUserId()
  const profile = useLiveQuery(
    () => (userId ? db.profile.get(userId) : undefined),
    [userId]
  )
  const prs = useLiveQuery(
    () => (userId ? personalRecordsFor(userId).toArray() : []),
    [userId]
  ) ?? []

  const prMap = useMemo(() => new Map(prs.map((p) => [p.exerciseId, p])), [prs])

  const profileComplete = profile?.sex && profile?.bodyWeightKg && profile?.dob

  const results = useMemo(() => {
    if (!profileComplete) return []
    const age = ageFromDob(profile!.dob!)
    return Object.keys(STANDARDS).map((key) => {
      const pr = prMap.get(key)
      return {
        key,
        label: STANDARDS[key].label,
        oneRm: pr?.oneRmKg ?? 0,
        result: getStrengthLevel(
          key,
          pr?.oneRmKg ?? 0,
          profile!.bodyWeightKg!,
          profile!.sex!,
          age
        ),
      }
    })
  }, [profileComplete, profile, prMap])

  if (!profileComplete) {
    return (
      <EmptyState
        icon={<UserCog size={28} />}
        title="Completá tu perfil"
        description="Para calcular tus niveles de fuerza necesitamos tu sexo, peso corporal y fecha de nacimiento."
        action={
          <Link
            to="/perfil"
            className="flex h-11 items-center rounded-sm bg-accent px-4 text-sm font-bold text-bg"
          >
            Completar perfil
          </Link>
        }
      />
    )
  }

  const withData = results.filter((r) => r.result.level !== 'no_data')

  return (
    <div className="space-y-3">
      <p className="px-1 text-[13px] text-ink-3">
        Ratio 1RM / peso corporal, ajustado por edad y sexo. Entrená los básicos con
        barra para desbloquear cada nivel.
      </p>

      {withData.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={28} />}
          title="Sin entrenos registrados"
          description="Registrá sentadilla, banca, peso muerto, militar o remo para ver tu nivel."
        />
      ) : (
        <Card>
          {results.map(({ key, label, oneRm, result }) => (
            <Row key={key} className="flex-col items-stretch gap-1">
              <div className="flex w-full items-center justify-between">
                <p className="text-[15px] font-medium">{label}</p>
                <span
                  className={
                    result.level === 'no_data'
                      ? 'text-[13px] text-ink-3'
                      : 'text-[13px] font-semibold text-accent'
                  }
                >
                  {LEVEL_LABELS[result.level]}
                </span>
              </div>

              {result.level === 'no_data' ? (
                <p className="text-[12px] text-ink-3">Sin entrenos registrados</p>
              ) : (
                <>
                  <p className="font-mono text-[13px] tabular-nums text-ink-2">
                    1RM est. {oneRm} kg · ratio {result.ratio}
                  </p>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full origin-left rounded-full bg-accent transition-transform duration-300"
                      style={{ transform: `scaleX(${result.progress})` }}
                    />
                  </div>
                  {result.nextLevel && result.kgToNext > 0 && (
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      Faltan{' '}
                      <span className="font-mono font-bold tabular-nums text-ink-2">
                        {result.kgToNext} kg
                      </span>{' '}
                      para {LEVEL_LABELS[result.nextLevel]}
                    </p>
                  )}
                </>
              )}
            </Row>
          ))}
        </Card>
      )}
    </div>
  )
}
