# Revisión pre-App Store — estado real

Auditoría hecha con la skill `apple-appstore-reviewer` (rama `ios-nativo`) en dos
pasadas: la primera de solo lectura, sobre el código de antes; esta es la segunda,
**después** de aplicar los arreglos. Cada afirmación de "resuelto" tiene su
evidencia; lo que no se pudo verificar desde acá figura como **No verificado**.

Las guías cambian: antes de enviar, confirmar el texto vigente en
<https://developer.apple.com/app-store/review/guidelines/>.

## 1. Resumen ejecutivo

- **Qué es**: seguimiento de entrenamientos offline-first (React + Capacitor 8, iOS
  15+) con Live Activities, GPS para correr, modo coach (chat, rutinas, reseñas) y,
  detrás de flags, suscripciones (RevenueCat) y anuncios (AdMob).
- **Antes** los bloqueantes eran: sin borrado de cuenta en la app, contenido de
  usuarios sin reportar/bloquear, ícono con alfa, sin acceso sin registrarse,
  política de privacidad que decía "sin publicidad" y omitía DNI/chat/GPS.
- **Ahora** todo eso está resuelto en código. Lo que falta depende de cuentas y
  decisiones tuyas (sección 4): Apple Developer Program, App Store Connect,
  RevenueCat, AdMob, email de soporte, URL pública de la política y revisión legal.

## 2. Registro de riesgos (segunda pasada)

| Prio | Área | Hallazgo | Estado | Evidencia |
|---|---|---|---|---|
| P0 | Cuenta | Sin borrado de cuenta desde la app (5.1.1(v)) | **Resuelto** | Ajustes → Cuenta → Borrar mi cuenta; Edge Function `delete-account` (JWT, sin `userId` en el body, no borra admins); rechaza sin sesión (401). *El camino de éxito no se ejecutó (borraría una cuenta real).* |
| P0 | Contenido | UGC sin reportar/bloquear/filtrar (1.2) | **Resuelto** | `reports`/`blocks` + RPC `block_user` (0017/0018), `ReportSheet` en chat, "Tu coach" y reseñas, filtro `contentFilter.ts`, bandeja `/admin/reportes` (descartar, borrar contenido, suspender). Contacto publicado en Legal/FAQ. |
| P0 | Icono | Ícono 1024 con canal alfa (ITMS-90717) | **Resuelto** | `sips -g hasAlpha` → `no`. |
| P0 | Acceso | Muro de login con OTP por mail y sin modo demo (2.1 / 5.1.1) | **Resuelto** | "Continuar sin cuenta" (Login), migración al registrarse (`guest.ts`, `remapUserData`, test). Para las funciones de coach el revisor necesita cuentas demo (ver 4). |
| P1 | Privacidad | Política/términos incompletos y falsos ("sin publicidad", sin DNI, chat, GPS) | **Resuelto en la app** | `src/lib/legalText.ts` (fuente única, `docs/legal/*.md` generado y verificado por `npm test`), `LEGAL_VERSION` 2 + `LegalUpdateGate`. **Pendiente**: URL pública y revisión legal (edad mínima 16 y jurisdicción "República Argentina" son supuestos marcados). |
| P1 | Privacidad | Sin `PrivacyInfo.xcprivacy` | **Resuelto** | En el bundle compilado; sin tracking; tipos de datos declarados; sin APIs de razón requerida en código propio. Ver "Antes de prender anuncios". |
| P1 | Pagos | Cobro por fuera de StoreKit / precio maqueteado (3.1.1) | **Resuelto en código, apagado** | `purchases.ts`, `Paywall` (precio localizado, renovación, cancelación, **Restaurar** visible, links legales), sin Mercado Pago. `VITE_PURCHASES_ENABLED=off` por defecto. |
| P1 | ATT/Ads | Anuncios sin consentimiento (5.1.2) | **Resuelto en código, apagado** | `ads.ts`: aviso propio → ATT → UMP; no personalizados si se rechaza; nunca en entrenos/correr/cardio. |
| P1 | Enlaces | Links de invitación con `capacitor://localhost` | **Resuelto** | `publicUrl.ts` (`PUBLIC_APP_URL`). Requiere que la PWA desplegada tenga las rutas `/unirse` e `/importar` (rama `main`). |
| P1 | Calidad | Pantalla de error con stack crudo | **Resuelto** | `ErrorBoundary` solo en dev. |
| P1 | Salud | Estimaciones de calorías/pesos sin aviso | **Resuelto** | Aviso en Calorías y Calculadora + términos. |
| P1 | Config | `UIRequiredDeviceCapabilities` = armv7 | **Resuelto** | `arm64`. |
| P1 | Soporte | `SUPPORT_EMAIL` es un Gmail personal | **Pendiente (vos)** | `src/lib/legal.ts:8`. |
| P2 | Build | Deployment target: app 15.0, widget 16.2 | **No verificado** | Puede pedir aclaración en App Store Connect; ActivityKit exige 16.1+. Decisión de producto: subir la app a 16.2 o aceptar el desajuste. |
| P2 | Permisos | Ubicación en segundo plano (`UIBackgroundModes: location`) | **Explicar en notas** | Ver notas para el revisor. |
| P2 | Seguridad | Reglas RLS del modo coach (reasignar vínculos, lookup de invitaciones, edición de mensajes) | **Resuelto y probado** | Migraciones 0016–0022; `supabase/tests/coach_rls_smoke.sql` (29 chequeos) → `RLS_TEST_ALL_OK` contra la base real, transacción revertida. |
| P3 | Higiene | `@emailjs/browser` y `@tanstack/react-query` sin uso | **Resuelto** | Quitados de `package.json`. |

## 3. Experiencia del revisor

| Paso | ¿Funciona? |
|---|---|
| Instalar y abrir | Sí (`xcodebuild` simulador: BUILD SUCCEEDED con RevenueCat + AdMob). |
| Primer uso sin registrarse | Sí: "Continuar sin cuenta" → onboarding → app completa. |
| Permisos | Cámara (QR/fotos), fotos, ubicación en uso y "siempre" (correr), notificaciones: todas con texto propio en `Info.plist`, pedidas en contexto. |
| Funciones de coach | Requieren cuenta (invitado no puede): dar cuentas demo. |
| Compras / restaurar | Apagadas hasta cargar keys. Con ellas: Paywall + Ajustes → Suscripciones → Restaurar. |
| Borrar cuenta | Ajustes → Cuenta (invitado: "Borrar mis datos"). |
| Soporte / legal | Ajustes → Ayuda → Preguntas frecuentes / Términos y privacidad. |
| Sin conexión | La app funciona entera; los mapas y las funciones de nube muestran estado offline. |

## 4. Lo que tenés que hacer vos

1. **Apple Developer Program** (US$99/año): TestFlight, IAP real y publicar.
2. **App Store Connect**: acuerdos/impuestos/banco; grupo de suscripciones con
   `gymtracker.coach.monthly` (US$5) y `gymtracker.noads.monthly` (US$1.99);
   ficha, capturas, **URL de la política de privacidad** y de soporte; respuestas de
   "App Privacy" (ver abajo).
3. **RevenueCat**: proyecto + app iOS, entitlements `coach` y `ad_free`, API key
   pública (`appl_…`) → `VITE_REVENUECAT_IOS_KEY`; webhook a
   `…/functions/v1/revenuecat-webhook` con cabecera `Authorization` = secreto;
   `supabase secrets set REVENUECAT_WEBHOOK_SECRET=…`. Para exigir la suscripción en
   el servidor: `supabase secrets set REQUIRE_COACH_SUBSCRIPTION=on`.
4. **AdMob** (solo si vas a mostrar anuncios): cuenta, app iOS, bloque de banner →
   `VITE_ADMOB_BANNER_ID`; reemplazar `GADApplicationIdentifier` en `Info.plist`
   (hoy es el ID de prueba de Google) y completar `SKAdNetworkItems` con la lista
   de Google.
5. **Cuentas demo** para el revisor (un usuario y un coach con un alumno) en Supabase.
6. **Email de soporte** propio y una **URL pública** de la política: publicar la PWA
   desde `main` (el workflow de Pages solo despliega `main`).
7. **Revisión legal** de `legalText.ts` (edad mínima, jurisdicción, plazos).
8. Prender los flags en el build de release: `VITE_PURCHASES_ENABLED=on`,
   `VITE_ADS_ENABLED=on`.

## 5. Antes de prender anuncios

`PrivacyInfo.xcprivacy` declara **sin seguimiento**. Al prender AdMob con
personalización hay que: poner `NSPrivacyTracking` en `true`, agregar los tipos de
datos de Google (ID de dispositivo, datos de publicidad y uso) como usados para
publicidad, y responder "App Privacy" en App Store Connect en consecuencia (datos
usados para seguimiento: ID de dispositivo). La política (`legalText.ts`) ya tiene la
sección de anuncios condicionada al flag.

## 6. Respuestas de "App Privacy" (sin anuncios)

Datos **vinculados a la identidad** del usuario, para funcionalidad de la app, **sin
seguimiento**: correo, nombre, ID de usuario, fitness (entrenos), salud (medidas,
calorías), contenido del usuario (mensajes, reseñas) e información sensible (DNI de
coaches). **No se recopilan** ubicación (el recorrido GPS no sale del dispositivo) ni
fotos de progreso (solo locales). Con compras: historial de compras (RevenueCat).

## 7. Notas para el revisor (borrador para pegar en App Store Connect)

> GymTracker es un registro de entrenamientos que funciona sin conexión. **No hace
> falta cuenta**: en la pantalla inicial tocá "Continuar sin cuenta".
>
> **Ubicación**: solo al registrar una salida a correr (Inicio → Correr). Pedimos
> "Siempre" y el modo en segundo plano para no cortar el recorrido con la pantalla
> apagada; iOS muestra el indicador de ubicación y una Live Activity con distancia y
> ritmo. El recorrido no sale del dispositivo.
>
> **Modo coach**: requiere cuenta. Cuenta demo de alumno: [email] / [contraseña].
> Cuenta demo de coach (con un alumno vinculado): [email] / [contraseña]. Desde Ajustes
> → "Convertirme en coach" se ve el alta en tres pasos.
>
> **Borrar cuenta**: Ajustes → Cuenta → Borrar mi cuenta. **Restaurar compras**:
> Ajustes → Suscripciones → Restaurar compras (cuando las compras estén activas).
>
> **Contenido de usuarios**: los mensajes y reseñas se pueden reportar y bloquear
> (ícono de bandera); los reportes los revisa el administrador desde el panel.
> Contacto: [email de soporte].

## 8. Lista previa al envío

- [ ] `npm test`, `npm run build`, `xcodebuild` sin errores; probar en iPhone 393px.
- [ ] Ícono 1024 sin alfa; capturas 6.7" y 6.1".
- [ ] Versión/build incrementados; firma con el equipo de pago.
- [ ] URL de política y soporte respondiendo (200).
- [ ] Productos de suscripción creados y en estado "Ready to Submit", con captura del paywall.
- [ ] Cuentas demo funcionando y sus datos en las notas.
- [ ] `REVENUECAT_WEBHOOK_SECRET` cargado y evento de prueba recibido.
- [ ] `GADApplicationIdentifier` real (si hay anuncios) y `NSPrivacyTracking` acorde.
- [ ] Flags `VITE_*` de release cargados; `dist` sin claves privadas (la anon key es pública por diseño; la service_role no está en el frontend).

## No verificado desde acá

Plantillas de email/OTP en producción · compra, restauración y webhook con dinero
real · anuncios reales · comportamiento en dispositivo físico del layout de
escritorio del coach y de la tab bar · éxito del borrado de cuenta.
