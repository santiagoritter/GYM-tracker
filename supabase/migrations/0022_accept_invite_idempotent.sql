-- ═══════════════════════════════════════════════════════════════════════════
-- 0022 — accept_coach_invite: idempotente también con invitaciones agotadas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Bug (encontrado con la prueba de RLS de 0016): la validación de `max_uses`
-- corría ANTES de mirar si el alumno ya tenía el vínculo activo. Con una
-- invitación de un solo uso, un segundo tap en "Aceptar" (o reabrir el link)
-- devolvía "Código inválido o vencido" aunque el vínculo ya estuviera hecho.
-- Ahora, si ya hay un vínculo activo con ese coach, se devuelve OK sin gastar
-- un uso y sin mirar los usos restantes.

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
