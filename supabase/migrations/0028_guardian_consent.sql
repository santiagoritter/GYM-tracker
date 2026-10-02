-- ═══════════════════════════════════════════════════════════════════════════
-- 0028 — Consentimiento de madre/padre/tutor para el vínculo coach–menor
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La presentación promete: "vínculo solo con consentimiento de madre o padre".
-- Un menor (< 18, o sin fecha de nacimiento: ver 0027 y src/lib/age.ts) no puede
-- aceptar la invitación de un coach hasta que un tutor lo confirme desde un
-- enlace. No hace falta que el tutor tenga cuenta ni que exista un servicio de
-- mail: el menor comparte el enlace (WhatsApp, etc.).
--
-- Diseño:
--   - El consentimiento es POR COACH (el tutor ve a quién autoriza).
--   - El token tiene 244 bits (dos uuid v4) y solo se guarda su sha256: con esa
--     entropía no hace falta limitar intentos, y ni un volcado de la tabla
--     permite confirmar nada.
--   - Las RPC de lectura y confirmación son `anon` porque el tutor no tiene
--     sesión. Solo devuelven datos a quien tiene el token.
--   - Vence a los 7 días si no se usa. Un consentimiento confirmado no vence
--     (se corta terminando el vínculo, que cualquiera de las dos partes puede).
--   - Para menores el coach tiene que estar `verified` (hasta ahora esa marca era
--     solo una insignia y no bloqueaba nada).
--   - Los vínculos activos que ya existían no se tocan.

create table if not exists public.guardian_consents (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references auth.users(id) on delete cascade,
  coach_id     uuid not null references public.coaches(id) on delete cascade,
  token_hash   text not null unique,
  expires_at   timestamptz not null default now() + interval '7 days',
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists guardian_consents_client_idx
  on public.guardian_consents (client_id, coach_id);

alter table public.guardian_consents enable row level security;

-- El menor ve solo el estado de los suyos (nunca el token: solo existe su hash).
-- Escribir solo se puede por las RPC de abajo.
create policy guardian_consents_own_read on public.guardian_consents
  for select to authenticated
  using (client_id = (select auth.uid()));

-- ¿Es menor? Sin fecha de nacimiento cuenta como menor (fallo seguro).
create or replace function public.is_minor(uid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select p.dob > (current_date - interval '18 years')::date
       from public.profiles p where p.id = uid and p.dob is not null),
    true
  );
$$;
revoke all on function public.is_minor(uuid) from public, anon, authenticated;

-- El menor pide el enlace para su tutor. Devuelve el token en claro UNA vez.
create or replace function public.request_guardian_consent(invite_code text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  me    uuid := (select auth.uid());
  inv   public.coach_invites%rowtype;
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if me is null then
    raise exception 'Sin sesión.' using errcode = '28000';
  end if;
  select * into inv from public.coach_invites where code = invite_code;
  if not found
     or (inv.expires_at is not null and inv.expires_at <= now())
     or not exists (select 1 from public.coaches c where c.id = inv.coach_id) then
    raise exception 'Código inválido o vencido.' using errcode = 'P0001';
  end if;
  if not public.is_minor(me) then
    raise exception 'No hace falta el permiso de un tutor.' using errcode = 'P0001';
  end if;
  -- Limpia pedidos viejos sin confirmar de este par: queda uno solo vigente.
  delete from public.guardian_consents
   where client_id = me and coach_id = inv.coach_id and confirmed_at is null;
  insert into public.guardian_consents (client_id, coach_id, token_hash)
  values (me, inv.coach_id, encode(sha256(convert_to(token, 'UTF8')), 'hex'));
  return token;
end;
$$;
revoke all on function public.request_guardian_consent(text) from public, anon;
grant execute on function public.request_guardian_consent(text) to authenticated;

-- Lo que ve el tutor al abrir el enlace (sin sesión).
create or replace function public.guardian_consent_info(token text)
returns table (coach_name text, client_name text, confirmed boolean, expired boolean)
language sql stable security definer
set search_path = ''
as $$
  select c.display_name,
         p.display_name,
         g.confirmed_at is not null,
         g.confirmed_at is null and g.expires_at <= now()
  from public.guardian_consents g
  join public.coaches c on c.id = g.coach_id
  left join public.profiles p on p.id = g.client_id
  where g.token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
$$;
revoke all on function public.guardian_consent_info(text) from public;
grant execute on function public.guardian_consent_info(text) to anon, authenticated;

-- El tutor confirma. Idempotente: reabrir el enlace no falla ni cambia nada.
create or replace function public.confirm_guardian_consent(token text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  g public.guardian_consents%rowtype;
begin
  select * into g from public.guardian_consents
   where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex')
   for update;
  if not found then
    raise exception 'Enlace inválido.' using errcode = 'P0001';
  end if;
  if g.confirmed_at is not null then
    return true;
  end if;
  if g.expires_at <= now() then
    raise exception 'El enlace venció. Pedile al chico o chica que genere uno nuevo.' using errcode = 'P0001';
  end if;
  update public.guardian_consents set confirmed_at = now() where id = g.id;
  return true;
end;
$$;
revoke all on function public.confirm_guardian_consent(text) from public;
grant execute on function public.confirm_guardian_consent(text) to anon, authenticated;

-- accept_coach_invite: igual que 0022 más la regla de menores.
create or replace function public.accept_coach_invite(invite_code text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me   uuid := (select auth.uid());
  inv  public.coach_invites%rowtype;
  bond public.coach_clients%rowtype;
begin
  if me is null then
    raise exception 'Sin sesión.' using errcode = '28000';
  end if;

  select * into inv from public.coach_invites where code = invite_code for update;
  if not found
     or (inv.expires_at is not null and inv.expires_at <= now())
     or not exists (select 1 from public.coaches c where c.id = inv.coach_id) then
    raise exception 'Código inválido o vencido.' using errcode = 'P0001';
  end if;
  if inv.coach_id = me then
    raise exception 'No podés ser tu propio coach.' using errcode = 'P0001';
  end if;

  select * into bond
  from public.coach_clients
  where coach_id = inv.coach_id and client_id = me;
  if found and bond.status = 'active' then
    return inv.coach_id;
  end if;

  if inv.max_uses is not null and inv.used_count >= inv.max_uses then
    raise exception 'Código inválido o vencido.' using errcode = 'P0001';
  end if;

  -- Menores: coach verificado y consentimiento confirmado de un tutor.
  if public.is_minor(me) then
    if not exists (select 1 from public.coaches c where c.id = inv.coach_id and c.verified) then
      raise exception 'COACH_NOT_VERIFIED' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.guardian_consents g
      where g.client_id = me and g.coach_id = inv.coach_id and g.confirmed_at is not null
    ) then
      raise exception 'GUARDIAN_CONSENT_REQUIRED' using errcode = 'P0001';
    end if;
  end if;

  insert into public.coach_clients (coach_id, client_id, status, invited_via)
  values (inv.coach_id, me, 'active', 'link')
  on conflict (coach_id, client_id) do update
    set status = 'active', ended_at = null, ended_by = null, invited_via = 'link';

  update public.coach_invites set used_count = used_count + 1 where id = inv.id;
  return inv.coach_id;
end;
$$;

revoke all on function public.accept_coach_invite(text) from public, anon;
grant execute on function public.accept_coach_invite(text) to authenticated;
