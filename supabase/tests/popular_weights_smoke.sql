-- ═══════════════════════════════════════════════════════════════════════════
-- Prueba de humo de popular_exercise_weights() (migración 0026)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Igual que coach_rls_smoke.sql: corre contra el proyecto real dentro de una
-- transacción que SIEMPRE termina en RAISE EXCEPTION, así que los usuarios y
-- series de prueba se revierten enteros.
--
--   cp supabase/tests/popular_weights_smoke.sql supabase/migrations/9999_tmp_popular_test.sql
--   supabase db push --linked --yes      # falla A PROPÓSITO con el resultado
--   rm supabase/migrations/9999_tmp_popular_test.sql
--
-- Esperado: "RESULT: POPULAR_TEST_ALL_OK: …". Cualquier "FAIL" es regresión.
--
-- Escenario:
--   tmp-ex-a: 4 usuarios  → NO debe salir (k = 5).
--   tmp-ex-b: 30 usuarios con 51..80 kg; el primero además tiene 20 series de
--     200 kg. Con mediana por usuario el resultado es 66,5; con mediana por
--     serie daría mucho más. Prueba que nadie arrastra el número.

do $$
declare
  ids uuid[] := array(select gen_random_uuid() from generate_series(1, 30));
  u uuid;
  i int;
  n int;
  w numeric;
  log text := '';
  ctx text;
begin
  begin
  for i in 1..30 loop
    u := ids[i];
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'tmp-pop-' || i || '@example.invalid', '{}', '{}', now(), now());
    insert into public.workouts (id, user_id, name, started_at, updated_at)
    values ('tmp-w-' || i, u, 'tmp', now(), now());
    insert into public.workout_sets (id, user_id, workout_id, exercise_id, set_number, reps, weight_kg, completed, updated_at)
    values ('tmp-b-' || i, u, 'tmp-w-' || i, 'tmp-ex-b', 1, 8, 50 + i, true, now());
    if i <= 4 then
      insert into public.workout_sets (id, user_id, workout_id, exercise_id, set_number, reps, weight_kg, completed, updated_at)
      values ('tmp-a-' || i, u, 'tmp-w-' || i, 'tmp-ex-a', 1, 8, 40, true, now());
    end if;
  end loop;
  for i in 1..20 loop
    insert into public.workout_sets (id, user_id, workout_id, exercise_id, set_number, reps, weight_kg, completed, updated_at)
    values ('tmp-heavy-' || i, ids[1], 'tmp-w-1', 'tmp-ex-b', i + 1, 3, 200, true, now());
  end loop;
  -- Ruido que no debe contar: calentamiento y borrada.
  insert into public.workout_sets (id, user_id, workout_id, exercise_id, set_number, reps, weight_kg, is_warmup, completed, updated_at)
  values ('tmp-warm', ids[2], 'tmp-w-2', 'tmp-ex-a', 9, 8, 40, true, true, now());
  insert into public.workout_sets (id, user_id, workout_id, exercise_id, set_number, reps, weight_kg, completed, deleted_at, updated_at)
  values ('tmp-del', ids[5], 'tmp-w-5', 'tmp-ex-a', 9, 8, 40, true, now(), now());

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', ids[3], 'role', 'authenticated')::text, true);

  select count(*) into n from public.popular_exercise_weights() where exercise_id = 'tmp-ex-a';
  if n <> 0 then raise exception 'FAIL 1: sale un ejercicio con menos de 5 usuarios'; end if;
  log := log || '1 k=5 OK; ';

  select weight_kg, users into w, n from public.popular_exercise_weights() where exercise_id = 'tmp-ex-b';
  if n is distinct from 30 then raise exception 'FAIL 2a: users=% (esperado 30)', n; end if;
  if w is distinct from 66.5 then raise exception 'FAIL 2b: weight=% (esperado 66.5, mediana por usuario)', w; end if;
  log := log || '2 mediana por usuario OK; ';

  -- Sigue sin poder leer series ajenas de forma directa.
  select count(*) into n from public.workout_sets where exercise_id = 'tmp-ex-b' and user_id <> ids[3];
  if n <> 0 then raise exception 'FAIL 3: authenticated lee series ajenas (%)', n; end if;
  log := log || '3 RLS intacta OK; ';
  set local role postgres;

  if has_function_privilege('anon', 'public.popular_exercise_weights()', 'execute') then
    raise exception 'FAIL 4: anon puede ejecutar la RPC';
  end if;
  log := log || '4 anon sin acceso OK; ';

  raise exception 'POPULAR_TEST_ALL_OK: %', log;
  exception when others then
    get stacked diagnostics ctx = pg_exception_context;
    raise exception 'RESULT: % || CTX: %', sqlerrm, replace(ctx, E'\n', ' / ');
  end;
end;
$$;
