-- ═══════════════════════════════════════════════════════════════════════════
-- 0008 — Lectura de admin sobre las tablas de dominio
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `profiles_admin_read` (0004) ya resolvió el patrón: una policy de SELECT
-- adicional (no reemplaza `*_own`) que chequea el rol firmado en el JWT
-- (`auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`), sin exponer la
-- service role key en el frontend. Acá se extiende el mismo patrón a las
-- tablas que necesita el panel de usuarios (ver docs/13-BACKEND-SUPABASE.md
-- y src/lib/adminQueries.ts): entrenos, series, PRs, medidas y rutinas.
--
-- Fotos (`progress_photos`, `exercise_photos`) quedan afuera a propósito:
-- son personales y el panel no las necesita — si hiciera falta después, es
-- una policy más del mismo patrón, no un rediseño.

do $$
declare
  t text;
begin
  foreach t in array array[
    'routines', 'routine_days', 'routine_exercises', 'workouts',
    'workout_sets', 'personal_records', 'body_measurements', 'achievements',
    'calorie_entries'
  ] loop
    execute format(
      'create policy %I on public.%I
         for select to authenticated
         using ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''admin'')',
      t || '_admin_read', t);
  end loop;
end;
$$;

-- Lista de usuarios para el panel: `auth.users` no es accesible vía RLS
-- normal (no es una tabla de `public`), así que hace falta una función
-- `security definer` que exponga solo lo necesario (id, email, fecha de
-- alta) y solo a un admin — nunca la tabla completa.
create or replace function public.admin_list_users()
returns table(id uuid, email text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select id, email, created_at
  from auth.users
  where (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
