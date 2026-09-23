-- ═══════════════════════════════════════════════════════════════════════════
-- 0025 — Tablero de alumnos del coach (una consulta, no N+1)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `coach_client_summaries` (0012) solo trae nombre/email/fecha de vínculo —
-- para el tablero de PC hace falta último entreno, semana vs. meta, PRs
-- recientes y no leídos por alumno. Se agrega todo en una sola RPC (en vez
-- de una consulta por alumno desde el cliente, que con 30-50 alumnos son
-- 30-50 round-trips) — cada columna es una subquery correlacionada, liviana
-- porque `workouts`/`personal_records` ya indexan por `user_id`.
--
-- "Racha" queda afuera a propósito: calcularla bien en SQL (huecos de
-- calendario, zona horaria del alumno) es una función aparte que no entra
-- en esta tanda — ya se muestra por alumno individual en
-- `ClientProgressView` con la lógica que ya existe en el cliente. Acá se
-- prioriza último entreno + alerta de inactividad, que es lo que un coach
-- necesita para escanear la lista rápido.

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
  where cc.coach_id = (select auth.uid()) and cc.status = 'active';
$$;

revoke all on function public.coach_roster() from public, anon;
grant execute on function public.coach_roster() to authenticated;
