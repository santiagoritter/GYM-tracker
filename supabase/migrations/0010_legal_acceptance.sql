-- ═══════════════════════════════════════════════════════════════════════════
-- 0010 — Aceptación de términos y privacidad (B8)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Se registra en el perfil (relación 1:1 con el usuario). El cliente
-- (src/lib/sync.ts) mapea camelCase↔snake_case solo, así que
-- `legalAcceptedAt`/`legalVersion` locales viajan a estas columnas sin
-- tocar nada más. No son booleanas, no hace falta agregarlas a
-- BOOLEAN_FIELDS.
--
-- Nullable: los perfiles que ya existen quedan sin aceptación registrada.
-- No se los fuerza retroactivamente en esta versión — la aceptación se pide
-- en el alta de cuentas nuevas (src/pages/Registro.tsx).

alter table public.profiles
  add column if not exists legal_accepted_at timestamptz,
  add column if not exists legal_version integer;
