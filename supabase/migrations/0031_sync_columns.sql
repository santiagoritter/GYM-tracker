-- ═══════════════════════════════════════════════════════════════════════════
-- 0031 — Columnas que el cliente ya enviaba y no existían + gate del roster
-- ═══════════════════════════════════════════════════════════════════════════
--
-- BUG (detectado por el reporte de un coach: "mi alumno entrena y me figura que
-- no"): desde septiembre cada entreno lleva `kind` (strength | cardio | running)
-- y el cliente lo manda en el upsert, pero `workouts.kind` NUNCA se creó en el
-- servidor. PostgREST respondía PGRST204 ("no existe la columna") y rechazaba el
-- lote entero; las series fallaban después por la FK. Resultado: ningún entreno
-- nuevo llegó a Supabase, el alumno lo veía (lee de su base local) y el coach no.
-- Lo mismo con `profiles.motivational_notifs_enabled`.
--
-- Las filas siguen locales con dirty = 1 en cada dispositivo: apenas existan estas
-- columnas, el próximo sync las sube solas. No hay nada que migrar en el cliente.
--
-- Para que no vuelva a pasar: scripts/test-sync-schema.mts compara las interfaces
-- de TypeScript contra estas migraciones en el CI.
--
-- Orden de despliegue: ESTA migración primero, el cliente después.

alter table public.workouts
  add column if not exists kind text;

alter table public.workouts
  drop constraint if exists workouts_kind_check;
alter table public.workouts
  add constraint workouts_kind_check check (kind is null or kind in ('strength', 'cardio', 'running'));

alter table public.profiles
  add column if not exists motivational_notifs_enabled boolean;

-- Orden del ejercicio dentro del entreno (antes se perdía y la pantalla lo
-- reconstruía por el UUID de la serie, o sea al azar).
alter table public.workout_sets
  add column if not exists exercise_order int;

-- ── El tablero del coach respeta el cobro, igual que is_coach_of (0030) ────
-- `coach_roster` y `coach_client_summaries` son security definer y se saltaban
-- el gate: con el cobro prendido un coach vencido seguía viendo su lista.
create or replace function public.coach_roster()
returns table (
  client_id      uuid,
  display_name   text,
  email          text,
  bonded_at      timestamptz,
  weekly_goal    int,
  last_workout_at timestamptz,
  workouts_7d    int,
  prs_7d         int,
  unread         int
)
language sql security definer set search_path = public
as $$
  select
    cc.client_id,
    p.display_name,
    u.email,
    cc.created_at as bonded_at,
    p.weekly_goal,
    (
      select max(w.finished_at) from public.workouts w
      where w.user_id = cc.client_id and w.deleted_at is null and w.finished_at is not null
    ) as last_workout_at,
    (
      select count(*)::int from public.workouts w
      where w.user_id = cc.client_id and w.deleted_at is null
        and w.finished_at > now() - interval '7 days'
    ) as workouts_7d,
    (
      select count(*)::int from public.personal_records pr
      where pr.user_id = cc.client_id and pr.deleted_at is null
        and pr.achieved_at > now() - interval '7 days'
    ) as prs_7d,
    (
      select count(*)::int from public.coach_messages cm
      where cm.coach_id = (select auth.uid()) and cm.client_id = cc.client_id
        and cm.sender_id <> (select auth.uid()) and cm.read_at is null
    ) as unread
  from public.coach_clients cc
  join auth.users u on u.id = cc.client_id
  left join public.profiles p on p.id = cc.client_id
  where cc.coach_id = (select auth.uid()) and cc.status = 'active'
    and public.coach_is_entitled((select auth.uid()));
$$;

create or replace function public.coach_client_summaries()
returns table (client_id uuid, display_name text, email text, bonded_at timestamptz)
language sql security definer set search_path = public
as $$
  select cc.client_id, p.display_name, u.email, cc.created_at
  from public.coach_clients cc
  join auth.users u on u.id = cc.client_id
  left join public.profiles p on p.id = cc.client_id
  where cc.coach_id = (select auth.uid()) and cc.status = 'active'
    and public.coach_is_entitled((select auth.uid()))
  order by cc.created_at desc;
$$;
