# Promesas de la presentación vs. el código

Fuente: presentación "REPE — Visión de producto" (sept 2026, 14 slides), pasada
a texto. El estado sale de leer el código (auditoría del 2026-10-02), no de
otros documentos. Se actualiza al cerrar cada bloque del plan.

Estados: **OK** cumple · **PARCIAL** · **FALTA** · **AJUSTAR TEXTO** (el código
está bien y la presentación dice otra cosa).

## Producto (slides 2–5)

| Promesa | Estado | Evidencia / nota |
|---|---|---|
| 107 ejercicios, 11 grupos con nivel, 20+ migraciones | OK | `src/data/exercises.ts`, `muscleGroupStrength.ts:18`, `supabase/migrations/` |
| 100 % funcional sin conexión, sincroniza sola | PARCIAL | Registro/login necesitan red; no suben bytes de fotos ni el GPS de salidas |
| Descanso en bloqueo / Dynamic Island | OK (sin probar en dispositivo) | target en `project.pbxproj`, `LiveActivityPlugin.swift`, `RestTimer.tsx:63` |
| Peso sugerido "por serie" | AJUSTAR TEXTO | un solo peso por ejercicio (`workoutStore.ts:197`) |
| Sin cuenta y migra al registrarse | OK | `guest.ts`, `migrateLocalUserToSupabase.ts` |
| Modo coach: rutinas, seguimiento, chat, invitación por link/QR, corte por ambas partes | OK | migraciones 0012–0025 |
| Alta de coach verificada con DNI | PARCIAL | DNI único; el admin verifica desde `AdminCoachVerification` y para menores es obligatorio; el DNI no se coteja con un registro oficial |

## Comercial (slides 6–8)

| Promesa | Estado | Evidencia / nota |
|---|---|---|
| Registro básico gratis siempre | OK | sin candados en series, rutinas, récords |
| Premium $1.990: niveles por músculo, gráficos avanzados, fotos, sin anuncios | OK en código | entitlement `premium` (0029), candados en `Progress.tsx` y `PhotoGallery.tsx`, `PremiumGate.tsx`; **solo bloquea donde hay compras** (iOS/Android con RevenueCat). Falta crear los productos en las tiendas |
| Premium anual $17.990 | OK en código | `Paywall.tsx` con selector mensual/anual y ahorro calculado del precio de StoreKit |
| Coach $9.990 | PARCIAL | ya no hay precio escrito en el código (lo muestra StoreKit); falta fijarlo en las tiendas. `GymTracker.storekit` local ya trae $9.990 |
| "El código ya soporta RevenueCat" | PARCIAL | escrito pero apagado en CI |
| Cobro de Coach obligatorio | PARCIAL | se exige en la base (0030: `coach_is_entitled`, políticas, `is_coach_of`, `accept_coach_invite`); **el flag sigue apagado a propósito** hasta publicar las builds |
| Anuncios fuera de entrenamiento | OK | `AdBanner.tsx:23` |

## Menores (slides 9–12)

| Promesa | Estado | Evidencia / nota |
|---|---|---|
| Edad obligatoria al registrarse, también invitado | OK | `Registro.tsx`, `Onboarding.tsx` (rango 13–100), `src/lib/age.ts`; servidor: trigger 0027 |
| Vínculo con coach solo con consentimiento de madre/padre | OK | migración 0028, `GuardianConsent.tsx`, `JoinCoach.tsx`; probado en `supabase/tests/guardian_consent_smoke.sql` |
| Sin adjuntos libres en el chat | OK | solo ejercicio o rutina |
| Reporte visible en el chat | OK | `ChatThread.tsx:169` |
| Fotos de progreso nunca salen del teléfono | OK (texto ajustado) | las imágenes no suben; el peso y las notas de cada foto sí se sincronizan, bajo RLS y sin acceso del coach |
| Calorías apagadas por defecto, sin déficit | OK | `schema.ts` y onboarding nacen en 0; `Calories.tsx` oculta déficit a menores |
| Anuncios a menores no personalizados | OK | `AdBanner.tsx`: ni menores ni edad desconocida ven anuncios. Falta bloquear categorías en la consola de AdMob (manual) |
| Avisos sin copy de peso/cuerpo | OK | frases retiradas; `scripts/test-age.mts` lo verifica |
| Sin rankings entre menores | OK | solo el agregado anónimo (0026, k ≥ 5) |
| Privacidad alineada con Ley 25.326 | PARCIAL | citada con AAIP y edad mínima 13 (`legalText.ts`, versión 3); falta revisión de un abogado |
| Consentimiento explícito para calorías, vínculo cortable, reportar y bloquear, RLS, borrado de cuenta | OK | 0020, 0012, 0017, `DeleteAccountSheet.tsx` |

## Pulir y pasos (slides 13–14)

| Promesa | Estado | Evidencia / nota |
|---|---|---|
| Tarjeta para compartir el entreno | OK | `shareCard.ts` (canvas 1080×1920, negro y lima, logo, récords, volumen, radar), `ShareWorkoutButton.tsx` en "Revisá tu entreno"; plugins `@capacitor/share` y `filesystem`. Sin fotos ni peso corporal |
| "Septiembre De" | OK | `capitalizeFirst` (`formatStats.ts`) |
| "1.3 h" | OK | `formatTotalDuration`: "1 h 18 min"; toneladas con coma |
| Racha 0 arriba y 1 en Progreso | MITIGADO | una sola fuente (`computeStreak`); el 0 de "cargando" ahora es "—" (`useTrainingStats`) |
| Voseo ("Revisa") | AJUSTAR TEXTO | ya corregido en `src/` |
| Links de invitación con dominio propio | PARCIAL | configurable por `VITE_PUBLIC_APP_URL` (ahora el CI de iOS/Android la pasa; una variable vacía ya no rompe la URL). Falta comprar el dominio, `VITE_BASE_PATH=/`, CNAME y Associated Domains |
| App Store y después Android | PARCIAL | sin lane de archive ni TestFlight; sin push nativo |


## Para salir: lo que depende de vos (no se puede hacer desde el código)

1. App Store Connect / Play Console: productos `gymtracker.premium.monthly`
   ($1.990), `gymtracker.premium.annual` ($17.990) y `gymtracker.coach.monthly`
   ($9.990). RevenueCat: entitlements `premium` y `coach`, y el offering.
2. Variables del repo (Settings → Variables): `VITE_PURCHASES_ENABLED=on`;
   secretos: `VITE_REVENUECAT_IOS_KEY`, `VITE_REVENUECAT_ANDROID_KEY`.
3. Prender `coach_billing_required` y correr `enforce-coach-billing` **solo
   después** de publicar las builds de iOS, Android y PWA.
4. Si se muestran anuncios: IDs reales de AdMob, categorías bloqueadas en la
   consola (suplementos, dietas, productos para bajar de peso) y actualizar
   `PrivacyInfo.xcprivacy` (ver `docs/APP-STORE-REVIEW.md` §5).
5. Revisión de un abogado: política de privacidad y términos (menores, tutor,
   Ley 25.326) y clasificación por edad en las tiendas.
6. Un perfil de producción tiene una fecha de nacimiento anterior a la regla de
   13 años: decidir qué se hace con esa cuenta.
7. Push nativo con la app cerrada: cuenta de Apple Developer y proyecto de
   Firebase.
