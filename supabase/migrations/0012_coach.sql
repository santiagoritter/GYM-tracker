-- ═══════════════════════════════════════════════════════════════════════════
-- 0012 — Modo coach / personal trainer (B11, núcleo)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Núcleo: cuentas de coach, vínculo coach↔alumno por invitación (link/QR)
-- cortable por cualquiera de las dos partes, el coach ve el progreso de sus
-- alumnos activos y les asigna rutinas (una COPIA que el alumno posee) y
-- metas. Verificado amarillo lo pone SOLO el admin.
--
-- Fuera de este archivo (fase 2): chat, reseñas/rating, unicidad por DNI,
-- método de pago.
--
-- El rol `coach` vive en app_metadata (lo pone el admin vía la Edge Function
-- `admin-users`), igual que `admin`.

-- ── coaches ────────────────────────────────────────────────────────────────
create table if not exists public.coaches (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  bio              text,
  experience_years int,
  specialties      text[] not null default '{}',
  verified         boolean not null default false,
  verified_at      timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.coaches enable row level security;

-- El coach gestiona su propia ficha…
create policy coaches_self on public.coaches
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- …pero NO puede tocar `verified`/`verified_at`: un trigger los fuerza al
-- valor anterior salvo que quien escribe sea admin.
create or replace function public.coaches_guard_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verified := false;
    new.verified_at := null;
  else
    new.verified := old.verified;
    new.verified_at := old.verified_at;
  end if;
  return new;
end;
$$;

create trigger coaches_guard_verified_trg
  before insert or update on public.coaches
  for each row execute function public.coaches_guard_verified();

-- Ficha pública (la ve el alumno antes de aceptar / en "Tu coach").
create policy coaches_public_read on public.coaches
  for select to authenticated using (true);

-- El admin puede todo (togglear verified).
create policy coaches_admin_all on public.coaches
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── coach_invites ──────────────────────────────────────────────────────────
create table if not exists public.coach_invites (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users(id) on delete cascade,
  code       text unique not null,
  expires_at timestamptz,
  max_uses   int,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.coach_invites enable row level security;

create policy coach_invites_owner on public.coach_invites
  for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

-- Cualquiera autenticado puede resolver un código vigente para previsualizar
-- al coach antes de aceptar el vínculo.
create policy coach_invites_lookup on public.coach_invites
  for select to authenticated
  using (expires_at is null or expires_at > now());

-- ── coach_clients ──────────────────────────────────────────────────────────
create table if not exists public.coach_clients (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id) on delete cascade,
  client_id   uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'active' check (status in ('pending', 'active', 'ended')),
  invited_via text,
  created_at  timestamptz not null default now(),
  ended_at    timestamptz,
  ended_by    uuid references auth.users(id) on delete set null,
  unique (coach_id, client_id)
);

alter table public.coach_clients enable row level security;

-- Ven la fila las dos partes.
create policy coach_clients_visible on public.coach_clients
  for select to authenticated
  using (coach_id = (select auth.uid()) or client_id = (select auth.uid()));

-- El alumno crea el vínculo, y solo si existe una invitación vigente de ese
-- coach (se aceptó un link/QR real, no un coach_id inventado).
create policy coach_clients_client_accepts on public.coach_clients
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.coach_invites i
      where i.coach_id = coach_clients.coach_id
        and (i.expires_at is null or i.expires_at > now())
    )
  );

-- Cualquiera de las dos partes puede actualizar (para pasar a 'ended').
create policy coach_clients_either_updates on public.coach_clients
  for update to authenticated
  using (coach_id = (select auth.uid()) or client_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) or client_id = (select auth.uid()));

create index if not exists coach_clients_coach_idx on public.coach_clients (coach_id, status);
create index if not exists coach_clients_client_idx on public.coach_clients (client_id, status);

-- ── Helper: ¿soy coach ACTIVO de este alumno? ──────────────────────────────
create or replace function public.is_coach_of(client uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients cc
    where cc.coach_id = (select auth.uid())
      and cc.client_id = client
      and cc.status = 'active'
  );
$$;

-- ── client_goals ───────────────────────────────────────────────────────────
create table if not exists public.client_goals (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references auth.users(id) on delete cascade,
  client_id    uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  metric       text not null default 'custom'
                 check (metric in ('weight_1rm', 'bodyweight', 'sessions_per_week', 'custom')),
  target_value numeric,
  due_date     date,
  status       text not null default 'active' check (status in ('active', 'done', 'dropped')),
  created_at   timestamptz not null default now()
);

alter table public.client_goals enable row level security;

create policy client_goals_read on public.client_goals
  for select to authenticated
  using (coach_id = (select auth.uid()) or client_id = (select auth.uid()));

create policy client_goals_coach_writes on public.client_goals
  for all to authenticated
  using (coach_id = (select auth.uid()) and public.is_coach_of(client_id))
  with check (coach_id = (select auth.uid()) and public.is_coach_of(client_id));

create index if not exists client_goals_client_idx on public.client_goals (client_id, status);

-- ── Rutinas asignadas por un coach ─────────────────────────────────────────
alter table public.routines
  add column if not exists source_coach_id uuid references auth.users(id) on delete set null;

-- El coach puede SELECT/INSERT/UPDATE/DELETE rutinas (y sus hijas) de sus
-- alumnos ACTIVOS — para armar y empujar la copia. El alumno la posee igual
-- (user_id = alumno) y la puede editar por su policy `_own` de siempre.
create policy routines_coach on public.routines
  for all to authenticated
  using (public.is_coach_of(user_id))
  with check (public.is_coach_of(user_id));

create policy routine_days_coach on public.routine_days
  for all to authenticated
  using (public.is_coach_of(user_id))
  with check (public.is_coach_of(user_id));

create policy routine_exercises_coach on public.routine_exercises
  for all to authenticated
  using (public.is_coach_of(user_id))
  with check (public.is_coach_of(user_id));

-- Monitoreo: solo lectura sobre el progreso del alumno activo.
do $$
declare t text;
begin
  foreach t in array array[
    'workouts', 'workout_sets', 'personal_records', 'body_measurements', 'achievements'
  ] loop
    execute format(
      'create policy %I on public.%I
         for select to authenticated
         using (public.is_coach_of(user_id))', t || '_coach_read', t);
  end loop;
end;
$$;
-- calorie_entries y progress_photos quedan FUERA del alcance del coach a
-- propósito (privacidad); runs es local, sin RLS.

-- ── RPC: resumen de mis alumnos (para el coach) ────────────────────────────
-- El coach no puede leer auth.users ni profiles ajenos: este `security
-- definer` le devuelve solo lo suyo (alumnos activos + nombre + email).
create or replace function public.coach_client_summaries()
returns table (client_id uuid, display_name text, email text, bonded_at timestamptz)
language sql security definer set search_path = public
as $$
  select cc.client_id, p.display_name, u.email, cc.created_at
  from public.coach_clients cc
  join auth.users u on u.id = cc.client_id
  left join public.profiles p on p.id = cc.client_id
  where cc.coach_id = (select auth.uid()) and cc.status = 'active'
  order by cc.created_at desc;
$$;
