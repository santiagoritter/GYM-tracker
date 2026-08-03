import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/db/schema'
import { personalRecordsFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
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
      <div className="rounded-xl bg-surface p-8 text-center">
        <p className="text-sm text-ink-2">
          Para calcular tus niveles de fuerza necesitamos tu sexo, peso corporal y fecha
          de nacimiento.
        </p>
        <Link
          to="/perfil"
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg"
        >
          Completar perfil
        </Link>
      </div>
    )
  }

  const withData = results.filter((r) => r.result.level !== 'no_data')

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-3">
        Ratio 1RM / peso corporal, ajustado por edad y sexo. Entrená los básicos con
        barra para desbloquear cada nivel.
      </p>

      {results.map(({ key, label, oneRm, result }) => (
        <div key={key} className="rounded-xl bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">{label}</p>
            <span
              className={
                result.level === 'no_data'
                  ? 'text-sm text-ink-3'
                  : 'text-sm font-semibold text-accent'
              }
            >
              {LEVEL_LABELS[result.level]}
            </span>
          </div>

          {result.level === 'no_data' ? (
            <p className="mt-1 text-xs text-ink-3">Sin entrenos registrados</p>
          ) : (
            <>
              <p className="mt-1 font-mono text-sm text-ink-2">
                1RM est. {oneRm} kg · ratio {result.ratio}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${result.progress * 100}%` }}
                />
              </div>
              {result.nextLevel && result.kgToNext > 0 && (
                <p className="mt-1.5 text-xs text-ink-3">
                  Faltan <span className="font-mono font-bold text-ink-2">{result.kgToNext} kg</span>{' '}
                  para {LEVEL_LABELS[result.nextLevel]}
                </p>
              )}
            </>
          )}
        </div>
      ))}

      {withData.length === 0 && (
        <p className="rounded-xl bg-surface p-6 text-center text-sm text-ink-3">
          Registrá entrenos de sentadilla, banca, peso muerto, militar o remo para ver tu
          nivel.
        </p>
      )}
    </div>
  )
}
