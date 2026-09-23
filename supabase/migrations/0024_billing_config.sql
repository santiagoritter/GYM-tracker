-- ═══════════════════════════════════════════════════════════════════════════
-- 0024 — Config de facturación del modo coach
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hasta acá, "¿se cobra el modo coach?" lo decidía cada lado por separado y
-- mal: el cliente miraba la PLATAFORMA (`purchasesAvailable()` = iOS con
-- RevenueCat configurado) y el servidor un SECRET de Edge Function
-- (`REQUIRE_COACH_SUBSCRIPTION`) que nadie sincronizaba con lo anterior. Con
-- el secret apagado (default), cualquiera se daba de alta gratis desde la
-- web y usaba el modo coach en iOS con la misma cuenta — nunca se le exigía
-- nada. Ahora hay UNA sola fuente de verdad, en la base, que lee tanto el
-- cliente (para no mostrar/ocultar el paywall al pedo) como el servidor
-- (para autorizar de verdad) — ver `become-coach` y `docs/21-COACH.md`.

create table if not exists public.app_config (
  id                     boolean primary key default true check (id),  -- fuerza una sola fila
  coach_billing_required boolean not null default false,
  updated_at             timestamptz not null default now()
);

insert into public.app_config (id, coach_billing_required)
values (true, false)
on conflict (id) do nothing;

alter table public.app_config enable row level security;

-- Lectura pública: hasta un usuario sin sesión (login/registro) necesita
-- saber si el modo coach se paga antes de mostrar el paywall.
create policy app_config_read_all on public.app_config
  for select to anon, authenticated
  using (true);
-- Sin policies de INSERT/UPDATE/DELETE: se prende/apaga a mano (SQL Editor
-- o `enforce_coach_billing()` de abajo), nunca desde la app.

-- Al prender el flag, baja a `user` a todo coach sin un entitlement 'coach'
-- vigente en `subscriptions` (RENDER: mismo efecto que `leave-coach`, sin
-- pasar por la Edge Function). Los admin quedan exentos — no es "modo
-- coach", es acceso total. `security definer` + revocado de `authenticated`:
-- solo se puede correr con la service_role (SQL Editor con la connection
-- string, o un script propio), nunca desde el cliente.
create or replace function public.enforce_coach_billing()
returns table (downgraded_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with to_downgrade as (
    select u.id
    from auth.users u
    where (u.raw_app_meta_data ->> 'role') = 'coach'
      and not exists (
        select 1 from public.subscriptions s
        where s.user_id = u.id
          and s.entitlement = 'coach'
          and s.status = 'active'
          and (s.expires_at is null or s.expires_at > now())
      )
  ),
  ended_bonds as (
    update public.coach_clients cc
    set status = 'ended', ended_at = now(), ended_by = cc.coach_id
    where cc.coach_id in (select id from to_downgrade)
      and cc.status = 'active'
    returning 1
  )
  select id from to_downgrade;
  -- El rol (auth.users.raw_app_meta_data) no se puede tocar por SQL directo
  -- de forma soportada — eso lo hace `admin.auth.admin.updateUserById` desde
  -- Deno con la service_role. Esta función deja los VÍNCULOS ya terminados
  -- (la parte que si o si es SQL) y devuelve a quién bajarle el rol; un
  -- script chico (`scripts/enforce-coach-billing.mjs`, a correr a mano al
  -- prender el flag) hace esa segunda parte.
end;
$$;

revoke all on function public.enforce_coach_billing() from public, authenticated, anon;
