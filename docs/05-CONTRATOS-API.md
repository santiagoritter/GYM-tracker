# Contratos API y Seguridad

## Supabase como backend

La app usa el SDK de Supabase directamente desde el cliente (no hay un backend propio). Toda la seguridad se implementa mediante Row Level Security (RLS) en PostgreSQL.

---

## Inicialización del cliente

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types' // generado por Supabase CLI

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Variables de entorno requeridas:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Row Level Security (RLS) Policies

### `profiles`
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- El usuario solo puede ver su propio perfil
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- El usuario solo puede actualizar su propio perfil
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- El perfil se crea automáticamente al registrarse (trigger)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
```

### `exercises`
```sql
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden ver ejercicios del sistema
CREATE POLICY "exercises_select_system" ON exercises
  FOR SELECT USING (is_system = true OR created_by = auth.uid());

-- Solo pueden crear ejercicios custom propios
CREATE POLICY "exercises_insert_own" ON exercises
  FOR INSERT WITH CHECK (is_system = false AND created_by = auth.uid());

-- Solo pueden modificar/borrar sus propios custom
CREATE POLICY "exercises_update_own" ON exercises
  FOR UPDATE USING (is_system = false AND created_by = auth.uid());

CREATE POLICY "exercises_delete_own" ON exercises
  FOR DELETE USING (is_system = false AND created_by = auth.uid());
```

### `routines`, `routine_days`, `routine_exercises`
```sql
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routines_own" ON routines
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```
*Mismo patrón para `routine_days` (a través de JOIN con routines) y `routine_exercises`.*

### `workouts` y `workout_sets`
```sql
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workouts_own" ON workouts
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- workout_sets hereda seguridad del workout padre
CREATE POLICY "workout_sets_own" ON workout_sets
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = auth.uid()
    )
  );
```

### `personal_records`, `progress_photos`
```sql
-- Mismo patrón: user_id = auth.uid()
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prs_own" ON personal_records
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_own" ON progress_photos
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## Trigger: crear perfil al registrarse

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Storage: Supabase Storage

### Buckets

| Bucket | Acceso | Tamaño máx | Tipos |
|--------|--------|-----------|-------|
| `progress-photos` | Privado (autenticado) | 5MB/archivo | image/jpeg, image/webp |
| `workout-photos` | Privado (autenticado) | 5MB/archivo | image/jpeg, image/webp |

### Políticas de Storage

```sql
-- Solo el dueño puede subir/ver sus fotos
CREATE POLICY "photos upload own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('progress-photos', 'workout-photos') AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "photos select own"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('progress-photos', 'workout-photos') AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Convención de paths en Storage

```
progress-photos/{user_id}/{photo_id}.jpg
workout-photos/{user_id}/{workout_id}.jpg
```

---

## Consultas frecuentes (SDK patterns)

### Obtener historial de un ejercicio
```ts
const { data } = await supabase
  .from('workout_sets')
  .select(`
    weight_kg, reps, is_warmup, completed,
    workouts!inner(started_at, name)
  `)
  .eq('exercise_id', exerciseId)
  .eq('completed', true)
  .eq('is_warmup', false)
  .order('workouts.started_at', { ascending: false })
  .limit(50)
```

### Obtener PR de un ejercicio
```ts
const { data } = await supabase
  .from('personal_records')
  .select('*')
  .eq('exercise_id', exerciseId)
  .single()
```

### Guardar sets de un workout (batch)
```ts
const { error } = await supabase
  .from('workout_sets')
  .upsert(sets, { onConflict: 'id' })
```

---

## Edge Functions

### `generate-qr-token`

Genera un token server-side para compartir rutinas con expiración:

```ts
// supabase/functions/generate-qr-token/index.ts
Deno.serve(async (req) => {
  const { routine_id, include_weights, expires_in_hours } = await req.json()
  const token = crypto.randomUUID()
  const expires_at = expires_in_hours
    ? new Date(Date.now() + expires_in_hours * 3600000).toISOString()
    : null

  await supabase.from('shared_routines').insert({
    routine_id, qr_token: token, include_weights, expires_at,
    user_id: user.id
  })

  return Response.json({ token })
})
```

*Nota: El QR clientside (sin token) no requiere esta función. El token server-side es opcional para compartir con expiración.*

---

## Generación de tipos TypeScript

```bash
# Generar types desde el schema de Supabase
npx supabase gen types typescript --project-id <project-id> > src/lib/database.types.ts
```

Esto genera tipos para todas las tablas, usables con el cliente tipado:
```ts
const supabase = createClient<Database>(url, key)
// Ahora supabase.from('workouts').select() está completamente tipado
```
