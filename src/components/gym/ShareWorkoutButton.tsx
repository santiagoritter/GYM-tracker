import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { MUSCLE_LABELS } from '@/components/gym/MuscleChip'
import { useMuscleGroupLevels } from '@/hooks/useMuscleGroupLevels'
import { capitalizeFirst, formatTotalDuration } from '@/lib/formatStats'
import { renderShareCard, shareImage } from '@/lib/shareCard'
import { formatWeight } from '@/lib/utils'
import { toast } from '@/stores/toastStore'

/**
 * "Compartir" en la pantalla de resumen del entreno: genera la tarjeta (ver
 * lib/shareCard.ts) y abre la hoja de compartir. Es lo que convierte cada
 * entreno en una historia con la marca de Repe.
 */
export default function ShareWorkoutButton({
  workoutName,
  startedAt,
  volumeKg,
  setsCount,
  prs,
  units,
}: {
  workoutName: string
  startedAt: string
  volumeKg: number
  setsCount: number
  prs: { name: string; weightKg: number; reps: number }[]
  units: 'kg' | 'lbs'
}) {
  const [busy, setBusy] = useState(false)
  const { levels } = useMuscleGroupLevels()

  const share = async () => {
    if (busy) return
    setBusy(true)
    try {
      const started = new Date(startedAt)
      const blob = await renderShareCard({
        workoutName,
        dateLabel: capitalizeFirst(
          started.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
        ),
        durationLabel: formatTotalDuration((Date.now() - started.getTime()) / 1000),
        volumeLabel: volumeKg > 0 ? `${formatWeight(volumeKg, units)} ${units}` : '—',
        setsLabel: String(setsCount),
        prs: prs.map((p) => ({ name: p.name, value: `${formatWeight(p.weightKg, units)} ${units} × ${p.reps}` })),
        radar: levels.length >= 3 ? levels.map((l) => ({ label: MUSCLE_LABELS[l.muscle], progress: l.result.progress })) : null,
      })
      await shareImage(blob, `repe-entreno-${started.toISOString().slice(0, 10)}.png`, 'Mi entreno en Repe')
    } catch (e) {
      toast.error('No se pudo compartir', e instanceof Error ? e.message : 'Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={share}
      disabled={busy}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-fill font-semibold text-ink transition-colors active:bg-fill-2 disabled:opacity-60"
    >
      <Share2 size={20} /> {busy ? 'Preparando…' : 'Compartir entreno'}
    </button>
  )
}
