-- ═══════════════════════════════════════════════════════════════════════════
-- 0001 — Helpers de sincronización
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hay DOS columnas de tiempo en cada tabla y no son intercambiables:
--
--   updated_at         lo escribe el CLIENTE (su reloj). Resuelve conflictos
--                      last-write-wins entre dispositivos.
--   server_updated_at  lo sella este trigger con el reloj del SERVIDOR. Es el
--                      cursor del pull incremental.
--
-- Usar una sola columna para las dos cosas (como proponía docs/06) rompe con
-- clock skew: si el reloj del teléfono adelanta 5 minutos, su cursor salta
-- por encima de filas que otro dispositivo escribió en el medio, y esas filas
-- no se bajan NUNCA MÁS. Es una pérdida de datos silenciosa e irrecuperable.

create or replace function public.sync_stamp()
returns trigger
language plpgsql
as $$
begin
  -- Last-write-wins del lado del servidor: si llega una escritura más vieja
  -- que la guardada, se descarta la fila entera (RETURN NULL suprime el
  -- UPDATE sin abortar la transacción, así que el resto del lote sigue).
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;

  new.server_updated_at := now();
  return new;
end;
$$;

comment on function public.sync_stamp() is
  'Sella server_updated_at y aplica LWW server-side. Ver 0001_helpers.sql.';
