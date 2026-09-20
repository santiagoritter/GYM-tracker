-- ═══════════════════════════════════════════════════════════════════════════
-- 0019 — Ficha de coach: datos de perfil no sensibles + términos de coach
-- ═══════════════════════════════════════════════════════════════════════════
--
-- El alta de coach pasa a pedir más contexto para que el alumno decida con qué
-- coach vincularse (ciudad, certificaciones; `specialties` ya existía desde
-- 0012) y deja constancia de que aceptó los términos específicos de coach.
-- Nada de esto es sensible: el DNI sigue en `coach_identity` (privado).
--
-- `coaches` es de lectura pública para autenticados (0012): estas columnas las
-- ve el alumno en la previsualización de la invitación.

alter table public.coaches
  add column if not exists location text,
  add column if not exists certifications text,
  add column if not exists terms_version int,
  add column if not exists terms_accepted_at timestamptz;

alter table public.coaches
  drop constraint if exists coaches_text_lengths;
alter table public.coaches
  add constraint coaches_text_lengths check (
    (display_name is null or char_length(display_name) <= 80)
    and (bio is null or char_length(bio) <= 600)
    and (location is null or char_length(location) <= 80)
    and (certifications is null or char_length(certifications) <= 400)
  ) not valid;

-- La previsualización de invitación devuelve también lo nuevo. Cambiar las
-- columnas de salida exige recrear la función.
drop function if exists public.get_invite_preview(text);
create function public.get_invite_preview(invite_code text)
returns table (
  coach_id         uuid,
  display_name     text,
  bio              text,
  experience_years int,
  verified         boolean,
  specialties      text[],
  location         text,
  certifications   text
)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.display_name, c.bio, c.experience_years, c.verified,
         c.specialties, c.location, c.certifications
  from public.coach_invites i
  join public.coaches c on c.id = i.coach_id
  where i.code = invite_code
    and (i.expires_at is null or i.expires_at > now())
    and (i.max_uses is null or i.used_count < i.max_uses);
$$;

revoke all on function public.get_invite_preview(text) from public, anon;
grant execute on function public.get_invite_preview(text) to authenticated;
