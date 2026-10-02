-- ═══════════════════════════════════════════════════════════════════════════
-- 0029 — Entitlement `premium` (plan Premium: niveles por músculo, gráficos
-- avanzados, comparación de fotos y sin anuncios)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `subscriptions.entitlement` solo aceptaba 'coach' y 'ad_free'; el webhook de
-- RevenueCat habría fallado al guardar una compra de Premium. `ad_free` se
-- conserva por quien ya lo compró.

alter table public.subscriptions
  drop constraint if exists subscriptions_entitlement_check;

alter table public.subscriptions
  add constraint subscriptions_entitlement_check
  check (entitlement in ('coach', 'ad_free', 'premium'));
