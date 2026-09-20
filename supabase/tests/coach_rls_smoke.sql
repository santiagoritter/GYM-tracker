-- ═══════════════════════════════════════════════════════════════════════════
-- Prueba de humo de RLS del modo coach (migraciones 0016–0022)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sin Docker no hay base local, así que esto corre contra el proyecto real pero
-- DENTRO de una transacción que SIEMPRE termina en RAISE EXCEPTION: usuarios,
-- vínculos y mensajes de prueba se revierten enteros; nada queda escrito.
--
-- Cómo correrla:
--   cp supabase/tests/coach_rls_smoke.sql supabase/migrations/9999_tmp_rls_test.sql
--   supabase db push --linked --yes      # falla A PROPÓSITO con el resultado
--   rm supabase/migrations/9999_tmp_rls_test.sql
-- Resultado esperado: "RESULT: RLS_TEST_ALL_OK: 1 aceptar+idempotente OK; …".
-- Cualquier "FAIL n: …" es una regresión de seguridad.
--
-- Nota: para volver al rol de la conexión se usa `set local role postgres`, no
-- `reset role` (el CLI entra con un rol temporal sin privilegios sobre las
-- tablas; RESET ROLE caería ahí).

do $$
declare
  coach uuid := gen_random_uuid();
  student uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  rid text;
  n int;
  bond uuid;
  msg text;
  did_fail boolean;
  d1 text; d2 text;
  log text := '';

  ctx text;
begin
  begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
   (coach,   '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-coach@example.invalid','{"role":"coach"}','{}',now(),now()),
   (student, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-student@example.invalid','{}','{}',now(),now()),
   (other,   '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-other@example.invalid','{"role":"coach"}','{}',now(),now());

  insert into public.coaches (id, display_name) values (coach, 'Coach T'), (other, 'Otro T');
  insert into public.coach_invites (coach_id, code, max_uses) values (coach, 'TMPCODE1', 1);
  insert into public.profiles (id, display_name) values (student, 'Alumno T') on conflict (id) do update set display_name = 'Alumno T', body_weight_kg = 80, sex = 'male', dob = '1995-01-01', units = 'kg';
  insert into public.workouts (id, user_id, name, started_at, finished_at, total_volume_kg, updated_at)
    values ('w-tmp-1', student, 'Push', now(), now(), 1000, now());
  insert into public.calorie_entries (id, user_id, logged_at, kcal, updated_at)
    values ('c-tmp-1', student, now(), 500, now());
  insert into public.rest_logs (id, user_id, workout_id, exercise_id, planned_seconds, actual_seconds, discarded, logged_at, updated_at)
    values ('r-tmp-1', student, 'w-tmp-1', 'bench-press', 90, 100, false, now(), now());

  -- ── 1. Aceptar invitación (alumno) ─────────────────────────────────────
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', student, 'role', 'authenticated', 'app_metadata', json_build_object())::text, true);
  perform public.accept_coach_invite('TMPCODE1');
  select count(*) into n from public.coach_clients where coach_id = coach and client_id = student and status = 'active';
  if n <> 1 then raise exception 'FAIL 1a: no se creó el vínculo'; end if;
  perform public.accept_coach_invite('TMPCODE1'); -- idempotente
  set local role postgres;
  select used_count into n from public.coach_invites where code = 'TMPCODE1';
  if n <> 1 then raise exception 'FAIL 1b: used_count=% (esperado 1)', n; end if;
  log := log || '1 aceptar+idempotente OK; ';

  -- otro alumno con max_uses agotado → falla
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
  did_fail := false;
  begin perform public.accept_coach_invite('TMPCODE1'); exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 1c: max_uses no se respeta'; end if;
  -- y no puede listar invitaciones
  select count(*) into n from public.coach_invites;
  if n <> 0 then raise exception 'FAIL 1d: un tercero lee invitaciones (%)', n; end if;
  set local role postgres;
  log := log || '1 max_uses + sin lookup OK; ';

  -- ── 2. Guardia de coach_clients ────────────────────────────────────────
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  did_fail := false;
  begin update public.coach_clients set client_id = other where coach_id = coach; exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 2a: el coach pudo reasignar client_id'; end if;
  log := log || '2 reasignar bloqueado OK; ';

  -- ── 3. Lecturas del coach vinculado ────────────────────────────────────
  select count(*) into n from public.workouts where user_id = student;
  if n <> 1 then raise exception 'FAIL 3a: coach no ve workouts (%)', n; end if;
  select count(*) into n from public.rest_logs where user_id = student;
  if n <> 1 then raise exception 'FAIL 3b: coach no ve rest_logs'; end if;
  select count(*) into n from public.calorie_entries where user_id = student;
  if n <> 0 then raise exception 'FAIL 3c: coach ve calorías sin permiso (%)', n; end if;
  select count(*) into n from public.coach_client_profile(student);
  if n <> 1 then raise exception 'FAIL 3d: coach_client_profile'; end if;
  set local role postgres;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', student, 'role', 'authenticated')::text, true);
  insert into public.client_sharing (client_id, share_calories) values (student, true);
  set local role postgres;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  select count(*) into n from public.calorie_entries where user_id = student;
  if n <> 1 then raise exception 'FAIL 3e: coach no ve calorías con permiso (%)', n; end if;
  set local role postgres;

  -- un coach NO vinculado no ve nada ni la ficha
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  select count(*) into n from public.workouts where user_id = student;
  if n <> 0 then raise exception 'FAIL 3f: coach no vinculado ve workouts'; end if;
  did_fail := false;
  begin perform * from public.coach_client_profile(student); exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 3g: coach no vinculado leyó la ficha'; end if;
  set local role postgres;
  log := log || '3 lecturas + calorías con permiso OK; ';

  -- ── 4. Rutinas atómicas ────────────────────────────────────────────────
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  rid := public.coach_upsert_routine(student, null, jsonb_build_object(
    'name', 'PPL T', 'color', '#E8FF47',
    'days', jsonb_build_array(
      jsonb_build_object('name','Push','isRest',false,'exercises', jsonb_build_array(
        jsonb_build_object('exerciseId','bench-press','sets',4,'repsMin',6,'repsMax',10,'restSeconds',120),
        jsonb_build_object('exerciseId','ohp','sets',3,'repsMin',8,'repsMax',12))),
      jsonb_build_object('name','Descanso','isRest',true))));
  set local role postgres;
  select count(*) into n from public.routine_days where routine_id = rid and day_order in (1,2);
  if n <> 2 then raise exception 'FAIL 4a: day_order no arranca en 1'; end if;
  select count(*) into n from public.routine_exercises re join public.routine_days rd on rd.id = re.day_id
    where rd.routine_id = rid and re.exercise_order in (1,2);
  if n <> 2 then raise exception 'FAIL 4b: exercise_order no arranca en 1'; end if;
  select source_coach_id::text into msg from public.routines where id = rid;
  if msg <> coach::text then raise exception 'FAIL 4c: source_coach_id'; end if;
  log := log || '4 crear rutina 1-based OK; ';

  -- editar: sacar el día de descanso y un ejercicio
  select id into d1 from public.routine_days where routine_id = rid and day_order = 1;
  select id into d2 from public.routine_days where routine_id = rid and day_order = 2;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  perform public.coach_upsert_routine(student, rid, jsonb_build_object(
    'name', 'PPL T v2',
    'days', jsonb_build_array(
      jsonb_build_object('id', d1, 'name','Push','isRest',false,'exercises', jsonb_build_array(
        jsonb_build_object('exerciseId','bench-press','sets',5,'repsMin',5,'repsMax',5))))));
  set local role postgres;
  select count(*) into n from public.routine_days where routine_id = rid and deleted_at is null;
  if n <> 1 then raise exception 'FAIL 4d: días vivos % (esperado 1)', n; end if;
  select count(*) into n from public.routine_days where routine_id = rid and deleted_at is not null;
  if n <> 1 then raise exception 'FAIL 4e: el día retirado no quedó con deleted_at'; end if;
  select count(*) into n from public.routine_exercises re join public.routine_days rd on rd.id = re.day_id
    where rd.routine_id = rid and re.deleted_at is null;
  if n <> 1 then raise exception 'FAIL 4f: ejercicios vivos % (esperado 1)', n; end if;
  select name into msg from public.routines where id = rid;
  if msg <> 'PPL T v2' then raise exception 'FAIL 4g: nombre no actualizado'; end if;
  log := log || '4 editar (soft delete) OK; ';

  -- otro coach no puede editar ni retirar
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  did_fail := false;
  begin perform public.coach_upsert_routine(student, rid, '{"name":"x","days":[{"name":"d"}]}'::jsonb); exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 4h: otro coach editó la rutina'; end if;
  did_fail := false;
  begin perform public.coach_retire_routine(student, rid); exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 4i: otro coach retiró la rutina'; end if;
  set local role postgres;

  -- validación de payload
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  did_fail := false;
  begin perform public.coach_upsert_routine(student, null, '{"name":"","days":[]}'::jsonb); exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 4j: payload inválido aceptado'; end if;
  did_fail := false;
  begin insert into public.routines (id, user_id, name, updated_at) values ('x-tmp', student, 'directo', now()); exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 4k: el coach todavía escribe routines directo'; end if;
  perform public.coach_retire_routine(student, rid);
  set local role postgres;
  select count(*) into n from public.routines where id = rid and deleted_at is not null;
  if n <> 1 then raise exception 'FAIL 4l: retirar'; end if;
  log := log || '4 permisos + retirar OK; ';

  -- ── 5. Chat: guardia de edición ────────────────────────────────────────
  select id into bond from public.coach_clients where coach_id = coach and client_id = student;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  insert into public.coach_messages (id, coach_id, client_id, sender_id, body) values (gen_random_uuid(), coach, student, coach, 'hola');
  set local role postgres;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', student, 'role', 'authenticated')::text, true);
  did_fail := false;
  begin update public.coach_messages set body = 'editado' where coach_id = coach; exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 5a: se pudo editar el body'; end if;
  update public.coach_messages set read_at = now() where coach_id = coach; -- receptor: ok
  set local role postgres;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  did_fail := false;
  begin update public.coach_messages set read_at = now() where coach_id = coach; exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 5b: el emisor marcó leído su propio mensaje'; end if;
  set local role postgres;
  log := log || '5 chat guardia OK; ';

  -- ── 6. Bloqueo: termina vínculo e impide escribir ──────────────────────
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', student, 'role', 'authenticated')::text, true);
  perform public.block_user(coach);
  set local role postgres;
  select count(*) into n from public.coach_clients where id = bond and status = 'ended';
  if n <> 1 then raise exception 'FAIL 6a: block_user no terminó el vínculo'; end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  select count(*) into n from public.workouts where user_id = student;
  if n <> 0 then raise exception 'FAIL 6b: el coach sigue viendo datos tras el bloqueo'; end if;
  did_fail := false;
  begin update public.coach_clients set status = 'active' where id = bond; exception when others then did_fail := true; end;
  if not did_fail then raise exception 'FAIL 6c: el coach reactivó un vínculo terminado'; end if;
  set local role postgres;
  log := log || '6 bloqueo OK; ';

  raise exception 'RLS_TEST_ALL_OK: %', log;
  exception when others then
    get stacked diagnostics ctx = pg_exception_context;
    raise exception 'RESULT: % || CTX: %', sqlerrm, replace(ctx, E'\n', ' / ');
  end;
end;
$$;
