import { useEffect } from 'react'
import { X, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Exercise } from '@/types'
import { getExerciseInfo } from '@/data/exerciseInfo'
import MuscleBodySVG from './MuscleBodySVG'
import EquipmentIcon from './EquipmentIcon'
import { cn } from '@/lib/utils'

interface Props {
  exercise: Exercise | null
  onClose: () => void
}

const EQUIPMENT_LABEL: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  band: 'Banda',
  kettlebell: 'Kettlebell',
  other: 'Otro',
}

const PATTERN_LABEL: Record<string, string> = {
  push: 'Empuje',
  pull: 'Jalón',
  squat: 'Sentadilla',
  hinge: 'Bisagra',
  carry: 'Acarreo',
  isolation: 'Aislamiento',
  other: 'Otro',
}

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: 'text-success',
  intermediate: 'text-warning',
  advanced: 'text-danger',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

const MUSCLE_LABEL: Record<string, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazos',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  core: 'Core',
  cardio: 'Cardio',
}

export default function ExerciseDetailSheet({ exercise, onClose }: Props) {
  const info = exercise ? getExerciseInfo(exercise.id) : null

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (exercise) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [exercise])

  if (!exercise) return null

  return (
    <>
      {/* Overlay oscuro */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 animate-sheet-in rounded-t-3xl bg-surface shadow-float overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-line-2" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-1 pb-3">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold leading-tight">{exercise.name}</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">{exercise.nameEn}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-fill text-ink-2 active:bg-fill-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
          <span className={cn('text-[12px] font-semibold', DIFFICULTY_COLOR[exercise.difficulty])}>
            {DIFFICULTY_LABEL[exercise.difficulty]}
          </span>
          <span className="text-ink-4">·</span>
          <span className="flex items-center gap-1 text-[12px] text-ink-2">
            <EquipmentIcon equipment={exercise.equipment} size={13} />
            {EQUIPMENT_LABEL[exercise.equipment]}
          </span>
          <span className="text-ink-4">·</span>
          <span className="text-[12px] text-ink-2">{PATTERN_LABEL[exercise.pattern]}</span>
        </div>

        {/* Contenido scrolleable */}
        <div className="max-h-[70vh] overflow-y-auto overscroll-contain px-5 pb-8 space-y-6">
          {/* Diagrama muscular */}
          <div className="rounded-2xl bg-surface-2 p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-3">
              Músculos involucrados
            </h3>
            <div className="mx-auto max-w-[220px]">
              <MuscleBodySVG
                primary={exercise.musclePrimary}
                secondary={exercise.muscleSecondary}
                size={100}
              />
            </div>
            <div className="mt-4 space-y-3">
              {exercise.musclePrimary.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-accent">Primarios</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.musclePrimary.map((m) => (
                      <span key={m} className="rounded-lg bg-accent/15 px-2.5 py-1 text-[12px] font-medium text-accent">
                        {MUSCLE_LABEL[m] ?? m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {exercise.muscleSecondary.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-ink-2">Secundarios</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.muscleSecondary.map((m) => (
                      <span key={m} className="rounded-lg bg-fill px-2.5 py-1 text-[12px] text-ink-2">
                        {MUSCLE_LABEL[m] ?? m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          {info?.description && (
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-3">
                Descripción
              </h3>
              <p className="text-[15px] leading-relaxed text-ink-2">{info.description}</p>
            </div>
          )}

          {/* Tips */}
          {info?.tips && info.tips.length > 0 && (
            <div>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-3">
                Técnica
              </h3>
              <div className="space-y-2.5">
                {info.tips.map((tip, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                    <p className="text-[14px] leading-snug text-ink-2">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errores comunes */}
          {info?.commonMistakes && info.commonMistakes.length > 0 && (
            <div>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-3">
                Errores comunes
              </h3>
              <div className="space-y-2.5">
                {info.commonMistakes.map((m, i) => (
                  <div key={i} className="flex gap-3">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
                    <p className="text-[14px] leading-snug text-ink-2">{m}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ejercicio sin info */}
          {!info && (
            <p className="text-[14px] text-ink-3 text-center py-4">
              Descripción detallada próximamente.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
