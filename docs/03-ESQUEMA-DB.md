# Esquema de Base de Datos

Base de datos PostgreSQL en Supabase. Todas las tablas tienen RLS activada.

## Convenciones

- `id`: UUID generado por `gen_random_uuid()`
- `created_at`: `timestamptz DEFAULT now()`
- `updated_at`: `timestamptz DEFAULT now()` + trigger para auto-update
- Todas las tablas de usuario tienen `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`
- Pesos siempre en kg internamente (conversión a lbs solo en UI)

---

## Tablas

### `profiles`
Extiende `auth.users` con datos de perfil.

```sql
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text UNIQUE,
  full_name   text,
  dob         date,                       -- Nullable: se completa en onboarding (el trigger de registro no la tiene)
  sex         text CHECK (sex IN ('male', 'female')),
  weight_kg   numeric(5,2),               -- Peso corporal actual
  height_cm   integer,
  units       text DEFAULT 'kg' CHECK (units IN ('kg', 'lbs')),
  rest_timer_default integer DEFAULT 90,  -- Segundos de descanso por defecto
  avatar_url  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

---

### `exercises`
Catálogo de ejercicios. Los predefinidos tienen `is_system = true`.

```sql
CREATE TABLE exercises (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  name_en         text,                   -- Nombre en inglés (para búsquedas)
  muscle_primary  text[] NOT NULL,        -- Músculos principales
  muscle_secondary text[],               -- Músculos secundarios
  equipment       text NOT NULL CHECK (equipment IN (
                    'barbell', 'dumbbell', 'machine', 'cable',
                    'bodyweight', 'band', 'kettlebell', 'other'
                  )),
  pattern         text CHECK (pattern IN (
                    'push', 'pull', 'squat', 'hinge', 'carry', 'isolation', 'other'
                  )),
  plane           text CHECK (plane IN ('horizontal', 'vertical', 'rotational', 'other')),
  difficulty      text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_system       boolean DEFAULT false,  -- true = precargado por el sistema
  created_by      uuid REFERENCES auth.users(id),  -- null si is_system = true
  created_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX exercises_muscle_primary_idx ON exercises USING GIN (muscle_primary);
CREATE INDEX exercises_equipment_idx ON exercises (equipment);
CREATE INDEX exercises_pattern_idx ON exercises (pattern);
```

---

### `routines`
Plantillas de entrenamiento del usuario.

```sql
CREATE TABLE routines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text DEFAULT '#E8FF47',     -- Color identificador en UI
  is_active   boolean DEFAULT false,      -- Solo una rutina activa a la vez
  is_archived boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

---

### `routine_days`
Días dentro de una rutina.

```sql
CREATE TABLE routine_days (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id  uuid REFERENCES routines(id) ON DELETE CASCADE,
  name        text NOT NULL,              -- Ej: "Pecho y Tríceps", "Descanso"
  day_order   integer NOT NULL,           -- Orden dentro de la rutina
  is_rest     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
```

---

### `routine_exercises`
Ejercicios dentro de un día de rutina.

```sql
CREATE TABLE routine_exercises (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id          uuid REFERENCES routine_days(id) ON DELETE CASCADE,
  exercise_id     uuid REFERENCES exercises(id),
  exercise_order  integer NOT NULL,
  sets_target     integer DEFAULT 3,
  reps_min        integer DEFAULT 8,
  reps_max        integer DEFAULT 12,
  rest_seconds    integer DEFAULT 90,
  notes           text,
  superset_group  integer,               -- null = no superset, mismo número = mismo superset
  created_at      timestamptz DEFAULT now()
);
```

---

### `workouts`
Sesiones de entrenamiento completadas.

```sql
CREATE TABLE workouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id      uuid REFERENCES routines(id) ON DELETE SET NULL,
  routine_day_id  uuid REFERENCES routine_days(id) ON DELETE SET NULL,
  name            text NOT NULL,          -- Nombre visible (ej: "Pecho y Tríceps")
  started_at      timestamptz NOT NULL,
  finished_at     timestamptz,
  notes           text,
  photo_url       text,                   -- URL en Supabase Storage
  total_volume_kg numeric(10,2),          -- Calculado al finalizar
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Índice para historial por usuario
CREATE INDEX workouts_user_started_idx ON workouts (user_id, started_at DESC);
```

---

### `workout_sets`
Series individuales de un entrenamiento.

```sql
CREATE TABLE workout_sets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  uuid REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id),
  set_number  integer NOT NULL,
  reps        integer NOT NULL CHECK (reps > 0),
  weight_kg   numeric(6,2) NOT NULL DEFAULT 0,
  rpe         numeric(3,1) CHECK (rpe BETWEEN 6 AND 10),
  is_warmup   boolean DEFAULT false,      -- Los warm-ups no cuentan para volumen
  completed   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Para calcular 1RM histórico por ejercicio
CREATE INDEX workout_sets_exercise_user_idx
  ON workout_sets (exercise_id)
  INCLUDE (weight_kg, reps, is_warmup, completed);
```

---

### `personal_records`
Un PR por usuario por ejercicio. Se actualiza cuando se supera.

```sql
CREATE TABLE personal_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id     uuid REFERENCES exercises(id),
  weight_kg       numeric(6,2) NOT NULL,  -- Mejor peso (cualquier rep)
  reps_at_weight  integer,                -- Reps con ese peso
  one_rm_kg       numeric(6,2),           -- 1RM estimado (Epley)
  achieved_at     timestamptz NOT NULL,
  workout_id      uuid REFERENCES workouts(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  UNIQUE (user_id, exercise_id)           -- Un PR por usuario por ejercicio
);
```

---

### `progress_photos`
Fotos de progreso físico.

```sql
CREATE TABLE progress_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url       text NOT NULL,          -- URL en Supabase Storage
  taken_at        date NOT NULL,
  weight_kg       numeric(5,2),           -- Peso corporal en esa fecha
  notes           text,
  measurements    jsonb,                  -- { waist_cm, chest_cm, arm_cm, thigh_cm }
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX progress_photos_user_date_idx ON progress_photos (user_id, taken_at DESC);
```

---

### `shared_routines`
Tokens temporales para compartir rutinas (backup server-side).

```sql
CREATE TABLE shared_routines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id      uuid REFERENCES routines(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  qr_token        text UNIQUE NOT NULL,   -- Token para lookup
  include_weights boolean DEFAULT false,
  expires_at      timestamptz,            -- null = no expira
  scan_count      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
```

---

## Trigger: auto-update `updated_at`

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON routines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON personal_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Función: Calcular 1RM (Epley)

```sql
CREATE OR REPLACE FUNCTION calculate_1rm(weight numeric, reps integer)
RETURNS numeric AS $$
BEGIN
  IF reps = 1 THEN RETURN weight; END IF;
  RETURN weight * (1 + reps::numeric / 30);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## Función: Volumen total de un workout

```sql
CREATE OR REPLACE FUNCTION workout_volume(p_workout_id uuid)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(weight_kg * reps), 0)
  FROM workout_sets
  WHERE workout_id = p_workout_id
    AND completed = true
    AND is_warmup = false;
$$ LANGUAGE sql STABLE;
```

---

## RLS Policies (resumen)

Ver spec completa en [docs/05-CONTRATOS-API.md](05-CONTRATOS-API.md).

Regla general: los usuarios solo pueden ver y modificar sus propios datos.
La tabla `exercises` con `is_system = true` es legible por todos los usuarios autenticados.
