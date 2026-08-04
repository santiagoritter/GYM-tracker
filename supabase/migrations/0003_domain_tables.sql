-- ═══════════════════════════════════════════════════════════════════════════
-- 0003 — Tablas de dominio
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Dos decisiones que conviene entender antes de tocar nada:
--
-- 1) PKs `text`, no `uuid`. Aunque uid() del cliente ya genera UUIDs, los
--    ids de ejercicio son slugs ('bench-press') y los de PR/logro son
--    compuestos ('<uuid>_<slug>'). Con text el mapeo Dexie↔Postgres es la
--    identidad: cero capa de traducción de ids.
--
-- 2) `user_id` DESNORMALIZADO también en las tablas hijas, con FK compuesta
--    que garantiza la coherencia con el padre. La alternativa (RLS por join)
--    obligaría a routine_exercises a un EXISTS de dos saltos evaluado fila
--    por fila en cada SELECT/INSERT/UPDATE/DELETE, y dejaría al pull
--    incremental sin índice usable. Postgres garantiza que
--    routine_days.user_id = routines.user_id sin que la policy haga nada.
--
-- No hay tabla `exercises`: el catálogo de 107 ejercicios es código, se
-- versiona con el bundle. Por eso exercise_id es text sin FK.

-- ── Rutinas ────────────────────────────────────────────────────────────────

create table public.routines (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  color             text not null default '#E8FF47',
  is_active         boolean not null default false,
  is_archived       boolean not null default false,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now(),
  unique (id, user_id)   -- objetivo de las FK compuestas de abajo
);

create table public.routine_days (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  routine_id        text not null,
  name              text not null,
  day_order         int not null,
  is_rest           boolean not null default false,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (routine_id, user_id)
    references public.routines(id, user_id) on delete cascade
);

create table public.routine_exercises (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  day_id            text not null,
  exercise_id       text not null,          -- slug del catálogo local, sin FK
  exercise_order    int not null,
  sets_target       int not null default 3,
  reps_min          int not null default 8,
  reps_max          int not null default 12,
  rest_seconds      int not null default 90,
  notes             text,
  superset_group    int,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (day_id, user_id)
    references public.routine_days(id, user_id) on delete cascade
);

-- ── Entrenos ───────────────────────────────────────────────────────────────

create table public.workouts (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  started_at        timestamptz not null,
  finished_at       timestamptz,
  notes             text,
  total_volume_kg   numeric(10,2),
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.workout_sets (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  workout_id        text not null,
  exercise_id       text not null,
  set_number        int not null,
  reps              int not null default 0,
  weight_kg         numeric(6,2) not null default 0,
  rpe               numeric(3,1),
  is_warmup         boolean not null default false,
  completed         boolean not null default false,
  superset_group    int,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (workout_id, user_id)
    references public.workouts(id, user_id) on delete cascade
);

-- ── Progreso ───────────────────────────────────────────────────────────────

create table public.personal_records (
  id                text primary key,       -- `${user_id}_${exercise_id}`
  user_id           uuid not null references auth.users(id) on delete cascade,
  exercise_id       text not null,
  weight_kg         numeric(6,2) not null,
  reps              int not null,
  one_rm_kg         numeric(6,2) not null,
  achieved_at       timestamptz not null,
  workout_id        text,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

create table public.body_measurements (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  taken_at          timestamptz not null,
  weight_kg         numeric(5,2),
  body_fat_pct      numeric(4,1),
  chest_cm          numeric(5,1),
  waist_cm          numeric(5,1),
  hips_cm           numeric(5,1),
  arm_cm            numeric(5,1),
  thigh_cm          numeric(5,1),
  notes             text,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create table public.achievements (
  id                text primary key,       -- `${user_id}_${defId}`
  user_id           uuid not null references auth.users(id) on delete cascade,
  unlocked_at       timestamptz not null,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now()
);

-- ── Fotos ──────────────────────────────────────────────────────────────────
-- Solo la metadata. El JPEG vive en Storage y `storage_path` lo referencia;
-- queda null hasta que la cola de subida logra empujar los bytes, así que el
-- registro del entreno se salva aunque la foto tarde días en subir.

create table public.progress_photos (
  id                text primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  taken_at          timestamptz not null,
  weight_kg         numeric(5,2),
  notes             text,
  storage_path      text,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now()
);

create table public.exercise_photos (
  id                text primary key,       -- `${user_id}_${exercise_id}`
  user_id           uuid not null references auth.users(id) on delete cascade,
  exercise_id       text not null,
  storage_path      text,
  created_at        timestamptz not null,
  deleted_at        timestamptz,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);
