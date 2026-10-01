-- ═══════════════════════════════════════════════════════════════════════════
-- 0026 — Pesos más usados por la comunidad (card "Noticias" de Inicio)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Agregado ANÓNIMO sobre las series de todos los usuarios de los últimos 30
-- días. La RLS de workout_sets solo deja leer las propias, así que esto va en
-- una RPC `security definer` que devuelve agregados y nunca un user_id.
--
-- Privacidad:
--   - Solo sale un ejercicio si lo entrenaron ≥ 5 usuarios distintos (k = 5):
--     con menos, la "mediana" podría ser el peso de una persona concreta.
--   - El peso de cada usuario pesa una vez: primero la mediana de cada uno,
--     después la mediana entre usuarios. Así alguien con 200 series no
--     arrastra el número, y no se puede inferir el de nadie.
--   - Redondeado a 0,5 kg.
--   - Sin parámetros: el cliente no puede acotar el universo para aislar a
--     alguien.
--
-- Solo series completas, sin calentamiento, con peso > 0, no borradas.

create or replace function public.popular_exercise_weights()
returns table (
  exercise_id text,
  users       int,
  weight_kg   numeric
)
language sql stable security definer
set search_path = ''
as $$
  with per_user as (
    select s.exercise_id,
           s.user_id,
           percentile_cont(0.5) within group (order by s.weight_kg) as w
    from public.workout_sets s
    where s.completed
      and not s.is_warmup
      and s.weight_kg > 0
      and s.deleted_at is null
      and s.updated_at > now() - interval '30 days'
    group by s.exercise_id, s.user_id
  )
  select p.exercise_id,
         count(*)::int as users,
         round((percentile_cont(0.5) within group (order by p.w))::numeric * 2) / 2 as weight_kg
  from per_user p
  group by p.exercise_id
  having count(*) >= 5
  order by count(*) desc, p.exercise_id
  limit 10;
$$;

revoke all on function public.popular_exercise_weights() from public, anon;
grant execute on function public.popular_exercise_weights() to authenticated;
