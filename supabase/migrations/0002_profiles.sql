-- ═══════════════════════════════════════════════════════════════════════════
-- 0002 — Perfil de usuario
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Relación 1:1 con auth.users. La PK ES el uid de Supabase Auth, así que no
-- hace falta columna user_id aparte.
--
-- Notar que NO hay columna `role`: el rol de admin vive en
-- auth.users.raw_app_meta_data, que solo se puede escribir con la service
-- role key o desde el dashboard, y viaja firmado dentro del JWT. Una columna
-- en una tabla que el propio usuario puede actualizar no serviría de nada.

create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  display_name        text,
  units               text not null default 'kg' check (units in ('kg', 'lbs')),
  rest_timer_default  int  not null default 90,
  body_weight_kg      numeric(5,2),
  body_fat_pct        numeric(4,1),
  height_cm           int,
  dob                 date,
  sex                 text check (sex in ('male', 'female')),
  goal                text check (goal in ('strength', 'mass', 'endurance', 'health', 'general')),
  level               text check (level in ('novice', 'beginner', 'intermediate', 'advanced', 'elite', 'champion')),
  weekly_goal         int,
  reminder_enabled    boolean not null default false,
  reminder_time       text,
  reminder_days       int[],
  calorie_tracking_enabled boolean not null default false,
  calorie_goal_type   text check (calorie_goal_type in ('maintenance', 'deficit', 'surplus')),
  calorie_goal_kcal   int,
  onboarding_complete boolean not null default false,
  deleted_at          timestamptz,
  updated_at          timestamptz not null default now(),
  server_updated_at   timestamptz not null default now()
);

-- Crea la fila mínima al registrarse, para que el usuario nunca quede sin
-- perfil. `updated_at` arranca en epoch (1970) a propósito: así CUALQUIER
-- valor que empuje después el cliente le gana en el LWW y esta fila
-- placeholder no pisa los datos reales del onboarding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, updated_at)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'epoch')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
