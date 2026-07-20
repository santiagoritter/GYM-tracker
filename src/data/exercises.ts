import type { Exercise } from '@/types'

// IDs como slugs estables (no UUIDs): permiten que un QR compartido
// referencie el mismo ejercicio en cualquier instalación de la app.
export const EXERCISES_SEED: Exercise[] = [
  // ── Pecho ──────────────────────────────────────────────
  { id: 'bench-press', name: 'Press de banca', nameEn: 'Bench Press', musclePrimary: ['chest'], muscleSecondary: ['triceps', 'shoulders'], equipment: 'barbell', pattern: 'push', difficulty: 'intermediate' },
  { id: 'incline-bench-press', name: 'Press inclinado con barra', nameEn: 'Incline Bench Press', musclePrimary: ['chest'], muscleSecondary: ['triceps', 'shoulders'], equipment: 'barbell', pattern: 'push', difficulty: 'intermediate' },
  { id: 'db-bench-press', name: 'Press de banca con mancuernas', nameEn: 'Dumbbell Bench Press', musclePrimary: ['chest'], muscleSecondary: ['triceps', 'shoulders'], equipment: 'dumbbell', pattern: 'push', difficulty: 'beginner' },
  { id: 'db-incline-press', name: 'Press inclinado con mancuernas', nameEn: 'Incline Dumbbell Press', musclePrimary: ['chest'], muscleSecondary: ['triceps', 'shoulders'], equipment: 'dumbbell', pattern: 'push', difficulty: 'beginner' },
  { id: 'chest-fly-machine', name: 'Aperturas en máquina (peck deck)', nameEn: 'Machine Chest Fly', musclePrimary: ['chest'], muscleSecondary: [], equipment: 'machine', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'cable-fly', name: 'Aperturas con cable', nameEn: 'Cable Fly', musclePrimary: ['chest'], muscleSecondary: [], equipment: 'cable', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'push-up', name: 'Flexiones de brazos', nameEn: 'Push-Up', musclePrimary: ['chest'], muscleSecondary: ['triceps', 'shoulders', 'core'], equipment: 'bodyweight', pattern: 'push', difficulty: 'beginner' },
  { id: 'dips-chest', name: 'Fondos en paralelas (pecho)', nameEn: 'Chest Dips', musclePrimary: ['chest'], muscleSecondary: ['triceps', 'shoulders'], equipment: 'bodyweight', pattern: 'push', difficulty: 'intermediate' },
  { id: 'chest-press-machine', name: 'Press de pecho en máquina', nameEn: 'Machine Chest Press', musclePrimary: ['chest'], muscleSecondary: ['triceps'], equipment: 'machine', pattern: 'push', difficulty: 'beginner' },

  // ── Espalda ────────────────────────────────────────────
  { id: 'deadlift', name: 'Peso muerto', nameEn: 'Deadlift', musclePrimary: ['back', 'hamstrings', 'glutes'], muscleSecondary: ['core', 'forearms'], equipment: 'barbell', pattern: 'hinge', difficulty: 'advanced' },
  { id: 'barbell-row', name: 'Remo con barra', nameEn: 'Barbell Row', musclePrimary: ['back'], muscleSecondary: ['biceps', 'core'], equipment: 'barbell', pattern: 'pull', difficulty: 'intermediate' },
  { id: 'pull-up', name: 'Dominadas', nameEn: 'Pull-Up', musclePrimary: ['back'], muscleSecondary: ['biceps', 'core'], equipment: 'bodyweight', pattern: 'pull', difficulty: 'intermediate' },
  { id: 'chin-up', name: 'Dominadas supinas', nameEn: 'Chin-Up', musclePrimary: ['back', 'biceps'], muscleSecondary: ['core'], equipment: 'bodyweight', pattern: 'pull', difficulty: 'intermediate' },
  { id: 'lat-pulldown', name: 'Jalón al pecho', nameEn: 'Lat Pulldown', musclePrimary: ['back'], muscleSecondary: ['biceps'], equipment: 'cable', pattern: 'pull', difficulty: 'beginner' },
  { id: 'seated-cable-row', name: 'Remo sentado en polea', nameEn: 'Seated Cable Row', musclePrimary: ['back'], muscleSecondary: ['biceps'], equipment: 'cable', pattern: 'pull', difficulty: 'beginner' },
  { id: 'db-row', name: 'Remo con mancuerna', nameEn: 'Dumbbell Row', musclePrimary: ['back'], muscleSecondary: ['biceps', 'core'], equipment: 'dumbbell', pattern: 'pull', difficulty: 'beginner' },
  { id: 't-bar-row', name: 'Remo en T', nameEn: 'T-Bar Row', musclePrimary: ['back'], muscleSecondary: ['biceps'], equipment: 'barbell', pattern: 'pull', difficulty: 'intermediate' },
  { id: 'rack-pull', name: 'Rack pull', nameEn: 'Rack Pull', musclePrimary: ['back'], muscleSecondary: ['glutes', 'forearms'], equipment: 'barbell', pattern: 'hinge', difficulty: 'intermediate' },
  { id: 'straight-arm-pulldown', name: 'Pullover en polea', nameEn: 'Straight-Arm Pulldown', musclePrimary: ['back'], muscleSecondary: [], equipment: 'cable', pattern: 'isolation', difficulty: 'beginner' },

  // ── Hombros ────────────────────────────────────────────
  { id: 'overhead-press', name: 'Press militar', nameEn: 'Overhead Press', musclePrimary: ['shoulders'], muscleSecondary: ['triceps', 'core'], equipment: 'barbell', pattern: 'push', difficulty: 'intermediate' },
  { id: 'db-shoulder-press', name: 'Press de hombros con mancuernas', nameEn: 'Dumbbell Shoulder Press', musclePrimary: ['shoulders'], muscleSecondary: ['triceps'], equipment: 'dumbbell', pattern: 'push', difficulty: 'beginner' },
  { id: 'lateral-raise', name: 'Elevaciones laterales', nameEn: 'Lateral Raise', musclePrimary: ['shoulders'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'cable-lateral-raise', name: 'Elevaciones laterales en polea', nameEn: 'Cable Lateral Raise', musclePrimary: ['shoulders'], muscleSecondary: [], equipment: 'cable', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'rear-delt-fly', name: 'Pájaros (deltoide posterior)', nameEn: 'Rear Delt Fly', musclePrimary: ['shoulders'], muscleSecondary: ['back'], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'face-pull', name: 'Face pull', nameEn: 'Face Pull', musclePrimary: ['shoulders'], muscleSecondary: ['back'], equipment: 'cable', pattern: 'pull', difficulty: 'beginner' },
  { id: 'front-raise', name: 'Elevaciones frontales', nameEn: 'Front Raise', musclePrimary: ['shoulders'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'arnold-press', name: 'Press Arnold', nameEn: 'Arnold Press', musclePrimary: ['shoulders'], muscleSecondary: ['triceps'], equipment: 'dumbbell', pattern: 'push', difficulty: 'intermediate' },

  // ── Bíceps ─────────────────────────────────────────────
  { id: 'barbell-curl', name: 'Curl con barra', nameEn: 'Barbell Curl', musclePrimary: ['biceps'], muscleSecondary: ['forearms'], equipment: 'barbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'db-curl', name: 'Curl con mancuernas', nameEn: 'Dumbbell Curl', musclePrimary: ['biceps'], muscleSecondary: ['forearms'], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'hammer-curl', name: 'Curl martillo', nameEn: 'Hammer Curl', musclePrimary: ['biceps', 'forearms'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'incline-db-curl', name: 'Curl inclinado con mancuernas', nameEn: 'Incline Dumbbell Curl', musclePrimary: ['biceps'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'intermediate' },
  { id: 'preacher-curl', name: 'Curl en banco Scott', nameEn: 'Preacher Curl', musclePrimary: ['biceps'], muscleSecondary: [], equipment: 'barbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'cable-curl', name: 'Curl en polea', nameEn: 'Cable Curl', musclePrimary: ['biceps'], muscleSecondary: ['forearms'], equipment: 'cable', pattern: 'isolation', difficulty: 'beginner' },

  // ── Tríceps ────────────────────────────────────────────
  { id: 'triceps-pushdown', name: 'Extensión de tríceps en polea', nameEn: 'Triceps Pushdown', musclePrimary: ['triceps'], muscleSecondary: [], equipment: 'cable', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'skull-crusher', name: 'Press francés', nameEn: 'Skull Crusher', musclePrimary: ['triceps'], muscleSecondary: [], equipment: 'barbell', pattern: 'isolation', difficulty: 'intermediate' },
  { id: 'overhead-triceps-ext', name: 'Extensión de tríceps sobre la cabeza', nameEn: 'Overhead Triceps Extension', musclePrimary: ['triceps'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'close-grip-bench', name: 'Press de banca agarre cerrado', nameEn: 'Close-Grip Bench Press', musclePrimary: ['triceps'], muscleSecondary: ['chest', 'shoulders'], equipment: 'barbell', pattern: 'push', difficulty: 'intermediate' },
  { id: 'dips-triceps', name: 'Fondos en paralelas (tríceps)', nameEn: 'Triceps Dips', musclePrimary: ['triceps'], muscleSecondary: ['chest', 'shoulders'], equipment: 'bodyweight', pattern: 'push', difficulty: 'intermediate' },

  // ── Cuádriceps ─────────────────────────────────────────
  { id: 'squat', name: 'Sentadilla', nameEn: 'Back Squat', musclePrimary: ['quads', 'glutes'], muscleSecondary: ['hamstrings', 'core'], equipment: 'barbell', pattern: 'squat', difficulty: 'intermediate' },
  { id: 'front-squat', name: 'Sentadilla frontal', nameEn: 'Front Squat', musclePrimary: ['quads'], muscleSecondary: ['glutes', 'core'], equipment: 'barbell', pattern: 'squat', difficulty: 'advanced' },
  { id: 'leg-press', name: 'Prensa de piernas', nameEn: 'Leg Press', musclePrimary: ['quads', 'glutes'], muscleSecondary: ['hamstrings'], equipment: 'machine', pattern: 'squat', difficulty: 'beginner' },
  { id: 'leg-extension', name: 'Extensión de piernas', nameEn: 'Leg Extension', musclePrimary: ['quads'], muscleSecondary: [], equipment: 'machine', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'goblet-squat', name: 'Sentadilla goblet', nameEn: 'Goblet Squat', musclePrimary: ['quads', 'glutes'], muscleSecondary: ['core'], equipment: 'dumbbell', pattern: 'squat', difficulty: 'beginner' },
  { id: 'bulgarian-split-squat', name: 'Sentadilla búlgara', nameEn: 'Bulgarian Split Squat', musclePrimary: ['quads', 'glutes'], muscleSecondary: ['hamstrings', 'core'], equipment: 'dumbbell', pattern: 'squat', difficulty: 'intermediate' },
  { id: 'lunge', name: 'Estocadas', nameEn: 'Lunge', musclePrimary: ['quads', 'glutes'], muscleSecondary: ['hamstrings', 'core'], equipment: 'dumbbell', pattern: 'squat', difficulty: 'beginner' },
  { id: 'hack-squat', name: 'Sentadilla hack', nameEn: 'Hack Squat', musclePrimary: ['quads'], muscleSecondary: ['glutes'], equipment: 'machine', pattern: 'squat', difficulty: 'intermediate' },

  // ── Femorales / Glúteos ────────────────────────────────
  { id: 'romanian-deadlift', name: 'Peso muerto rumano', nameEn: 'Romanian Deadlift', musclePrimary: ['hamstrings', 'glutes'], muscleSecondary: ['back'], equipment: 'barbell', pattern: 'hinge', difficulty: 'intermediate' },
  { id: 'leg-curl', name: 'Curl femoral', nameEn: 'Leg Curl', musclePrimary: ['hamstrings'], muscleSecondary: [], equipment: 'machine', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'hip-thrust', name: 'Hip thrust', nameEn: 'Hip Thrust', musclePrimary: ['glutes'], muscleSecondary: ['hamstrings'], equipment: 'barbell', pattern: 'hinge', difficulty: 'beginner' },
  { id: 'glute-kickback', name: 'Patada de glúteo en polea', nameEn: 'Cable Glute Kickback', musclePrimary: ['glutes'], muscleSecondary: [], equipment: 'cable', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'good-morning', name: 'Buenos días', nameEn: 'Good Morning', musclePrimary: ['hamstrings', 'glutes'], muscleSecondary: ['back'], equipment: 'barbell', pattern: 'hinge', difficulty: 'advanced' },
  { id: 'hip-abduction', name: 'Abducción de cadera', nameEn: 'Hip Abduction', musclePrimary: ['glutes'], muscleSecondary: [], equipment: 'machine', pattern: 'isolation', difficulty: 'beginner' },

  // ── Gemelos ────────────────────────────────────────────
  { id: 'standing-calf-raise', name: 'Elevación de talones de pie', nameEn: 'Standing Calf Raise', musclePrimary: ['calves'], muscleSecondary: [], equipment: 'machine', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'seated-calf-raise', name: 'Elevación de talones sentado', nameEn: 'Seated Calf Raise', musclePrimary: ['calves'], muscleSecondary: [], equipment: 'machine', pattern: 'isolation', difficulty: 'beginner' },

  // ── Core ───────────────────────────────────────────────
  { id: 'plank', name: 'Plancha', nameEn: 'Plank', musclePrimary: ['core'], muscleSecondary: [], equipment: 'bodyweight', pattern: 'other', difficulty: 'beginner' },
  { id: 'crunch', name: 'Abdominales (crunch)', nameEn: 'Crunch', musclePrimary: ['core'], muscleSecondary: [], equipment: 'bodyweight', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'hanging-leg-raise', name: 'Elevación de piernas colgado', nameEn: 'Hanging Leg Raise', musclePrimary: ['core'], muscleSecondary: ['forearms'], equipment: 'bodyweight', pattern: 'isolation', difficulty: 'intermediate' },
  { id: 'cable-crunch', name: 'Crunch en polea', nameEn: 'Cable Crunch', musclePrimary: ['core'], muscleSecondary: [], equipment: 'cable', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'russian-twist', name: 'Giro ruso', nameEn: 'Russian Twist', musclePrimary: ['core'], muscleSecondary: [], equipment: 'bodyweight', pattern: 'other', difficulty: 'beginner' },
  { id: 'ab-wheel', name: 'Rueda abdominal', nameEn: 'Ab Wheel Rollout', musclePrimary: ['core'], muscleSecondary: ['shoulders'], equipment: 'other', pattern: 'other', difficulty: 'advanced' },

  // ── Antebrazos / Trapecios ─────────────────────────────
  { id: 'barbell-shrug', name: 'Encogimientos con barra', nameEn: 'Barbell Shrug', musclePrimary: ['back'], muscleSecondary: ['forearms'], equipment: 'barbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'wrist-curl', name: 'Curl de muñeca', nameEn: 'Wrist Curl', musclePrimary: ['forearms'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'farmers-walk', name: 'Paseo del granjero', nameEn: "Farmer's Walk", musclePrimary: ['forearms', 'core'], muscleSecondary: ['back'], equipment: 'dumbbell', pattern: 'carry', difficulty: 'beginner' },

  // ── Kettlebell / Cardio ────────────────────────────────
  { id: 'kb-swing', name: 'Swing con kettlebell', nameEn: 'Kettlebell Swing', musclePrimary: ['glutes', 'hamstrings'], muscleSecondary: ['core', 'shoulders'], equipment: 'kettlebell', pattern: 'hinge', difficulty: 'intermediate' },
  { id: 'burpee', name: 'Burpees', nameEn: 'Burpee', musclePrimary: ['cardio'], muscleSecondary: ['chest', 'quads', 'core'], equipment: 'bodyweight', pattern: 'other', difficulty: 'intermediate' },
  { id: 'rowing-machine', name: 'Remo ergómetro', nameEn: 'Rowing Machine', musclePrimary: ['cardio'], muscleSecondary: ['back', 'quads'], equipment: 'machine', pattern: 'pull', difficulty: 'beginner' },
  { id: 'kb-goblet-clean', name: 'Clean con kettlebell', nameEn: 'Kettlebell Clean', musclePrimary: ['glutes', 'shoulders'], muscleSecondary: ['core', 'forearms'], equipment: 'kettlebell', pattern: 'hinge', difficulty: 'advanced' },
  { id: 'assault-bike', name: 'Bicicleta de aire', nameEn: 'Assault Bike', musclePrimary: ['cardio'], muscleSecondary: ['quads'], equipment: 'machine', pattern: 'other', difficulty: 'beginner' },
  { id: 'treadmill-run', name: 'Cinta de correr', nameEn: 'Treadmill Run', musclePrimary: ['cardio'], muscleSecondary: ['quads', 'calves'], equipment: 'machine', pattern: 'other', difficulty: 'beginner' },
  { id: 'jump-rope', name: 'Saltar la soga', nameEn: 'Jump Rope', musclePrimary: ['cardio'], muscleSecondary: ['calves'], equipment: 'other', pattern: 'other', difficulty: 'beginner' },

  // ── Pecho (ampliación) ─────────────────────────────────
  { id: 'decline-bench-press', name: 'Press declinado con barra', nameEn: 'Decline Bench Press', musclePrimary: ['chest'], muscleSecondary: ['triceps'], equipment: 'barbell', pattern: 'push', difficulty: 'intermediate' },
  { id: 'db-fly', name: 'Aperturas con mancuernas', nameEn: 'Dumbbell Fly', musclePrimary: ['chest'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'db-pullover', name: 'Pullover con mancuerna', nameEn: 'Dumbbell Pullover', musclePrimary: ['chest', 'back'], muscleSecondary: ['triceps'], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'intermediate' },
  { id: 'incline-push-up', name: 'Flexiones inclinadas', nameEn: 'Incline Push-Up', musclePrimary: ['chest'], muscleSecondary: ['triceps', 'shoulders'], equipment: 'bodyweight', pattern: 'push', difficulty: 'beginner' },
  { id: 'smith-bench-press', name: 'Press de banca en multipower', nameEn: 'Smith Machine Bench Press', musclePrimary: ['chest'], muscleSecondary: ['triceps'], equipment: 'machine', pattern: 'push', difficulty: 'beginner' },

  // ── Espalda (ampliación) ───────────────────────────────
  { id: 'sumo-deadlift', name: 'Peso muerto sumo', nameEn: 'Sumo Deadlift', musclePrimary: ['glutes', 'hamstrings', 'back'], muscleSecondary: ['quads', 'forearms'], equipment: 'barbell', pattern: 'hinge', difficulty: 'advanced' },
  { id: 'pendlay-row', name: 'Remo Pendlay', nameEn: 'Pendlay Row', musclePrimary: ['back'], muscleSecondary: ['biceps', 'core'], equipment: 'barbell', pattern: 'pull', difficulty: 'advanced' },
  { id: 'chest-supported-row', name: 'Remo con apoyo en banco', nameEn: 'Chest-Supported Row', musclePrimary: ['back'], muscleSecondary: ['biceps'], equipment: 'dumbbell', pattern: 'pull', difficulty: 'beginner' },
  { id: 'machine-row', name: 'Remo en máquina', nameEn: 'Machine Row', musclePrimary: ['back'], muscleSecondary: ['biceps'], equipment: 'machine', pattern: 'pull', difficulty: 'beginner' },
  { id: 'neutral-grip-pulldown', name: 'Jalón agarre neutro', nameEn: 'Neutral-Grip Pulldown', musclePrimary: ['back'], muscleSecondary: ['biceps'], equipment: 'cable', pattern: 'pull', difficulty: 'beginner' },
  { id: 'inverted-row', name: 'Remo invertido', nameEn: 'Inverted Row', musclePrimary: ['back'], muscleSecondary: ['biceps', 'core'], equipment: 'bodyweight', pattern: 'pull', difficulty: 'beginner' },
  { id: 'hyperextension', name: 'Hiperextensiones', nameEn: 'Back Extension', musclePrimary: ['back', 'glutes'], muscleSecondary: ['hamstrings'], equipment: 'bodyweight', pattern: 'hinge', difficulty: 'beginner' },

  // ── Hombros (ampliación) ───────────────────────────────
  { id: 'machine-shoulder-press', name: 'Press de hombros en máquina', nameEn: 'Machine Shoulder Press', musclePrimary: ['shoulders'], muscleSecondary: ['triceps'], equipment: 'machine', pattern: 'push', difficulty: 'beginner' },
  { id: 'upright-row', name: 'Remo al mentón', nameEn: 'Upright Row', musclePrimary: ['shoulders'], muscleSecondary: ['back', 'biceps'], equipment: 'barbell', pattern: 'pull', difficulty: 'intermediate' },
  { id: 'push-press', name: 'Push press', nameEn: 'Push Press', musclePrimary: ['shoulders'], muscleSecondary: ['triceps', 'quads', 'core'], equipment: 'barbell', pattern: 'push', difficulty: 'advanced' },
  { id: 'reverse-pec-deck', name: 'Pájaros en máquina', nameEn: 'Reverse Pec Deck', musclePrimary: ['shoulders'], muscleSecondary: ['back'], equipment: 'machine', pattern: 'isolation', difficulty: 'beginner' },

  // ── Brazos (ampliación) ────────────────────────────────
  { id: 'ez-bar-curl', name: 'Curl con barra Z', nameEn: 'EZ-Bar Curl', musclePrimary: ['biceps'], muscleSecondary: ['forearms'], equipment: 'barbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'concentration-curl', name: 'Curl concentrado', nameEn: 'Concentration Curl', musclePrimary: ['biceps'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'spider-curl', name: 'Curl araña', nameEn: 'Spider Curl', musclePrimary: ['biceps'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'intermediate' },
  { id: 'rope-pushdown', name: 'Extensión de tríceps con soga', nameEn: 'Rope Pushdown', musclePrimary: ['triceps'], muscleSecondary: [], equipment: 'cable', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'db-kickback', name: 'Patada de tríceps', nameEn: 'Triceps Kickback', musclePrimary: ['triceps'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },
  { id: 'diamond-push-up', name: 'Flexiones diamante', nameEn: 'Diamond Push-Up', musclePrimary: ['triceps'], muscleSecondary: ['chest'], equipment: 'bodyweight', pattern: 'push', difficulty: 'intermediate' },
  { id: 'reverse-curl', name: 'Curl invertido', nameEn: 'Reverse Curl', musclePrimary: ['forearms', 'biceps'], muscleSecondary: [], equipment: 'barbell', pattern: 'isolation', difficulty: 'beginner' },

  // ── Piernas (ampliación) ───────────────────────────────
  { id: 'smith-squat', name: 'Sentadilla en multipower', nameEn: 'Smith Machine Squat', musclePrimary: ['quads', 'glutes'], muscleSecondary: ['hamstrings'], equipment: 'machine', pattern: 'squat', difficulty: 'beginner' },
  { id: 'sissy-squat', name: 'Sentadilla sissy', nameEn: 'Sissy Squat', musclePrimary: ['quads'], muscleSecondary: ['core'], equipment: 'bodyweight', pattern: 'squat', difficulty: 'advanced' },
  { id: 'step-up', name: 'Subida al cajón', nameEn: 'Step-Up', musclePrimary: ['quads', 'glutes'], muscleSecondary: ['hamstrings'], equipment: 'dumbbell', pattern: 'squat', difficulty: 'beginner' },
  { id: 'walking-lunge', name: 'Estocadas caminando', nameEn: 'Walking Lunge', musclePrimary: ['quads', 'glutes'], muscleSecondary: ['hamstrings', 'core'], equipment: 'dumbbell', pattern: 'squat', difficulty: 'intermediate' },
  { id: 'stiff-leg-deadlift', name: 'Peso muerto piernas rígidas', nameEn: 'Stiff-Leg Deadlift', musclePrimary: ['hamstrings'], muscleSecondary: ['glutes', 'back'], equipment: 'barbell', pattern: 'hinge', difficulty: 'intermediate' },
  { id: 'nordic-curl', name: 'Curl nórdico', nameEn: 'Nordic Curl', musclePrimary: ['hamstrings'], muscleSecondary: ['glutes'], equipment: 'bodyweight', pattern: 'isolation', difficulty: 'advanced' },
  { id: 'single-leg-press', name: 'Prensa a una pierna', nameEn: 'Single-Leg Press', musclePrimary: ['quads', 'glutes'], muscleSecondary: ['hamstrings'], equipment: 'machine', pattern: 'squat', difficulty: 'intermediate' },
  { id: 'glute-bridge', name: 'Puente de glúteos', nameEn: 'Glute Bridge', musclePrimary: ['glutes'], muscleSecondary: ['hamstrings', 'core'], equipment: 'bodyweight', pattern: 'hinge', difficulty: 'beginner' },
  { id: 'db-calf-raise', name: 'Elevación de talones con mancuernas', nameEn: 'Dumbbell Calf Raise', musclePrimary: ['calves'], muscleSecondary: [], equipment: 'dumbbell', pattern: 'isolation', difficulty: 'beginner' },

  // ── Core (ampliación) ──────────────────────────────────
  { id: 'side-plank', name: 'Plancha lateral', nameEn: 'Side Plank', musclePrimary: ['core'], muscleSecondary: [], equipment: 'bodyweight', pattern: 'other', difficulty: 'beginner' },
  { id: 'dead-bug', name: 'Bicho muerto', nameEn: 'Dead Bug', musclePrimary: ['core'], muscleSecondary: [], equipment: 'bodyweight', pattern: 'other', difficulty: 'beginner' },
  { id: 'mountain-climber', name: 'Escaladores', nameEn: 'Mountain Climber', musclePrimary: ['core', 'cardio'], muscleSecondary: ['shoulders'], equipment: 'bodyweight', pattern: 'other', difficulty: 'beginner' },
  { id: 'pallof-press', name: 'Press Pallof', nameEn: 'Pallof Press', musclePrimary: ['core'], muscleSecondary: [], equipment: 'cable', pattern: 'other', difficulty: 'intermediate' },
  { id: 'v-up', name: 'Abdominales en V', nameEn: 'V-Up', musclePrimary: ['core'], muscleSecondary: [], equipment: 'bodyweight', pattern: 'isolation', difficulty: 'intermediate' },
]
