-- ═══════════════════════════════════════════════════════════════════════════
-- 0020 — Coach: progreso completo del alumno (lectura acotada + permisos)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Criterio acordado: el coach vinculado ve TODO lo no sensible del alumno
-- (entrenos y series, PRs, medidas, logros, descansos, niveles y ficha
-- física). Las CALORÍAS solo si el alumno lo habilita. Las fotos de progreso
-- no se comparten nunca (los bytes ni salen del dispositivo).
--
-- Ya existían (0012) las policies `*_coach_read` sobre workouts,
-- workout_sets, personal_records, body_measurements y achievements. Faltaban
-- los tiempos de descanso, la ficha física (profiles no es legible por el
-- coach: es una tabla por-usuario) y el permiso de calorías.

-- ── Descansos ──────────────────────────────────────────────────────────────
create policy rest_logs_coach_read on public.rest_logs
  for select to authenticated
  using (public.is_coach_of(user_id));

-- ── Ficha física del alumno ────────────────────────────────────────────────
-- RPC `security definer` que devuelve solo las columnas físicas/objetivo, sin
-- recordatorios, calorías ni nada de configuración privada. Falla si quien
-- llama no es coach ACTIVO de ese alumno.
create or replace function public.coach_client_profile(client uuid)
returns table (
  display_name    text,
  units           text,
  body_weight_kg  numeric,
  body_fat_pct    numeric,
  height_cm       int,
  dob             date,
  sex             text,
  goal            text,
  level           text,
  weekly_goal     int
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_coach_of(client) then
    raise exception 'No sos coach activo de este alumno.' using errcode = '42501';
  end if;
  return query
    select p.display_name, p.units, p.body_weight_kg, p.body_fat_pct, p.height_cm,
           p.dob, p.sex, p.goal, p.level, p.weekly_goal
    from public.profiles p
    where p.id = client and p.deleted_at is null;
end;
$$;

revoke all on function public.coach_client_profile(uuid) from public, anon;
grant execute on function public.coach_client_profile(uuid) to authenticated;

-- ── Permiso de calorías ────────────────────────────────────────────────────
-- Una fila por alumno. Solo el alumno la escribe; su coach activo la lee (para
-- saber si mostrar la sección) y la policy de calorie_entries la consulta.
create table if not exists public.client_sharing (
  client_id      uuid primary key references auth.users(id) on delete cascade,
  share_calories boolean not null default false,
  updated_at     timestamptz not null default now()
);

alter table public.client_sharing enable row level security;

create policy client_sharing_owner on public.client_sharing
  for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create policy client_sharing_coach_read on public.client_sharing
  for select to authenticated
  using (public.is_coach_of(client_id));

create policy calorie_entries_coach_read on public.calorie_entries
  for select to authenticated
  using (
    public.is_coach_of(user_id)
    and exists (
      select 1 from public.client_sharing s
      where s.client_id = calorie_entries.user_id and s.share_calories
    )
  );
