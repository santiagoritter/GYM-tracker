-- Prueba de humo de 0030: el cobro del coach se exige en la base. Transacción
-- que SIEMPRE termina en RAISE (el flag `coach_billing_required` también se
-- revierte).
--   cp supabase/tests/coach_gate_smoke.sql supabase/migrations/9999_tmp_gate_test.sql
--   supabase db push --linked --yes --include-all   # falla A PROPÓSITO con el resultado
--   rm supabase/migrations/9999_tmp_gate_test.sql
-- Esperado: "RESULT: COACH_GATE_TEST_ALL_OK: …".
do $$
declare
  coach uuid := gen_random_uuid();
  paying uuid := gen_random_uuid();
  student uuid := gen_random_uuid();
  failed boolean;
  n int;
  log text := '';
  ctx text;
begin
  begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
   (coach,   '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-g1@example.invalid','{}','{}',now(),now()),
   (paying,  '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-g2@example.invalid','{"role":"coach"}','{}',now(),now()),
   (student, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-g3@example.invalid','{}','{}',now(),now());
  insert into public.profiles (id, display_name, dob) values (student, 'Alumno', '1990-01-01')
    on conflict (id) do update set dob = '1990-01-01';
  insert into public.subscriptions (user_id, entitlement, status, expires_at)
    values (paying, 'coach', 'active', now() + interval '30 days');

  -- A. Cobro APAGADO (default): se comporta como siempre, aun sin suscripción.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);
  insert into public.coaches (id, display_name) values (coach, 'Sin pagar');
  insert into public.coach_invites (coach_id, code) values (coach, 'GATE1');
  log := log || 'A cobro apagado permite OK; ';

  -- B. Cobro PRENDIDO: sin suscripción, nada de lo anterior.
  set local role postgres;
  update public.app_config set coach_billing_required = true;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);

  failed := false;
  begin insert into public.coach_invites (coach_id, code) values (coach, 'GATE2'); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL B1: creó una invitación sin suscripción'; end if;

  begin update public.coaches set bio = 'hackeado' where id = coach; exception when others then null; end;
  set local role postgres;
  select count(*) into n from public.coaches where id = coach and bio = 'hackeado';
  if n <> 0 then raise exception 'FAIL B2: editó su ficha sin suscripción'; end if;

  -- Una invitación vieja de un coach impago no se puede aceptar.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', student, 'role', 'authenticated')::text, true);
  failed := false;
  begin perform public.accept_coach_invite('GATE1'); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL B3: aceptó la invitación de un coach sin suscripción'; end if;
  log := log || 'B sin suscripción bloqueado OK; ';

  -- C. Un vínculo activo no da acceso a los datos si el coach no está al día.
  set local role postgres;
  update public.app_config set coach_billing_required = false;
  insert into public.coach_clients (coach_id, client_id, status, invited_via) values (coach, student, 'active', 'link');
  insert into public.workouts (id, user_id, name, started_at, updated_at) values ('w-gate-1', student, 'Push', now(), now());
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  select count(*) into n from public.workouts where user_id = student;
  if n <> 1 then raise exception 'FAIL C1: con el cobro apagado el coach no ve al alumno (%)', n; end if;
  set local role postgres;
  update public.app_config set coach_billing_required = true;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  select count(*) into n from public.workouts where user_id = student;
  if n <> 0 then raise exception 'FAIL C2: un coach sin suscripción sigue viendo al alumno (%)', n; end if;
  log := log || 'C acceso a datos condicionado OK; ';

  -- D. Con suscripción activa todo funciona igual.
  set local role postgres;
  insert into public.coaches (id, display_name) values (paying, 'Pagando');
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', paying, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  insert into public.coach_invites (coach_id, code) values (paying, 'GATE3');
  update public.coaches set bio = 'ok' where id = paying;
  set local role postgres;
  select count(*) into n from public.coaches where id = paying and bio = 'ok';
  if n <> 1 then raise exception 'FAIL D1: un coach al día no pudo editar su ficha'; end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', student, 'role', 'authenticated')::text, true);
  perform public.accept_coach_invite('GATE3');
  log := log || 'D suscripción activa OK; ';

  -- E. Vencida: pierde todo al instante.
  set local role postgres;
  update public.subscriptions set expires_at = now() - interval '1 minute' where user_id = paying;
  select count(*) into n from public.coach_clients where coach_id = paying and status = 'active';
  if n <> 1 then raise exception 'FAIL E0: no había vínculo (%)', n; end if;
  insert into public.workouts (id, user_id, name, started_at, updated_at) values ('w-gate-2', student, 'Pull', now(), now());
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', paying, 'role', 'authenticated', 'app_metadata', json_build_object('role','coach'))::text, true);
  select count(*) into n from public.workouts where id = 'w-gate-2';
  if n <> 0 then raise exception 'FAIL E1: coach vencido sigue viendo datos (%)', n; end if;
  log := log || 'E vencida corta el acceso OK; ';

  set local role postgres;
  raise exception 'COACH_GATE_TEST_ALL_OK: %', log;
  exception when others then
    get stacked diagnostics ctx = pg_exception_context;
    raise exception 'RESULT: % || CTX: %', sqlerrm, replace(ctx, E'\n', ' / ');
  end;
end;
$$;
