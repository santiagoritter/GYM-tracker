-- ═══════════════════════════════════════════════════════════════════════════
-- 0006 — Calorías
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `calorieEntries` se agregó en Dexie v10 (Fase 21), después de que se
-- escribieran las migraciones 0001-0005 — nunca tuvo su tabla en Postgres.
-- Sin esto, el motor de sync no puede empujar ni bajar el registro de
-- calorías: mismo patrón exacto que el resto de 0003/0004 (PK text, user_id
-- desnormalizado, trigger de sellado, RLS por auth.uid(), índice de sync).

create table public.calorie_entries (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  logged_at         timestamptz not null,
  kcal              int not null,
  label             text,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create trigger sync_stamp before insert or update on public.calorie_entries
  for each row execute function public.sync_stamp();

alter table public.calorie_entries enable row level security;

create policy calorie_entries_own on public.calorie_entries
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index calorie_entries_sync_idx on public.calorie_entries (user_id, server_updated_at);
