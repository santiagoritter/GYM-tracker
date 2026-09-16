-- ═══════════════════════════════════════════════════════════════════════════
-- 0014 — Descanso: registro de tiempo real vs. planeado (TimeCounter)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Una fila por descanso RESUELTO (el usuario confirmó la card de "Descanso
-- terminado" en RestTimer.tsx) — no por descanso arrancado. Mismo patrón que
-- calorie_entries (0006): PK text, user_id desnormalizado, trigger de
-- sellado, RLS por auth.uid(), índice de sync.

create table public.rest_logs (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  workout_id        text not null,
  exercise_id       text not null,
  exercise_name     text,
  planned_seconds   int not null,
  actual_seconds    int not null,
  discarded         boolean not null default false,
  logged_at         timestamptz not null,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create trigger sync_stamp before insert or update on public.rest_logs
  for each row execute function public.sync_stamp();

alter table public.rest_logs enable row level security;

create policy rest_logs_own on public.rest_logs
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index rest_logs_sync_idx on public.rest_logs (user_id, server_updated_at);
