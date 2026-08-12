-- Compartir rutina por QR sin meter todo el contenido adentro del código.
-- Antes (ver docs/07-COMPARTIR-QR.md) el QR llevaba la rutina entera
-- comprimida — para una rutina con varios días y ejercicios el payload
-- crecía lo suficiente como para necesitar un QR de alta densidad, que en
-- la práctica muchos celulares no leían bien. Acá el QR pasa a llevar solo
-- un código corto; el contenido real vive en esta tabla y se resuelve
-- contra Supabase al escanear.
--
-- No es parte del motor de sync offline (SYNC_ORDER en schema.ts): compartir
-- e importar ya requieren conexión por diseño (generar/resolver el código),
-- así que no necesita dirty/updated_at ni tombstone.
create table public.shared_routines (
  code text primary key,
  payload jsonb not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.shared_routines enable row level security;

-- Solo el dueño autenticado puede publicar, y solo a su propio nombre.
create policy "shared_routines_insert_own" on public.shared_routines
  for insert to authenticated
  with check (auth.uid() = created_by);

-- Cualquier usuario logueado puede leer por código — es la puerta de
-- entrada del share (quien tiene el código, tiene acceso), mismo modelo
-- de confianza que un link "cualquiera con el enlace" de Docs/Drive. Todo
-- el flujo de escaneo/importación ya vive detrás de ProtectedRoute, así
-- que nunca hay una lectura realmente anónima.
create policy "shared_routines_select_authenticated" on public.shared_routines
  for select to authenticated
  using (true);

create index shared_routines_created_by_idx on public.shared_routines (created_by);
