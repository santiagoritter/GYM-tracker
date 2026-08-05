-- ═══════════════════════════════════════════════════════════════════════════
-- 0005 — Suscripciones de Web Push
-- ═══════════════════════════════════════════════════════════════════════════
--
-- No es una tabla sincronizada (no está en SYNC_ORDER del cliente, no lleva
-- `dirty`/`server_updated_at` para last-write-wins): es un detalle de
-- entrega de push, no un dato del usuario que viaje por Dexie. La crea y
-- borra directo `src/lib/webPush.ts` vía el cliente de Supabase.
--
-- `last_sent_on` vive acá (no en una tabla de log aparte) porque el
-- anti-duplicado es por suscripción, no por usuario — si alguien tiene la
-- PWA abierta en dos dispositivos, cada uno tiene su propio endpoint y su
-- propio "ya le mandé hoy".

create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth         text not null,
  timezone     text not null,
  last_sent_on date,
  created_at   timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Query de send-push-reminders: perfiles con recordatorio activo, join
-- contra sus suscripciones. La service role salta RLS, así que esto es
-- puramente para performance, no seguridad.
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
