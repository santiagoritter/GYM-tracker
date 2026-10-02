-- ═══════════════════════════════════════════════════════════════════════════
-- 0030 — El cobro del modo coach se exige en la base, no solo en una Edge Function
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hallazgo de la auditoría: con `app_config.coach_billing_required` prendido, la
-- Edge Function `become-coach` devuelve 402 sin suscripción... pero las
-- políticas de `coaches` y `coach_invites` dejaban a CUALQUIER usuario
-- autenticado crear su ficha, sus invitaciones y aceptar alumnos hablándole
-- directo a PostgREST con su token. Un cliente modificado se salteaba el cobro.
--
-- Ahora la regla vive en la base:
--   coach_is_entitled(uid) = el cobro está apagado, o es admin, o tiene una
--   suscripción 'coach' activa y vigente (misma definición que
--   `enforce_coach_billing`, 0024).
-- y la usan: las políticas de escritura de `coaches` y `coach_invites`,
-- `accept_coach_invite` y `is_coach_of` (de la que cuelgan las lecturas del
-- progreso del alumno, las rutinas asignadas y el chat). Con eso, un coach cuya
-- suscripción vence pierde acceso al instante, sin esperar un job.
--
-- Con el cobro apagado (hoy, por defecto) todo se comporta exactamente igual
-- que antes: la función devuelve true sin mirar nada más.

create or replace function public.coach_is_entitled(uid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    not coalesce((select c.coach_billing_required from public.app_config c limit 1), false)
    or exists (
      select 1 from auth.users u
      where u.id = uid and (u.raw_app_meta_data ->> 'role') = 'admin'
    )
    or exists (
      select 1 from public.subscriptions s
      where s.user_id = uid
        and s.entitlement = 'coach'
        and s.status = 'active'
        and (s.expires_at is null or s.expires_at > now())
    );
$$;

revoke all on function public.coach_is_entitled(uuid) from public, anon;
grant execute on function public.coach_is_entitled(uuid) to authenticated;

-- ── is_coach_of: el vínculo activo no alcanza si el coach no está al día ────
create or replace function public.is_coach_of(client uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients cc
    where cc.coach_id = (select auth.uid())
      and cc.client_id = client
      and cc.status = 'active'
  ) and public.coach_is_entitled((select auth.uid()));
$$;

-- ── coaches: escribir la ficha exige estar al día; leer es público, como antes ─
drop policy if exists coaches_self on public.coaches;

create policy coaches_self_insert on public.coaches
  for insert to authenticated
  with check (id = (select auth.uid()) and public.coach_is_entitled((select auth.uid())));

create policy coaches_self_update on public.coaches
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and public.coach_is_entitled((select auth.uid())));

create policy coaches_self_delete on public.coaches
  for delete to authenticated
  using (id = (select auth.uid()));

-- ── coach_invites: crear y editar invitaciones exige estar al día ───────────
drop policy if exists coach_invites_owner on public.coach_invites;

create policy coach_invites_owner_read on public.coach_invites
  for select to authenticated
  using (coach_id = (select auth.uid()));

create policy coach_invites_owner_insert on public.coach_invites
  for insert to authenticated
  with check (coach_id = (select auth.uid()) and public.coach_is_entitled((select auth.uid())));

create policy coach_invites_owner_update on public.coach_invites
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) and public.coach_is_entitled((select auth.uid())));

create policy coach_invites_owner_delete on public.coach_invites
  for delete to authenticated
  using (coach_id = (select auth.uid()));

-- ── accept_coach_invite: igual que 0028 más "el coach tiene que estar al día" ─
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
  -- Mismo mensaje para "no existe", "vencido" y "el coach no está al día": no se
  -- le cuenta a un alumno por qué.
  if not found
     or (inv.expires_at is not null and inv.expires_at <= now())
     or not exists (select 1 from public.coaches c where c.id = inv.coach_id)
     or not public.coach_is_entitled(inv.coach_id) then
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

  -- Menores: coach verificado y consentimiento confirmado de un tutor (0028).
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
