# 12 · Recordatorios de entrenamiento

Dos capas complementarias: **notificaciones locales** (funcionan hoy, sin
servidor) y **Web Push real** (requiere backend, código ya listo — ver
`docs/13-BACKEND-SUPABASE.md`).

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

## Capa 2 — Web Push real (código en `supabase/functions/send-push-reminders`)

Reemplaza a un intento anterior por email (scaffold `send-reminders`,
nunca desplegado y referenciaba columnas que no llegaron a existir en el
SQL real — quedó anotado como deuda en `IDEAS.md` y se borró). Esta versión
manda una notificación push real al navegador, aunque la PWA esté cerrada:

```
pg_cron (cada hora)
   └─► Edge Function `send-push-reminders`
          ├─ lee profiles con reminder_enabled = true (columna real)
          ├─ cruza contra push_subscriptions (una fila por navegador
          │  suscripto, con su propia zona horaria)
          ├─ evita duplicados (push_subscriptions.last_sent_on)
          └─ manda el push firmado con VAPID (self.addEventListener('push')
             en src/sw.ts lo recibe y muestra la notificación)
```

**Del lado del cliente** (`src/lib/webPush.ts`): al activar "Notificaciones
push" en `/recordatorios`, el navegador se suscribe al Push Manager y esa
suscripción (endpoint + claves + zona horaria del dispositivo) se guarda en
`push_subscriptions`. Se degrada sola si Supabase no está desplegado o el
navegador no soporta Push — no rompe nada, simplemente no ofrece la opción
(`isPushAvailable()`).

Pasos de despliegue completos (claves VAPID, secrets, cron) en
`docs/13-BACKEND-SUPABASE.md`.
