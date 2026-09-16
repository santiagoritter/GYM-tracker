-- ═══════════════════════════════════════════════════════════════════════════
-- 0015 — Notificaciones in-app
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Feed de eventos dentro de la app (PR superado, nuevo peso recomendado,
-- nuevo descanso recomendado, novedades de versión) — distinto de las
-- notificaciones push/locales del SO. Mismo patrón que rest_logs (0014):
-- PK text, user_id desnormalizado, trigger de sellado, RLS por auth.uid().

create table public.notifications (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  type              text not null,
  title             text not null,
  body              text not null,
  exercise_id       text,
  read              boolean not null default false,
  created_at        timestamptz not null,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create trigger sync_stamp before insert or update on public.notifications
  for each row execute function public.sync_stamp();

alter table public.notifications enable row level security;

create policy notifications_own on public.notifications
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index notifications_sync_idx on public.notifications (user_id, server_updated_at);
