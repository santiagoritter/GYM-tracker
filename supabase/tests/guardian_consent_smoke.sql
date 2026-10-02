-- Prueba de humo de 0028 (consentimiento del tutor). Transacción que SIEMPRE
-- termina en RAISE; nada queda escrito.
--   cp supabase/tests/guardian_consent_smoke.sql supabase/migrations/9999_tmp_guardian_test.sql
--   supabase db push --linked --yes --include-all   # falla A PROPÓSITO con el resultado
--   rm supabase/migrations/9999_tmp_guardian_test.sql
-- Esperado: "RESULT: GUARDIAN_TEST_ALL_OK: …".
do $$
declare
  coach uuid := gen_random_uuid();
  kid uuid := gen_random_uuid();
  adult uuid := gen_random_uuid();
  tok text; tok2 text;
  n int;
  failed boolean;
  msg text;
  ok boolean;
  nm text;
  log text := '';
  ctx text;
begin
  begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
   (coach, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-gc@example.invalid','{"role":"coach"}','{}',now(),now()),
   (kid,   '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-kid@example.invalid','{}','{}',now(),now()),
   (adult, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','tmp-adult@example.invalid','{}','{}',now(),now());
  insert into public.coaches (id, display_name) values (coach, 'Coach G');
  insert into public.coach_invites (coach_id, code, max_uses) values (coach, 'GCODE1', 10);
  insert into public.profiles (id, display_name, dob) values (kid, 'Chico', (current_date - interval '15 years')::date)
    on conflict (id) do update set dob = (current_date - interval '15 years')::date, display_name = 'Chico';
  insert into public.profiles (id, display_name, dob) values (adult, 'Adulto', '1990-01-01')
    on conflict (id) do update set dob = '1990-01-01';

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', kid, 'role', 'authenticated')::text, true);

  -- 1. Menor + coach NO verificado: rechazado.
  failed := false;
  begin perform public.accept_coach_invite('GCODE1'); exception when others then failed := true; msg := sqlerrm; end;
  if not failed or msg <> 'COACH_NOT_VERIFIED' then raise exception 'FAIL 1: menor con coach sin verificar (%)', msg; end if;
  log := log || '1 coach sin verificar OK; ';

  set local role postgres;
  update public.coaches set verified = true, verified_at = now() where id = coach;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', kid, 'role', 'authenticated')::text, true);

  -- 2. Verificado pero sin consentimiento: rechazado.
  failed := false;
  begin perform public.accept_coach_invite('GCODE1'); exception when others then failed := true; msg := sqlerrm; end;
  if not failed or msg <> 'GUARDIAN_CONSENT_REQUIRED' then raise exception 'FAIL 2: sin consentimiento (%)', msg; end if;
  log := log || '2 sin consentimiento OK; ';

  -- 3. Pide el enlace; el token no queda en claro y el tutor (anon) lo ve.
  tok := public.request_guardian_consent('GCODE1');
  select count(*) into n from public.guardian_consents where token_hash = tok;
  if n <> 0 then raise exception 'FAIL 3a: el token quedó en claro'; end if;
  set local role anon;
  select coach_name, client_name, confirmed into nm, msg, ok from public.guardian_consent_info(tok);
  if nm <> 'Coach G' or msg <> 'Chico' or ok then raise exception 'FAIL 3b: info del tutor (%,%,%)', nm, msg, ok; end if;
  -- Un token inventado no devuelve nada ni confirma.
  select count(*) into n from public.guardian_consent_info('inventado');
  if n <> 0 then raise exception 'FAIL 3c: token falso devolvió datos'; end if;
  failed := false;
  begin perform public.confirm_guardian_consent('inventado'); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL 3d: confirmó con token falso'; end if;
  log := log || '3 token hasheado y anon acotado OK; ';

  -- 4. Todavía sin confirmar: sigue rechazado.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', kid, 'role', 'authenticated')::text, true);
  failed := false;
  begin perform public.accept_coach_invite('GCODE1'); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL 4: aceptó con consentimiento pendiente'; end if;

  -- 5. El tutor confirma (anon) y es idempotente.
  set local role anon;
  if not public.confirm_guardian_consent(tok) then raise exception 'FAIL 5a'; end if;
  if not public.confirm_guardian_consent(tok) then raise exception 'FAIL 5b: no es idempotente'; end if;
  log := log || '5 confirmar OK; ';

  -- 6. Ahora el menor puede aceptar.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', kid, 'role', 'authenticated')::text, true);
  perform public.accept_coach_invite('GCODE1');
  select count(*) into n from public.coach_clients where coach_id = coach and client_id = kid and status = 'active';
  if n <> 1 then raise exception 'FAIL 6: no se creó el vínculo'; end if;
  log := log || '6 vínculo con consentimiento OK; ';

  -- 7. El menor no puede fabricarse el consentimiento a mano.
  failed := false;
  begin insert into public.guardian_consents (client_id, coach_id, token_hash, confirmed_at) values (kid, coach, 'x', now());
  exception when others then failed := true; end;
  if not failed then raise exception 'FAIL 7a: el menor escribió en guardian_consents'; end if;
  failed := false;
  begin update public.guardian_consents set expires_at = now() + interval '1 year' where client_id = kid;
  exception when others then failed := true; end;
  select count(*) into n from public.guardian_consents where client_id = kid;
  if n <> 1 then raise exception 'FAIL 7b: el menor no ve su propio estado (%)', n; end if;
  log := log || '7 sin escritura directa OK; ';

  -- 8. Un adulto no necesita permiso (y no puede pedirlo).
  perform set_config('request.jwt.claims', json_build_object('sub', adult, 'role', 'authenticated')::text, true);
  perform public.accept_coach_invite('GCODE1');
  failed := false;
  begin perform public.request_guardian_consent('GCODE1'); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL 8: un adulto pidió consentimiento'; end if;
  log := log || '8 adulto sin trabas OK; ';

  -- 9. Un enlace vencido no se puede confirmar.
  set local role postgres;
  update public.profiles set dob = (current_date - interval '15 years')::date where id = adult;
  delete from public.coach_clients where client_id = adult;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', adult, 'role', 'authenticated')::text, true);
  tok2 := public.request_guardian_consent('GCODE1');
  set local role postgres;
  update public.guardian_consents set expires_at = now() - interval '1 minute' where client_id = adult;
  set local role anon;
  failed := false;
  begin perform public.confirm_guardian_consent(tok2); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL 9: confirmó un enlace vencido'; end if;
  log := log || '9 vencido rechazado OK; ';
  set local role postgres;

  raise exception 'GUARDIAN_TEST_ALL_OK: %', log;
  exception when others then
    get stacked diagnostics ctx = pg_exception_context;
    raise exception 'RESULT: % || CTX: %', sqlerrm, replace(ctx, E'\n', ' / ');
  end;
end;
$$;
