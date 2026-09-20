-- ═══════════════════════════════════════════════════════════════════════════
-- 0021 — Coach: armar, editar y retirar rutinas del alumno (atómico)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Antes el coach asignaba una rutina con ~N inserts sueltos desde el cliente
-- (`assignRoutineToClient`): sin transacción (un fallo a mitad dejaba una
-- rutina rota en el teléfono del alumno), con `day_order`/`exercise_order`
-- desde 0 (el resto de la app cuenta desde 1 y `nextRoutineDay` se
-- desordena) y sin validar nada. Estas dos funciones lo hacen en una sola
-- transacción, validando que el que llama sea coach ACTIVO del alumno y que
-- solo toque rutinas que él mismo asignó.
--
-- Editar NO borra filas: las que el coach saca se marcan `deleted_at`, porque
-- el sync del alumno propaga borrados por esa columna (un DELETE físico no
-- llegaría nunca al teléfono).
--
-- p_payload (jsonb):
-- {
--   "name": "PPL", "color": "#E8FF47",
--   "days": [
--     { "id": "opcional", "name": "Push", "isRest": false,
--       "exercises": [
--         { "id": "opcional", "exerciseId": "bench-press", "sets": 4, "repsMin": 6,
--           "repsMax": 10, "restSeconds": 120, "notes": "…", "supersetGroup": 1 } ] } ]
-- }
--
-- Los parámetros y variables llevan prefijo (p_/v_) para no chocar con los
-- nombres de columna (`routine_id`, `day_id`), que en plpgsql son ambiguos.

create or replace function public.coach_upsert_routine(
  p_client     uuid,
  p_routine_id text,
  p_payload    jsonb
)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_me     uuid := (select auth.uid());
  v_rid    text := p_routine_id;
  v_name   text := btrim(coalesce(p_payload ->> 'name', ''));
  v_color  text := coalesce(nullif(p_payload ->> 'color', ''), '#E8FF47');
  v_now    timestamptz := now();
  v_day    jsonb;
  v_ex     jsonb;
  v_d_idx  int := 0;
  v_e_idx  int;
  v_day_id text;
begin
  if v_me is null or not public.is_coach_of(p_client) then
    raise exception 'No sos coach activo de este alumno.' using errcode = '42501';
  end if;
  if v_name = '' or char_length(v_name) > 80 then
    raise exception 'El nombre de la rutina es obligatorio (hasta 80 caracteres).' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_payload -> 'days') is distinct from 'array'
     or jsonb_array_length(p_payload -> 'days') = 0
     or jsonb_array_length(p_payload -> 'days') > 14 then
    raise exception 'La rutina necesita entre 1 y 14 días.' using errcode = 'P0001';
  end if;

  if v_rid is null then
    v_rid := gen_random_uuid()::text;
    insert into public.routines (id, user_id, name, color, is_active, is_archived, source_coach_id, updated_at)
    values (v_rid, p_client, v_name, v_color, false, false, v_me, v_now);
  else
    -- Solo se edita una rutina que ESTE coach asignó a ESTE alumno.
    perform 1 from public.routines r
    where r.id = v_rid and r.user_id = p_client and r.source_coach_id = v_me and r.deleted_at is null
    for update;
    if not found then
      raise exception 'No podés editar esta rutina.' using errcode = '42501';
    end if;
    update public.routines r
       set name = v_name, color = v_color, updated_at = v_now
     where r.id = v_rid and r.user_id = p_client;

    -- Todo lo existente queda "retirado"; lo que siga en el payload se revive.
    update public.routine_exercises re
       set deleted_at = v_now, updated_at = v_now
     where re.user_id = p_client and re.deleted_at is null
       and re.day_id in (
         select rd.id from public.routine_days rd
         where rd.routine_id = v_rid and rd.user_id = p_client
       );
    update public.routine_days rd
       set deleted_at = v_now, updated_at = v_now
     where rd.routine_id = v_rid and rd.user_id = p_client and rd.deleted_at is null;
  end if;

  for v_day in select value from jsonb_array_elements(p_payload -> 'days') loop
    v_d_idx := v_d_idx + 1;
    v_day_id := coalesce(nullif(v_day ->> 'id', ''), gen_random_uuid()::text);

    -- Un id de día viene del cliente: solo vale si ya pertenecía a esta rutina
    -- de este alumno (no se puede pisar un día ajeno con un id inventado).
    if nullif(v_day ->> 'id', '') is not null then
      perform 1 from public.routine_days x
      where x.id = v_day_id and (x.user_id <> p_client or x.routine_id <> v_rid);
      if found then
        raise exception 'Día inválido.' using errcode = 'P0001';
      end if;
    end if;

    insert into public.routine_days (id, user_id, routine_id, name, day_order, is_rest, updated_at)
    values (
      v_day_id, p_client, v_rid,
      left(btrim(coalesce(v_day ->> 'name', 'Día ' || v_d_idx)), 60),
      v_d_idx,
      coalesce((v_day ->> 'isRest')::boolean, false),
      v_now
    )
    on conflict (id) do update
      set name = excluded.name, day_order = excluded.day_order, is_rest = excluded.is_rest,
          deleted_at = null, updated_at = v_now;

    if not coalesce((v_day ->> 'isRest')::boolean, false) then
      if coalesce(jsonb_array_length(v_day -> 'exercises'), 0) > 30 then
        raise exception 'Un día admite hasta 30 ejercicios.' using errcode = 'P0001';
      end if;
      v_e_idx := 0;
      for v_ex in select value from jsonb_array_elements(coalesce(v_day -> 'exercises', '[]'::jsonb)) loop
        v_e_idx := v_e_idx + 1;
        if coalesce(v_ex ->> 'exerciseId', '') = '' then
          raise exception 'Falta el ejercicio.' using errcode = 'P0001';
        end if;

        if nullif(v_ex ->> 'id', '') is not null then
          perform 1 from public.routine_exercises x
          where x.id = v_ex ->> 'id' and (x.user_id <> p_client or x.day_id <> v_day_id);
          if found then
            raise exception 'Ejercicio inválido.' using errcode = 'P0001';
          end if;
        end if;

        insert into public.routine_exercises (
          id, user_id, day_id, exercise_id, exercise_order,
          sets_target, reps_min, reps_max, rest_seconds, notes, superset_group, updated_at
        ) values (
          coalesce(nullif(v_ex ->> 'id', ''), gen_random_uuid()::text),
          p_client, v_day_id, v_ex ->> 'exerciseId', v_e_idx,
          least(20, greatest(1, coalesce((v_ex ->> 'sets')::int, 3))),
          least(100, greatest(1, coalesce((v_ex ->> 'repsMin')::int, 8))),
          least(100, greatest(1, coalesce((v_ex ->> 'repsMax')::int, 12))),
          least(900, greatest(0, coalesce((v_ex ->> 'restSeconds')::int, 90))),
          left(nullif(btrim(coalesce(v_ex ->> 'notes', '')), ''), 300),
          (v_ex ->> 'supersetGroup')::int,
          v_now
        )
        on conflict (id) do update
          set exercise_id = excluded.exercise_id, exercise_order = excluded.exercise_order,
              sets_target = excluded.sets_target, reps_min = excluded.reps_min,
              reps_max = excluded.reps_max, rest_seconds = excluded.rest_seconds,
              notes = excluded.notes, superset_group = excluded.superset_group,
              deleted_at = null, updated_at = v_now;
      end loop;
    end if;
  end loop;

  return v_rid;
end;
$$;

-- Retira (borra para el alumno) una rutina que este coach le asignó.
create or replace function public.coach_retire_routine(p_client uuid, p_routine_id text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_me  uuid := (select auth.uid());
  v_now timestamptz := now();
begin
  if v_me is null or not public.is_coach_of(p_client) then
    raise exception 'No sos coach activo de este alumno.' using errcode = '42501';
  end if;
  perform 1 from public.routines r
  where r.id = p_routine_id and r.user_id = p_client and r.source_coach_id = v_me and r.deleted_at is null
  for update;
  if not found then
    raise exception 'No podés retirar esta rutina.' using errcode = '42501';
  end if;

  update public.routine_exercises re set deleted_at = v_now, updated_at = v_now
   where re.user_id = p_client and re.deleted_at is null
     and re.day_id in (
       select rd.id from public.routine_days rd
       where rd.routine_id = p_routine_id and rd.user_id = p_client
     );
  update public.routine_days rd set deleted_at = v_now, updated_at = v_now
   where rd.routine_id = p_routine_id and rd.user_id = p_client and rd.deleted_at is null;
  update public.routines r set deleted_at = v_now, updated_at = v_now
   where r.id = p_routine_id and r.user_id = p_client;
end;
$$;

revoke all on function public.coach_upsert_routine(uuid, text, jsonb) from public, anon;
revoke all on function public.coach_retire_routine(uuid, text) from public, anon;
grant execute on function public.coach_upsert_routine(uuid, text, jsonb) to authenticated;
grant execute on function public.coach_retire_routine(uuid, text) to authenticated;

-- El coach ya no escribe rutinas del alumno con inserts sueltos: se cierra la
-- policy amplia de 0012 (`for all`) y se deja solo lectura para armar el
-- editor. Toda escritura pasa por las dos funciones de arriba.
drop policy if exists routines_coach on public.routines;
drop policy if exists routine_days_coach on public.routine_days;
drop policy if exists routine_exercises_coach on public.routine_exercises;

create policy routines_coach_read on public.routines
  for select to authenticated using (public.is_coach_of(user_id));
create policy routine_days_coach_read on public.routine_days
  for select to authenticated using (public.is_coach_of(user_id));
create policy routine_exercises_coach_read on public.routine_exercises
  for select to authenticated using (public.is_coach_of(user_id));
