import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, useReducedMotion } from 'motion/react'
import { X, CheckCircle2, AlertTriangle, Camera, ListPlus, Trash2, PlayCircle } from 'lucide-react'
import type { Exercise } from '@/types'
import { getExerciseInfo, getTechniqueVideoUrl } from '@/data/exerciseInfo'
import { getExerciseSetup, SETUP_LABEL } from '@/data/exerciseSetup'
import SetupIllustration from './SetupIllustration'
import { db } from '@/db/schema'
import { softDelete } from '@/db/mutations'
import { exercisePhotoFor } from '@/db/scoped'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'
import { compressImage } from '@/lib/photos'
import { DIFFICULTY_COLOR, DIFFICULTY_LABELS } from '@/lib/difficulty'
import { sheetItemVariants, sheetItemVariantsReduced } from '@/lib/motionVariants'
import { nowIso } from '@/lib/utils'
import MuscleBodySVG from './MuscleBodySVG'
import EquipmentIcon from './EquipmentIcon'
import AddToRoutineSheet from './AddToRoutineSheet'
import ResponsiveSheet from '@/components/ui/ResponsiveSheet'
import { useSheetDrag } from '@/hooks/useSheetDrag'
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

/** Foto de referencia personal para el ejercicio (ej: la máquina de tu gym). */
function ExercisePhotoSection({ exerciseId }: { exerciseId: string }) {
  const userId = useCurrentUserId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  const photo = useLiveQuery(
    () => (userId ? exercisePhotoFor(userId, exerciseId) : undefined),
    [userId, exerciseId]
  )

  useEffect(() => {
    // El blob es opcional desde v9: en un dispositivo nuevo la fila baja del
    // servidor sin los bytes y se descargan aparte (cola de Storage).
    if (!photo?.blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(photo.blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photo])

  const handleFile = async (file: File) => {
    if (!userId) return
    setSaving(true)
    try {
      const blob = await compressImage(file)
      await db.exercisePhotos.put({
        id: `${userId}_${exerciseId}`,
        userId,
        exerciseId,
        blob,
        uploaded: 0,
        createdAt: nowIso(),
        dirty: 1,
        updatedAt: nowIso(),
      })
    } catch {
      alert('No se pudo procesar la imagen')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!userId) return
    await softDelete('exercisePhotos', `${userId}_${exerciseId}`)
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-ink-2">
        Tu foto de referencia
      </h3>
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
      {url ? (
        <div className="relative overflow-hidden rounded-xl">
          <img src={url} alt="" className="h-48 w-full object-cover" />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
              title="Reemplazar"
            >
              <Camera size={15} />
            </button>
            <button
              onClick={handleDelete}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-danger"
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-2 py-4 text-[13px] font-medium text-ink-2 active:bg-surface-3 disabled:opacity-50"
        >
          <Camera size={16} /> {saving ? 'Guardando…' : 'Agregar foto (ej: la máquina de tu gym)'}
        </button>
      )}
    </div>
  )
}

/** Cómo identificar la máquina o el puesto al llegar al gimnasio. */
function SetupSection({ exercise }: { exercise: Exercise }) {
  const kind = getExerciseSetup(exercise.id, exercise.equipment)
  return (
    <div className="flex items-center gap-4">
      <SetupIllustration kind={kind} className="h-20 w-24 shrink-0" />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink-2">
          Dónde se hace
        </h3>
        <p className="mt-1 text-[15px] font-medium leading-snug">{SETUP_LABEL[kind]}</p>
      </div>
    </div>
  )
}

export default function ExerciseDetailSheet({ exercise, onClose }: Props) {
  const info = exercise ? getExerciseInfo(exercise.id) : null
  const reduced = useReducedMotion()
  const { panelDragProps, handleDragProps } = useSheetDrag(onClose)
  const [addingToRoutine, setAddingToRoutine] = useState(false)

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
    // `nested`: este sheet se abre sobre Exercises.tsx, cuya lista
    // virtualizada ya renderiza varias insignias con backdrop-blur-xs
    // propio detrás — es el sheet con más blur acumulado atrás, y encima
    // el único que puede tener OTRO sheet (AddToRoutineSheet) abierto
    // arriba. Reportado: pantalla negra en Android al abrir "Agregar a
    // rutina" desde acá; sacar este blur reduce la carga de composición
    // en el escenario más pesado de la app. Ver ResponsiveSheet.tsx.
    <ResponsiveSheet
      onClose={onClose}
      dragProps={panelDragProps}
      nested
      panelClassName="overflow-hidden"
    >
      {/* Drag handle + header + badges: primer grupo del stagger */}
      <motion.div variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}>
          <div className="flex justify-center pt-3 pb-1" {...handleDragProps}>
            <div className="h-1 w-10 rounded-full bg-line-2" />
          </div>

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

          <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
            <span className={cn('text-[12px] font-semibold', DIFFICULTY_COLOR[exercise.difficulty])}>
              {DIFFICULTY_LABELS[exercise.difficulty]}
            </span>
            <span className="text-ink-4">·</span>
            <span className="flex items-center gap-1 text-[12px] text-ink-2">
              <EquipmentIcon equipment={exercise.equipment} size={13} />
              {EQUIPMENT_LABEL[exercise.equipment]}
            </span>
            <span className="text-ink-4">·</span>
            <span className="text-[12px] text-ink-2">{PATTERN_LABEL[exercise.pattern]}</span>
          </div>
        </motion.div>

        {/* Contenido scrolleable: segundo grupo del stagger, entra como una
            sola unidad (no cascadea cada card interna — con hasta una
            decena de tips/errores comunes, animar cada uno por separado se
            sentiría lento en vez de pulido). */}
        <motion.div
          variants={reduced ? sheetItemVariantsReduced : sheetItemVariants}
          className="max-h-[70vh] overflow-y-auto overscroll-contain px-5 pb-8 space-y-6"
        >
          {/* Ver la técnica en video. Es una búsqueda y no un ID de video a
              propósito: con 107 ejercicios, un ID que el autor borra deja un
              link muerto que nadie va a notar hasta que alguien lo toque. */}
          <a
            href={getTechniqueVideoUrl(exercise.name, info)}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-[15px] font-bold text-bg active:bg-accent-dim"
          >
            <PlayCircle size={18} /> Ver la técnica en video
          </a>

          <button
            onClick={() => setAddingToRoutine(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line-2 py-3 text-[15px] font-semibold text-ink-2 active:bg-surface-2"
          >
            <ListPlus size={18} /> Agregar a rutina
          </button>

          {/* Cómo reconocer la máquina */}
          <SetupSection exercise={exercise} />

          {/* Foto de referencia */}
          <ExercisePhotoSection exerciseId={exercise.id} />

          {/* Diagrama muscular */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-2">
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
                  <p className="mb-1.5 text-[12px] font-medium text-accent">Primarios</p>
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
                  <p className="mb-1.5 text-[12px] font-medium text-ink-2">Secundarios</p>
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
              <h3 className="mb-2 text-sm font-semibold text-ink-2">
                Descripción
              </h3>
              <p className="text-[15px] leading-relaxed text-ink-2">{info.description}</p>
            </div>
          )}

          {/* Tips */}
          {info?.tips && info.tips.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-ink-2">
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
              <h3 className="mb-3 text-sm font-semibold text-ink-2">
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
        </motion.div>

      {addingToRoutine && (
        <AddToRoutineSheet exercise={exercise} onClose={() => setAddingToRoutine(false)} />
      )}
    </ResponsiveSheet>
  )
}
