-- ═══════════════════════════════════════════════════════════════════════════
-- 0009 — Endurecimiento de funciones (B7, seguridad)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `sync_stamp()` (0001) no tenía `search_path` fijo. No es `security definer`
-- (corre como el invocador, así que el riesgo real es bajo), pero el Advisor
-- de Supabase marca cualquier función con search_path mutable —
-- "function_search_path_mutable" — y conviene dejarlo prolijo. Solo usa
-- pseudo-registros del trigger (new/old) y `now()` (pg_catalog, siempre en
-- el path), así que `set search_path = ''` es seguro sin re-calificar nada.
--
-- `handle_new_user()` (0002) y `admin_list_users()` (0008) ya vienen con
-- `set search_path = public`, que el Advisor acepta — no se tocan.

create or replace function public.sync_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.server_updated_at := now();
  return new;
end;
$$;
