-- ═══════════════════════════════════════════════════════════════════════════
-- 0023 — Suscripciones (RevenueCat → servidor)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La compra la hace el usuario con StoreKit y la gestiona RevenueCat; el
-- servidor solo necesita saber si un usuario tiene una suscripción vigente para
-- dos cosas: (1) exigirla al activar el modo coach y (2) quitarle el rol de
-- coach cuando vence. Esta tabla la escribe ÚNICAMENTE la Edge Function
-- `revenuecat-webhook` (service_role): el cliente no puede escribirla, así que
-- nadie se "regala" un entitlement. El usuario solo puede LEER la suya.

create table if not exists public.subscriptions (
  user_id     uuid not null references auth.users(id) on delete cascade,
  entitlement text not null check (entitlement in ('coach', 'ad_free')),
  product_id  text,
  status      text not null check (status in ('active', 'expired', 'billing_issue')),
  expires_at  timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, entitlement)
);

alter table public.subscriptions enable row level security;

create policy subscriptions_read_own on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));
-- Sin policies de INSERT/UPDATE/DELETE: solo la service_role (que se salta RLS).
