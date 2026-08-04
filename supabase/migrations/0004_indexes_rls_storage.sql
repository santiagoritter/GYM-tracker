-- ═══════════════════════════════════════════════════════════════════════════
-- 0004 — Índices, RLS y Storage
-- ═══════════════════════════════════════════════════════════════════════════
--
-- IMPORTANTE: la anon key es PÚBLICA por diseño — va dentro del bundle de JS
-- y cualquiera la lee con devtools. RLS es literalmente lo único que impide
-- que un extraño lea los datos de otro. Si una tabla de `public` queda sin
-- RLS, sus filas son legibles por todo internet.
--
-- Dos detalles de las policies que no son cosméticos:
--
--   `(select auth.uid())` en vez de `auth.uid()`
--       Postgres lo evalúa como InitPlan UNA vez en lugar de una por fila.
--       Sobre tablas grandes la diferencia es de 10-100x.
--
--   `to authenticated`, nunca `to public` / `to anon`
--       Sin esto la policy también aplica al rol anónimo, que es el que usa
--       cualquiera con la anon key sin haber iniciado sesión.

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'routines', 'routine_days', 'routine_exercises', 'workouts',
    'workout_sets', 'personal_records', 'body_measurements', 'achievements',
    'progress_photos', 'exercise_photos'
  ] loop
    -- Trigger de sellado + LWW (ver 0001_helpers.sql)
    execute format(
      'create trigger sync_stamp before insert or update on public.%I
         for each row execute function public.sync_stamp()', t);

    execute format('alter table public.%I enable row level security', t);

    if t = 'profiles' then
      execute 'create policy profiles_own on public.profiles
                 for all to authenticated
                 using (id = (select auth.uid()))
                 with check (id = (select auth.uid()))';

      -- Lectura global para el panel de admin, sin exponer la service role
      -- key en el frontend. El rol viaja firmado dentro del JWT.
      execute 'create policy profiles_admin_read on public.profiles
                 for select to authenticated
                 using ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''admin'')';

      execute 'create index profiles_sync_idx
                 on public.profiles (id, server_updated_at)';
    else
      execute format(
        'create policy %I on public.%I
           for all to authenticated
           using (user_id = (select auth.uid()))
           with check (user_id = (select auth.uid()))', t || '_own', t);

      -- Índice calcado de la query del pull:
      --   where user_id = $1 and server_updated_at > $2 order by server_updated_at
      execute format(
        'create index %I on public.%I (user_id, server_updated_at)',
        t || '_sync_idx', t);
    end if;
  end loop;
end;
$$;

-- Postgres NO crea índices automáticamente para las FK compuestas, y sin
-- ellos el ON DELETE CASCADE hace seq scan de la tabla hija entera.
create index routine_days_parent_idx      on public.routine_days (routine_id, user_id);
create index routine_exercises_parent_idx on public.routine_exercises (day_id, user_id);
create index workout_sets_parent_idx      on public.workout_sets (workout_id, user_id);

-- ── Storage ────────────────────────────────────────────────────────────────
-- Bucket privado. `download()` respeta RLS con el JWT del usuario, así que
-- no hacen falta signed URLs. Límite de 2 MB por objeto: las fotos ya llegan
-- comprimidas a ~150-250 KB desde src/lib/photos.ts.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Rutas: {user_id}/progress/{photo_id}.jpg  |  {user_id}/exercise/{exercise_id}.jpg
-- La primera carpeta ES el uid, así que compararla contra auth.uid() alcanza.
create policy photos_own on storage.objects
  for all to authenticated
  using      (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
