-- ═══════════════════════════════════════════════════════════════════════════
-- 0016 — Modo coach: cierre de huecos de RLS (previo a ampliar lo que el
-- coach puede leer del alumno)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hallazgos de la auditoría pre-App Store sobre 0012/0013:
--
--  1. `coach_clients_either_updates` no restringía columnas: un coach podía
--     hacer UPDATE de su fila cambiando `client_id` a CUALQUIER usuario (el
--     `with check` solo pedía coach_id = yo) y pasar a ser su coach activo —
--     `is_coach_of()` le abría todo el progreso de la víctima. También podía
--     reactivar un vínculo que el alumno había cortado.
--  2. `coach_invites_lookup` dejaba a cualquier autenticado LISTAR todos los
--     códigos de todos los coaches, y `coach_clients_client_accepts` aceptaba
--     cualquier invitación vigente del coach (no el código usado) sin hacer
--     valer `max_uses`/`used_count`.
--  3. `coach_messages_mark_read` permitía a cualquiera de las dos partes
--     reescribir el `body` (o el remitente) de un mensaje ya enviado.
--  4. `verified` seguía en true aunque el coach cambiara nombre/bio/DNI
--     después de que el admin lo verificara.
--
-- Criterio común de los triggers de acá: solo restringen al rol
-- `authenticated` (lo que llega por PostgREST con el JWT del usuario). Las
-- funciones `security definer` y la service_role (Edge Functions) corren con
-- otro `current_user` y quedan fuera — son código de confianza que ya valida
-- por su cuenta.

-- ── 1. coach_clients: columnas inmutables y transiciones acotadas ──────────
create or replace function public.coach_clients_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' then
    return new;
  end if;

  if new.coach_id is distinct from old.coach_id
     or new.client_id is distinct from old.client_id
     or new.created_at is distinct from old.created_at
     or new.invited_via is distinct from old.invited_via then
    raise exception 'El vínculo no se puede reasignar.' using errcode = '42501';
  end if;

  -- Desde el cliente la ÚNICA transición permitida es cortar el vínculo
  -- (active/pending → ended). Reactivarlo pasa siempre por
  -- `accept_coach_invite`, que valida un código real.
  if new.status is distinct from old.status and new.status <> 'ended' then
    raise exception 'El vínculo solo se puede terminar desde acá.' using errcode = '42501';
  end if;
  if new.status is not distinct from old.status
     and (new.ended_at is distinct from old.ended_at or new.ended_by is distinct from old.ended_by) then
    raise exception 'Solo se puede fijar quién corta el vínculo al terminarlo.' using errcode = '42501';
  end if;
  if new.status = 'ended' and new.ended_by is distinct from me then
    raise exception 'ended_by tiene que ser quien corta el vínculo.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists coach_clients_guard_update_trg on public.coach_clients;
create trigger coach_clients_guard_update_trg
  before update on public.coach_clients
  for each row execute function public.coach_clients_guard_update();

-- El alta del vínculo deja de ser un INSERT directo del alumno: pasa por la
-- RPC de abajo (valida código, vencimiento y usos).
drop policy if exists coach_clients_client_accepts on public.coach_clients;

-- ── 2. Invitaciones: nadie lista códigos; se resuelven por RPC ──────────────
drop policy if exists coach_invites_lookup on public.coach_invites;

-- Vista previa del coach para un código vigente (lo que el alumno ve antes de
-- aceptar). Devuelve solo la ficha pública, nunca la fila de la invitación.
create or replace function public.get_invite_preview(invite_code text)
returns table (
  coach_id         uuid,
  display_name     text,
  bio              text,
  experience_years int,
  verified         boolean
)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.display_name, c.bio, c.experience_years, c.verified
  from public.coach_invites i
  join public.coaches c on c.id = i.coach_id
  where i.code = invite_code
    and (i.expires_at is null or i.expires_at > now())
    and (i.max_uses is null or i.used_count < i.max_uses);
$$;

-- Acepta una invitación: crea (o reactiva) el vínculo del que llama con el
-- coach dueño del código. Idempotente si el vínculo ya está activo (no gasta
-- un uso). Devuelve el id del coach.
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
     or (inv.max_uses is not null and inv.used_count >= inv.max_uses)
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

  insert into public.coach_clients (coach_id, client_id, status, invited_via)
  values (inv.coach_id, me, 'active', 'link')
  on conflict (coach_id, client_id) do update
    set status = 'active', ended_at = null, ended_by = null, invited_via = 'link';

  update public.coach_invites set used_count = used_count + 1 where id = inv.id;
  return inv.coach_id;
end;
$$;

revoke all on function public.get_invite_preview(text) from public, anon;
revoke all on function public.accept_coach_invite(text) from public, anon;
grant execute on function public.get_invite_preview(text) to authenticated;
grant execute on function public.accept_coach_invite(text) to authenticated;

-- ── 3. Mensajes: solo el que recibe puede marcar leído, y solo `read_at` ────
create or replace function public.coach_messages_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.coach_id is distinct from old.coach_id
     or new.client_id is distinct from old.client_id
     or new.sender_id is distinct from old.sender_id
     or new.body is distinct from old.body
     or new.attachment_kind is distinct from old.attachment_kind
     or new.attachment_ref is distinct from old.attachment_ref
     or new.created_at is distinct from old.created_at then
    raise exception 'Un mensaje enviado no se puede editar.' using errcode = '42501';
  end if;
  if old.sender_id = (select auth.uid()) then
    raise exception 'Solo quien recibe el mensaje puede marcarlo leído.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists coach_messages_guard_update_trg on public.coach_messages;
create trigger coach_messages_guard_update_trg
  before update on public.coach_messages
  for each row execute function public.coach_messages_guard_update();

-- ── 4. `verified` se cae si cambia lo que el admin verificó ────────────────
create or replace function public.coaches_guard_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or current_user <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.verified := false;
    new.verified_at := null;
  elsif new.display_name is distinct from old.display_name
        or new.bio is distinct from old.bio then
    -- Cambió lo que se cotejó: vuelve a "pendiente de verificación".
    new.verified := false;
    new.verified_at := null;
  else
    new.verified := old.verified;
    new.verified_at := old.verified_at;
  end if;
  return new;
end;
$$;

-- Cambiar el DNI (tabla aparte, ver 0013) también invalida la verificación.
create or replace function public.coach_identity_reset_verified()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.dni is distinct from old.dni
     and (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    update public.coaches set verified = false, verified_at = null where id = new.coach_id;
  end if;
  return new;
end;
$$;

drop trigger if exists coach_identity_reset_verified_trg on public.coach_identity;
create trigger coach_identity_reset_verified_trg
  after update of dni on public.coach_identity
  for each row execute function public.coach_identity_reset_verified();
