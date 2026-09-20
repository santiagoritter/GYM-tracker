-- ═══════════════════════════════════════════════════════════════════════════
-- 0017 — Moderación de contenido de usuarios (Guideline 1.2 de la App Store)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La app tiene contenido generado por usuarios entre personas que no se
-- conocían de antes (chat coach↔alumno, reseñas de coaches, nombre y bio
-- públicos). Apple exige: filtrado, reportar, bloquear, contacto publicado y
-- poder quitar contenido/usuarios abusivos. Esto agrega las tablas y reglas
-- de servidor; el filtro de lenguaje vive en el cliente (`contentFilter.ts`),
-- los botones en la UI y la bandeja de reportes en el panel admin.

-- ── blocks ─────────────────────────────────────────────────────────────────
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy blocks_owner_read on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy blocks_owner_delete on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));
-- El alta pasa por `block_user` (corta también el vínculo coach↔alumno): no
-- hay policy de INSERT directo.

-- ¿Hay un bloqueo en cualquiera de las dos direcciones entre a y b?
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks x
    where (x.blocker_id = a and x.blocked_id = b)
       or (x.blocker_id = b and x.blocked_id = a)
  );
$$;

-- Bloquea a un usuario y termina el vínculo coach↔alumno entre ambos, si lo
-- hay (en cualquiera de los dos sentidos). Idempotente.
create or replace function public.block_user(target uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Sin sesión.' using errcode = '28000';
  end if;
  if target is null or target = me then
    raise exception 'Usuario inválido.' using errcode = 'P0001';
  end if;

  insert into public.blocks (blocker_id, blocked_id) values (me, target)
  on conflict do nothing;

  update public.coach_clients
     set status = 'ended', ended_at = now(), ended_by = me
   where status <> 'ended'
     and ((coach_id = me and client_id = target) or (coach_id = target and client_id = me));
end;
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;

-- Con un bloqueo en cualquier sentido nadie escribe en el hilo.
drop policy if exists coach_messages_send on public.coach_messages;
create policy coach_messages_send on public.coach_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select auth.uid()) in (coach_id, client_id)
    and exists (
      select 1 from public.coach_clients cc
      where cc.coach_id = coach_messages.coach_id
        and cc.client_id = coach_messages.client_id
        and cc.status = 'active'
    )
    and not public.is_blocked_between(coach_id, client_id)
  );

-- Y el que bloqueó no vuelve a ver lo que le mandó el bloqueado.
drop policy if exists coach_messages_thread on public.coach_messages;
create policy coach_messages_thread on public.coach_messages
  for select to authenticated
  using (
    (select auth.uid()) in (coach_id, client_id)
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = coach_messages.sender_id
    )
  );

-- Reseñas: no se ven las de alguien que bloqueé.
drop policy if exists coach_reviews_public_read on public.coach_reviews;
create policy coach_reviews_public_read on public.coach_reviews
  for select to authenticated
  using (
    not exists (
      select 1 from public.blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = coach_reviews.client_id
    )
  );

-- Largo máximo de un mensaje (sin esto un cliente podía mandar megabytes).
alter table public.coach_messages
  drop constraint if exists coach_messages_body_len;
alter table public.coach_messages
  add constraint coach_messages_body_len check (char_length(body) <= 2000) not valid;

-- ── reports ────────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  kind           text not null check (kind in ('message', 'review', 'profile', 'other')),
  target_ref     text,
  reason         text not null
                   check (reason in ('spam', 'abuse', 'inappropriate', 'impersonation', 'other')),
  detail         text check (detail is null or char_length(detail) <= 1000),
  status         text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at     timestamptz not null default now(),
  resolved_by    uuid references auth.users(id) on delete set null,
  resolved_at    timestamptz
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

-- Cualquiera autenticado reporta, solo como sí mismo.
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');

-- Cada uno ve los suyos; el admin ve y resuelve todos.
create policy reports_read_own on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()));

create policy reports_admin_all on public.reports
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
