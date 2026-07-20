# 12 · Recordatorios de entrenamiento

Dos capas complementarias: **notificaciones locales** (funcionan hoy, sin
servidor) y **emails programados** (requieren backend, ya scaffoldeado).

---

## Capa 1 — Notificaciones locales (implementada)

`src/lib/reminders.ts` + página `/recordatorios`.

- Usa la **Web Notifications API** del navegador.
- El usuario configura hora + días (guardado en `profile.reminder*`).
- `useReminderScheduler()` (montado en `Layout`) revisa cada minuto y dispara
  una notificación una vez por día cuando coincide día + hora.
- Persiste el último día disparado en `localStorage` para no duplicar.

**Límite:** sólo con la app abierta o instalada como PWA (según el SO). No hay
timers en background garantizados en la web. Para avisos 100 % confiables aún
con la app cerrada → capa 2.

---

## Capa 2 — Emails programados (scaffold en `supabase/functions/send-reminders`)

Arquitectura sin servidor propio, sobre Supabase:

```
pg_cron (cada hora)
   └─► Edge Function `send-reminders`
          ├─ lee profiles con reminder_email_enabled = true
          ├─ filtra por hora/zona horaria del usuario
          ├─ evita duplicados (tabla reminder_log)
          └─ envía email vía Resend / Postmark
```

### Pasos de despliegue

1. **Tabla de preferencias** (extiende `profiles`):
   ```sql
   alter table profiles
     add column reminder_email_enabled boolean default false,
     add column reminder_time time default '18:00',
     add column reminder_days int[] default '{1,2,3,4,5}',
     add column timezone text default 'America/Argentina/Buenos_Aires';

   create table reminder_log (
     user_id uuid references auth.users,
     sent_on date,
     primary key (user_id, sent_on)
   );
   ```

2. **Proveedor de email**: crear cuenta en [Resend](https://resend.com) (free
   tier 3k/mes) y guardar `RESEND_API_KEY` como secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   ```

3. **Desplegar la función**:
   ```bash
   supabase functions deploy send-reminders
   ```

4. **Programar con pg_cron** (cada hora en punto):
   ```sql
   select cron.schedule(
     'send-reminders-hourly',
     '0 * * * *',
     $$ select net.http_post(
          url := 'https://<PROJECT>.functions.supabase.co/send-reminders',
          headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
        ) $$
   );
   ```

El esqueleto de la función (Deno/TypeScript) está en
`supabase/functions/send-reminders/index.ts`, listo para completar credenciales.
