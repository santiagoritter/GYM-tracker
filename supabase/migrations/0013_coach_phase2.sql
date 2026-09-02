-- ═══════════════════════════════════════════════════════════════════════════
-- 0013 — Modo coach, fase 2: DNI, reseñas, chat (B11 fase 2)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sobre el núcleo de 0012. Chat en tiempo real vía Supabase Realtime;
-- reseñas de alumnos; DNI único por cuenta de coach (habilita el cotejo de
-- verificación, que sigue siendo admin-only).

-- ── DNI del coach ──────────────────────────────────────────────────────────
-- Tabla aparte, NO columna de `coaches`: `coaches` es `public_read` y la RLS
-- es por fila, no por columna — un `dni` ahí sería público. Acá solo lo ven
-- el dueño y el admin.
create table if not exists public.coach_identity (
  coach_id   uuid primary key references auth.users(id) on delete cascade,
  dni        text,
  created_at timestamptz not null default now()
);

create unique index if not exists coach_identity_dni_idx
  on public.coach_identity (dni) where dni is not null;

alter table public.coach_identity enable row level security;

create policy coach_identity_self on public.coach_identity
  for all to authenticated
  using (
    coach_id = (select auth.uid())
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (coach_id = (select auth.uid()));

-- ── Reseñas ────────────────────────────────────────────────────────────────
-- ¿el que llama tuvo (o tiene) vínculo con este coach? — un ex-alumno puede
-- reseñar, así que no se filtra por `status`.
create or replace function public.has_bonded_with(coach uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.coach_clients cc
    where cc.coach_id = coach and cc.client_id = (select auth.uid())
  );
$$;

create table if not exists public.coach_reviews (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users(id) on delete cascade,
  client_id  uuid not null references auth.users(id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, client_id)
);

create index if not exists coach_reviews_coach_idx on public.coach_reviews (coach_id);

alter table public.coach_reviews enable row level security;

-- Lectura pública (para el directorio / la preview de la invitación).
create policy coach_reviews_public_read on public.coach_reviews
  for select to authenticated using (true);

-- El alumno escribe / edita / borra su propia reseña, y solo si tuvo vínculo.
create policy coach_reviews_client_write on public.coach_reviews
  for all to authenticated
  using (client_id = (select auth.uid()) and public.has_bonded_with(coach_id))
  with check (client_id = (select auth.uid()) and public.has_bonded_with(coach_id));

-- ── Chat ───────────────────────────────────────────────────────────────────
create table if not exists public.coach_messages (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references auth.users(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  body            text not null default '',
  attachment_kind text check (attachment_kind in ('exercise', 'routine')),
  attachment_ref  text,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

create index if not exists coach_messages_thread_idx
  on public.coach_messages (coach_id, client_id, created_at);

alter table public.coach_messages enable row level security;

-- Ven el hilo las dos partes.
create policy coach_messages_thread on public.coach_messages
  for select to authenticated
  using ((select auth.uid()) in (coach_id, client_id));

-- Escribe cualquiera de las dos partes, como sí mismo, y SOLO con vínculo
-- activo (si el vínculo terminó, el historial se lee pero nadie escribe más).
create policy coach_messages_send on public.coach_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select auth.uid()) in (coach_id, client_id)
    and exists (
      select 1 from public.coach_clients cc
      where cc.coach_id = coach_messages.coach_id
        and cc.client_id = coach_messages.client_id
        and cc.status = 'active'
    )
  );

-- El que recibe marca leído (setea read_at). Sin restricción de columnas —
-- para el volumen actual alcanza.
create policy coach_messages_mark_read on public.coach_messages
  for update to authenticated
  using ((select auth.uid()) in (coach_id, client_id))
  with check ((select auth.uid()) in (coach_id, client_id));

-- Realtime: que las inserciones lleguen por websocket (respeta la RLS de
-- SELECT de arriba). Si la publicación ya tiene la tabla, no falla.
do $$
begin
  alter publication supabase_realtime add table public.coach_messages;
exception
  when duplicate_object then null;
end;
$$;
