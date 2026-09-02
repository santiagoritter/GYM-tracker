-- ═══════════════════════════════════════════════════════════════════════════
-- 0011 — Registro de acciones de admin (B10)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Toda escritura del panel de admin sobre cuentas (cambiar email, rol,
-- resetear contraseña, deshabilitar, crear) la hace la Edge Function
-- `admin-users` con la service_role key, y deja una fila acá con quién,
-- qué y sobre quién. El cliente NUNCA inserta acá: solo la función (que
-- pasa por encima de RLS con la service_role). Lectura: solo admins.

create table if not exists public.admin_audit (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid not null references auth.users(id) on delete set null,
  action         text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  detail         jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);

alter table public.admin_audit enable row level security;

-- Solo lectura, y solo para admins (mismo patrón que `*_admin_read` de 0008).
-- Sin política de INSERT/UPDATE/DELETE: nadie escribe desde el cliente.
create policy admin_audit_admin_read on public.admin_audit
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
