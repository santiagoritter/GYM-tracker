-- Prueba de humo de 0031: un entreno con `kind` y `exercise_order` llega al
-- servidor y el coach lo ve; el roster respeta el cobro. Transacción que SIEMPRE
-- termina en RAISE.
--   cp supabase/tests/workouts_kind_smoke.sql supabase/migrations/9999_tmp_t.sql
--   supabase db push --linked --yes --include-all   # falla A PROPÓSITO con el resultado
--   rm supabase/migrations/9999_tmp_t.sql
-- Esperado: "RESULT: WORKOUTS_KIND_TEST_ALL_OK: …".
do $$
declare
  coach uuid := gen_random_uuid();
  student uuid := gen_random_uuid();
  n int;
  k text;
  last_at timestamptz;
  w7 int;
  failed boolean;
  log text := '';
  ctx text;
begin
  begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
   (coach,   '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-wk1@example.invalid','{"role":"coach"}','{}',now(),now()),
   (student, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-wk2@example.invalid','{}','{}',now(),now());
  insert into public.coaches (id, display_name) values (coach, 'Coach W');
  insert into public.profiles (id, display_name, dob) values (student, 'Alumno W', '1990-01-01')
    on conflict (id) do update set dob = '1990-01-01';
  insert into public.coach_clients (coach_id, client_id, status, invited_via) values (coach, student, 'active', 'link');

  -- 1. El alumno sube un entreno nuevo, tal cual lo manda el cliente (con `kind`).
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', student, 'role', 'authenticated')::text, true);
  insert into public.workouts (id, user_id, name, started_at, finished_at, total_volume_kg, kind, updated_at)
    values ('w-kind-1', student, 'Push', now() - interval '1 hour', now() - interval '10 minutes', 1200, 'strength', now());
  insert into public.workout_sets (id, user_id, workout_id, exercise_id, set_number, reps, weight_kg, completed, exercise_order, updated_at)
    values ('s-kind-1', student, 'w-kind-1', 'bench-press', 1, 8, 60, true, 1, now()),
           ('s-kind-2', student, 'w-kind-1', 'squat', 1, 8, 80, true, 2, now());
  update public.profiles set motivational_notifs_enabled = true where id = student;
  select kind into k from public.workouts where id = 'w-kind-1';
  if k <> 'strength' then raise exception 'FAIL 1: kind no se guardó (%)', k; end if;
  log := log || '1 entreno con kind y exercise_order OK; ';

  -- 2. kind inválido rechazado.
  failed := false;
  begin insert into public.workouts (id, user_id, name, started_at, kind, updated_at) values ('w-kind-2', student, 'x', now(), 'yoga', now());
  exception when others then failed := true; end;
  if not failed then raise exception 'FAIL 2: aceptó un kind inválido'; end if;
  log := log || '2 kind inválido rechazado OK; ';

  -- 3. El coach ve el entreno en el tablero.
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  select r.last_workout_at, r.workouts_7d into last_at, w7 from public.coach_roster() r where r.client_id = student;
  if last_at is null or w7 <> 1 then raise exception 'FAIL 3: el coach no ve el entreno (%, %)', last_at, w7; end if;
  select count(*) into n from public.coach_client_summaries();
  if n <> 1 then raise exception 'FAIL 3b: summaries (%)', n; end if;
  log := log || '3 el coach ve el entreno OK; ';

  -- 4. Con el cobro prendido y sin suscripción, el tablero viene vacío.
  set local role postgres;
  update public.app_config set coach_billing_required = true;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  select count(*) into n from public.coach_roster();
  select count(*) into k from public.coach_client_summaries();
  if n <> 0 or k::int <> 0 then raise exception 'FAIL 4: un coach sin suscripción ve su tablero (%, %)', n, k; end if;
  log := log || '4 tablero respeta el cobro OK; ';

  set local role postgres;
  raise exception 'WORKOUTS_KIND_TEST_ALL_OK: %', log;
  exception when others then
    get stacked diagnostics ctx = pg_exception_context;
    raise exception 'RESULT: % || CTX: %', sqlerrm, replace(ctx, E'\n', ' / ');
  end;
end;
$$;
