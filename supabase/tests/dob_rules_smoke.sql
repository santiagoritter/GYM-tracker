-- Prueba de humo de 0027 (reglas de edad en profiles.dob). Misma mecánica que
-- coach_rls_smoke.sql: corre en una transacción que SIEMPRE termina en RAISE.
--   cp supabase/tests/dob_rules_smoke.sql supabase/migrations/9999_tmp_dob_test.sql
--   supabase db push --linked --yes --include-all   # falla A PROPÓSITO con el resultado
--   rm supabase/migrations/9999_tmp_dob_test.sql
-- Esperado: "RESULT: DOB_TEST_ALL_OK: …".
do $$
declare
  u uuid := gen_random_uuid();
  failed boolean;
  log text := '';
  ctx text;
begin
  begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tmp-dob@example.invalid', '{}', '{}', now(), now());
  -- handle_new_user crea el perfil con dob nula.

  update public.profiles set dob = '1990-05-05' where id = u;
  log := log || '1 adulto OK; ';

  failed := false;
  begin update public.profiles set dob = (current_date - interval '12 years')::date where id = u;
  exception when others then failed := true; end;
  if not failed then raise exception 'FAIL 2: aceptó 12 años'; end if;

  failed := false;
  begin update public.profiles set dob = (current_date + 1) where id = u;
  exception when others then failed := true; end;
  if not failed then raise exception 'FAIL 3: aceptó fecha futura'; end if;

  failed := false;
  begin update public.profiles set dob = '1900-01-01' where id = u;
  exception when others then failed := true; end;
  if not failed then raise exception 'FAIL 4: aceptó 126 años'; end if;
  log := log || '2-4 rangos OK; ';

  update public.profiles set dob = (current_date - interval '13 years')::date where id = u;
  log := log || '5 13 años justos OK; ';

  update public.profiles set display_name = 'otro' where id = u;
  log := log || '6 otros campos sin trabas OK; ';

  raise exception 'DOB_TEST_ALL_OK: %', log;
  exception when others then
    get stacked diagnostics ctx = pg_exception_context;
    raise exception 'RESULT: % || CTX: %', sqlerrm, replace(ctx, E'\n', ' / ');
  end;
end;
$$;
