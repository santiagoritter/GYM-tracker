-- ═══════════════════════════════════════════════════════════════════════════
-- 0018 — Moderación: el admin puede quitar contenido reportado
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Guideline 1.2 pide "un modo efectivo de quitar contenido objetable". El admin
-- ya puede suspender cuentas (`admin-users`); acá se le da borrar un mensaje o
-- una reseña puntual que llegó por la bandeja de reportes. Solo DELETE y solo
-- admin (el chequeo es sobre el rol firmado en el JWT).

create policy coach_messages_admin_delete on public.coach_messages
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy coach_reviews_admin_delete on public.coach_reviews
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Y ver los mensajes reportados para poder juzgarlos: lectura de un mensaje
-- concreto que figure en un reporte abierto (no lectura general del chat).
create policy coach_messages_admin_read_reported on public.coach_messages
  for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and exists (
      select 1 from public.reports r
      where r.kind = 'message'
        and r.status = 'open'
        and (r.target_ref = coach_messages.id::text
             or r.target_user_id = coach_messages.sender_id)
    )
  );
