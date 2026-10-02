-- ═══════════════════════════════════════════════════════════════════════════
-- 0027 — Reglas de edad en profiles.dob (edad mínima 13)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La presentación promete protección de menores, y todo parte de saber la
-- edad. El cliente ya valida (src/lib/age.ts), pero el cliente no es confiable:
-- esto lo fuerza el servidor.
--
-- Es un trigger y no un CHECK a propósito: un CHECK (aun NOT VALID) se evalúa en
-- cada UPDATE de la fila, y en producción hay un perfil previo a esta regla con
-- una fecha fuera de rango; un CHECK le rompería cualquier otro cambio (y su
-- sync). El trigger solo valida cuando `dob` cambia o se inserta.
--
-- `dob` sigue siendo nullable: cuentas anteriores sin fecha; la app las trata
-- como menores (sin anuncios) hasta que la completen.

create or replace function public.validate_profile_dob()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.dob is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.dob is not distinct from old.dob then
    return new;
  end if;
  if new.dob > (current_date - interval '13 years')::date then
    raise exception 'Fecha de nacimiento inválida: la edad mínima es 13 años.' using errcode = '22023';
  end if;
  if new.dob < (current_date - interval '100 years')::date then
    raise exception 'Fecha de nacimiento fuera de rango.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_profile_dob() from public, anon, authenticated;

drop trigger if exists profiles_validate_dob on public.profiles;
create trigger profiles_validate_dob
  before insert or update of dob on public.profiles
  for each row execute function public.validate_profile_dob();
