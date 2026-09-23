# 16 — App nativa con Capacitor

La misma base de código React corre en tres contextos: navegador, PWA
instalada y app nativa (iOS/Android). Capacitor empaqueta el `dist/` dentro
de un binario con un webview.

---

## El detalle que rompe todo si se pasa por alto

**La build nativa NO lleva base path.**

En GitHub Pages la app vive en `/GYM-tracker/`, y por eso el workflow define
`VITE_BASE_PATH=/GYM-tracker/`. En nativo el contenido se sirve desde la
raíz del webview (`capacitor://localhost` en iOS, `http://localhost` en
Android). Si sincronizás una build con el base path de Pages, la app abre en
**pantalla blanca**: ningún asset resuelve y `BrowserRouter` monta con un
`basename` que no existe.

Por eso hay dos scripts distintos:

```
npm run build          # sin VITE_BASE_PATH -> base "/"  -> nativo
npm run build:native   # lo anterior + cap sync
```

El workflow de Pages es el único que define `VITE_BASE_PATH`.

---

## Flujo de trabajo

```bash
npm run build:native      # compila + copia el dist a los proyectos nativos

npm run android           # abre Android Studio
npm run ios               # abre Xcode (solo en macOS)
```

Cada vez que cambia el código web hay que volver a correr `build:native`:
el webview sirve una copia, no el `dist/` en vivo.

### Requisitos

| Plataforma | Necesita |
|---|---|
| Android | Android Studio + JDK 21. La carpeta `android/` está en el repo. |
| iOS | macOS + **Xcode completo** (los Command Line Tools solos no alcanzan). **No** hace falta CocoaPods: Capacitor 8 usa Swift Package Manager. La carpeta `ios/` está en el repo. |

---

## iOS

La carpeta `ios/` ya está generada (`npx cap add ios`, Capacitor 8 → Swift
Package Manager, sin `Podfile`). Config aplicada sobre el scaffold:

- **Solo iPhone** (`TARGETED_DEVICE_FAMILY = 1`), orientación **portrait** —
  igual que el `orientation: portrait` del manifest PWA.
- Bundle ID `com.santiagoritter.gymtracker` (el mismo que el `applicationId` de
  Android). Deployment target iOS 15.
- `Info.plist` con las descripciones de permiso que la app realmente usa:

  | Clave | Para qué | Código |
  |---|---|---|
  | `NSCameraUsageDescription` | escanear QR de rutina, foto de progreso | `QRScanner.tsx` (`getUserMedia`), `PhotoGallery`/`ExerciseDetailSheet` (`<input capture>`) |
  | `NSPhotoLibraryUsageDescription` | elegir foto de progreso de la galería | inputs `type=file accept="image/*"` |
  | `NSLocationWhenInUseUsageDescription` | recorrido de running con la app abierta | `src/lib/geo.ts` |
  | `NSLocationAlwaysAndWhenInUseUsageDescription` | seguir grabando con la pantalla bloqueada | `src/lib/geo.ts` (background-geolocation) |
  | `UIBackgroundModes` → `location` | idem | idem |
  | `ITSAppUsesNonExemptEncryption` = `false` | solo cripto estándar/exenta (HTTPS + AES-GCM/PBKDF2 de WebCrypto) — evita la pregunta de exportación en App Store Connect | `docs/19` |

- Íconos y splash: los genera `scripts/generate-icons.mjs` (sin dependencias) —
  mancuerna lima sobre `#0B0B0C`, en `ios/App/App/Assets.xcassets/`. El
  `AppIcon` sale con canal alfa; **para App Store hay que aplanarlo** (Apple
  rechaza alfa en el ícono de la app).

### Correr en un iPhone (firma con Apple ID gratis)

1. Instalar **Xcode** desde la Mac App Store. Después:
   `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` y
   `sudo xcodebuild -license accept`.
2. `npm run ios` (compila la web sin base path, sincroniza Capacitor y abre
   Xcode).
3. En Xcode: target **App** → *Signing & Capabilities* → marcar *Automatically
   manage signing* y elegir el *Team* (tu Apple ID personal, se agrega en
   *Settings → Accounts*).
4. Conectar el iPhone por cable, confiar en la Mac, elegirlo como destino y
   *Run*. La primera vez, en el teléfono: *Ajustes → General → VPN y gestión de
   dispositivos* → confiar en el certificado.

Con un Apple ID gratis el perfil de firma **caduca a los 7 días**: se renueva
volviendo a correr desde Xcode. Sin límite con el Apple Developer Program
(USD 99/año).

### Publicar en la App Store (pendiente, fuera de esta tanda)

Requiere Apple Developer Program, registrar la app en App Store Connect, ficha +
capturas + etiquetas de privacidad (cámara, ubicación, "datos no vinculados al
usuario" por el historial local), aplanar el alfa del ícono, `Product → Archive`
→ *Validate* → *Distribute* → TestFlight → review.

### CI

`.github/workflows/ios.yml` (manual, `macos-14`) compila el proyecto para
simulador sin firma. No entrega `.ipa` — solo verifica que la parte nativa no
se rompió. Los minutos de runner macOS son caros, por eso es manual como
`android.yml`.

---

## Live Activities / Dynamic Island (iOS)

Tres Live Activities: **descanso entre series** (cuenta regresiva), **entreno
en curso** (tiempo, ejercicio actual, series hechas/totales) y
**running/cardio** (tiempo, distancia, ritmo promedio — estos dos últimos
opcionales, algunos aparatos de cardio no calculan distancia). Aparecen en la
pantalla de bloqueo (iOS 16.2+) y en la Dynamic Island (iPhone 14 Pro+).

### Piezas

| Archivo | Target | Rol |
|---|---|---|
| `src/lib/liveActivity.ts` | web | Puente JS. `registerPlugin('GymTrackerLiveActivity')`. Todo `platform === 'ios'` + `try/catch`: sin la extensión, en Android o web es no-op. |
| `ios/App/GymTrackerWidget/LiveActivityAttributes.swift` | **App + Widget** | Los `ActivityAttributes` compartidos (`RestActivityAttributes`, `WorkoutActivityAttributes`, `RunActivityAttributes`). |
| `ios/App/App/LiveActivityPlugin.swift` | **App** | Plugin Capacitor embebido (`CAPBridgedPlugin`). `startRest`/`endRest`/`startWorkout`/`updateWorkout`/`endWorkout`/`startRun`/`updateRun`/`endRun`. Cada método es no-op si iOS < 16.2 o si el usuario apagó las Live Activities. |
| `ios/App/GymTrackerWidget/*.swift` | **Widget** | `WidgetBundle` + las tres `ActivityConfiguration` (lock screen + Dynamic Island compact/minimal/expanded). El timer lo dibuja iOS (`Text(timerInterval:)`), la app no actualiza cada segundo. **Nunca `.fixedSize()` en `compactTrailing` ni en la raíz de la pantalla de bloqueo** — renderiza vacío/colapsa el ancho en este SO; usar `.frame(width:/minWidth:)` (ver `docs/BITACORA.md`, 2026-09-14/15). |

Cableado: `RestTimer.tsx` (crea/actualiza al arrancar o extender el descanso,
cierra al saltar / llegar a 0 / salir del entreno), `Workout.tsx` (crea con
la sesión, actualiza al completar series, cierra al finalizar) y `Run.tsx` /
`Cardio.tsx` (crea con la sesión, actualiza distancia/ritmo cada ~10s, cierra
al finalizar/cancelar).

### Paso manual en Xcode (una vez)

La Widget Extension es un **target nuevo** que hay que crear desde Xcode
(reescribe el `project.pbxproj`, no se hace a mano):

1. **File → New → Target… → Widget Extension**. Product Name: `GymTrackerWidget`.
   Tildar **Include Live Activity**. Destildar **Include Configuration App
   Intent**. Finish → cuando pregunte "Activate scheme?", **Cancel**.
2. Seleccionar el target nuevo → **General** → *Minimum Deployments* → **iOS
   16.2**. En **Signing & Capabilities**, mismo *Team* que `App`.
3. Borrar los archivos de ejemplo que generó el wizard dentro del grupo
   `GymTrackerWidget` (todos los `.swift`: `GymTrackerWidget.swift`,
   `GymTrackerWidgetLiveActivity.swift`, `GymTrackerWidgetBundle.swift`,
   `AppIntent.swift` si está) → *Move to Trash*.
4. **Add Files to "App"…** → elegir `ios/App/GymTrackerWidget/` (los 3 `.swift`
   que ya están en el repo) → *Add to targets*: **solo `GymTrackerWidgetExtension`**.
5. **Add Files to "App"…** → `ios/App/App/LiveActivityAttributes.swift` y
   `LiveActivityPlugin.swift`:
   - `LiveActivityAttributes.swift` → targets **App y GymTrackerWidgetExtension**.
   - `LiveActivityPlugin.swift` → target **App** solamente.
6. Si el wizard agregó `NSSupportsLiveActivities` al `Info.plist` de la app,
   dejá una sola copia (el repo ya lo trae).
7. **Product → Build** (⌘B).

`.github/workflows/ios.yml` compila `-scheme App`; el scheme incluye la
extensión como dependencia una vez agregada, así que el CI la cubre.

---

## Qué gana la app siendo nativa

No es solo "se instala". Cosas que en el navegador no existen o funcionan
mal, y que ya están conectadas en `src/lib/native.ts`:

| Capacidad | En el navegador | En nativo |
|---|---|---|
| Vibración al completar serie | **Safari en iOS ignora `navigator.vibrate` por completo** — el feedback táctil sencillamente no existía en el iPhone del usuario | Motor háptico real (`@capacitor/haptics`) |
| Aviso de fin de descanso | Solo con la app abierta y en primer plano | Notificación programada con el sistema: llega con la pantalla apagada |
| Barra de estado | Sin control | Estilo y color propios |
| Arranque | Pantalla en blanco hasta el primer render | Splash que se oculta cuando Dexie ya abrió |
| Almacenamiento | IndexedDB puede purgarse si el sistema necesita espacio | Sandbox de la app, no se purga |

`src/lib/native.ts` detecta el contexto y degrada solo: todas sus funciones
son seguras de llamar en el navegador.

---

## Recordatorios y avisos: quién los agenda según el contexto

| Aviso | Web (pestaña/PWA) | App nativa |
|---|---|---|
| Fin de descanso entre series | `RestTimer.tsx` dispara `new Notification` en el tick que llega a 0 — **solo con la app abierta** | `RestTimer.tsx` → `notify(title, body, atSeconds)` → `@capacitor/local-notifications` la **agenda con el SO**: llega con la pantalla apagada. Se cancela en skip/+30s/desmontaje |
| Recordatorio de entrenar (hora del día) | `useReminderScheduler` revisa cada minuto **con la app abierta**; además, en PWA, el push del servidor (`send-push-reminders`) llega con la app cerrada si el usuario activó "Notificaciones push" | `src/lib/nativeReminders.ts` → `syncReminderSchedule(profile)` agenda una **repetición semanal** por cada día elegido a la hora configurada, con el SO. Llega con la app cerrada sin depender de ningún backend |

`syncReminderSchedule` es idempotente: se llama desde `useReminderScheduler` cada vez que
cambian los campos `reminder*` del perfil. Usa IDs reservados (`4_200_000 + díaJS`, 0=domingo)
y un canal Android propio (`gymtracker-reminders`, creado en el arranque por
`ensureReminderChannel` desde `main.tsx`) para poder cancelarse sin tocar el aviso de fin
de descanso. El cuerpo es una frase de `src/lib/quotes.ts` (`getQuoteForNow`) elegida por el
daypart de la hora del recordatorio.

El permiso `POST_NOTIFICATIONS` (Android 13+) lo pide el propio plugin la primera vez que se
agenda algo (`LocalNotifications.requestPermissions()`), disparado por activar el toggle en
`/recordatorios` o por arrancar un descanso.

## Distribución del APK

`.github/workflows/android.yml` (manual, desde Actions → "Build Android APK") compila la web
con `build:native` (sin base path), sincroniza Capacitor, arma el APK **y el AAB** de
**release** (ya no debug) y publica el APK como asset del release `android-latest` — así hay
un link de descarga directo y estable: `github.com/santiagoritter/GYM-tracker/releases/latest`
(solo se pisa si el run corrió desde `main`; desde otra rama el APK/AAB quedan como artifact
del run). Ese link también está en `README.md` y en Ajustes → "La app" → "Descargar para
Android".

### Firma de release — ya generada

El keystore de firma (`repe-release.keystore`, alias `repe-release`, RSA 2048, válido hasta
2056) ya está generado y cargado como 4 secrets del repo (`ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` — es un keystore
PKCS12, así que `ANDROID_KEYSTORE_PASSWORD` y `ANDROID_KEY_PASSWORD` son literalmente la misma
contraseña, `keytool` no deja tener dos distintas en ese formato). `android/app/build.gradle`
los lee por variable de entorno (`ANDROID_KEYSTORE_PATH`, etc.) y arma `signingConfigs.release`
solo si están presentes — sin ellos, `assembleRelease` sigue compilando pero sin firmar (no
rompe un build local sin las variables cargadas).

**Una sola clave, no dos** (a diferencia del setup con "upload key" + "app signing key"
separadas que recomienda Google): la misma firma el AAB que se sube a Play Console y el APK
que se distribuye desde GitHub. Es la elección deliberada para que instalar desde GitHub y
después actualizar desde Play (o al revés) no obligue a desinstalar — las dos fuentes quedan
firmadas igual.

**Backup — crítico, sin esto no hay vuelta atrás.** El keystore y las contraseñas viven en
`~/Repe-android-signing/` en la Mac de desarrollo (`repe-release.keystore` +
`credentials.txt`, permisos `600`). Ese archivo **no está en git ni en ningún backup
automático** — si se pierde el disco sin haberlo copiado a otro lado (un gestor de
contraseñas, un backup cifrado aparte), la app queda sin forma de subir una actualización
nueva a Play para siempre: hay que publicar como app nueva, con otro `applicationId`, y todos
los usuarios pierden su instalación. **Copiar esos dos archivos a un lugar seguro y duradero
es responsabilidad del dueño del proyecto, ninguna automatización de este repo lo hace por
él.**

### Cargar la misma clave en Play Console (Play App Signing)

Al crear la app en Play Console por primera vez, en el paso de firma elegir **"Exportar y
subir una clave desde un almacén de claves Java"** (no dejar que Google genere una nueva) y
usar la utilidad **PEPK** de Google (`https://developer.android.com/studio/publish/app-signing#sign_release`)
para cifrar `repe-release.keystore` con la clave pública que da Play Console en ese paso.
Así el APK firmado con esta misma clave que sale de `android.yml` queda compatible con lo que
Play termina distribuyendo.

### Verificación de una build de release

- `apksigner verify --print-certs app-release.apk` — el certificado tiene que coincidir con
  `keytool -list -v -keystore repe-release.keystore` (mismo SHA-256).
- Instalar la versión N y después la N+1 con `adb install -r` — tiene que actualizar sin
  desinstalar (mismo certificado). Si Android pide desinstalar, algo firmó distinto.
- CI falla explícito (no publica) si falta el secret `ANDROID_KEYSTORE_BASE64` o si el
  `AndroidManifest.xml` procesado no trae el `APPLICATION_ID` de AdMob (ver más abajo).

Play Store: cuenta de desarrollador (25 USD, pago único), ficha de la tienda, capturas,
política de privacidad pública, y **prueba cerrada de 12 testers durante 14 días** antes de
poder pasar a producción con una cuenta personal nueva — conviene subir el primer AAB a esa
prueba cuanto antes, no dejarlo para el final.

## Instalación como PWA (sin APK)

`src/lib/pwaInstall.ts` captura `beforeinstallprompt` y lo guarda para ofrecer "Instalar la
app" desde Ajustes → "La app" en el momento que el usuario quiera (en vez del mini-banner
que el navegador muestra cuando quiere y es fácil de ignorar). En iOS Safari ese evento no
existe: la instalación es manual desde "Compartir → Agregar a inicio".

## Qué NO cambia

- **Dexie sigue siendo la fuente de verdad.** Capacitor no toca la capa de
  datos: IndexedDB funciona igual dentro del webview.
- El código de dominio no sabe que existe Capacitor. Solo `src/lib/native.ts`
  importa sus plugins, y lo hace con `import()` dinámico para que no pesen
  en el bundle web.
- La PWA sigue funcionando. Nativo es una vía de distribución más, no un
  reemplazo.

---

## Pendiente

- [x] Generar `ios/` desde una Mac. Hecho (Capacitor 8 / SPM).
- [x] Iconos y splash nativos de iOS. Hecho vía `scripts/generate-icons.mjs`
      (sin dependencias; Android tiene su propio juego en `res/`).
- [x] Compilar el proyecto en Xcode. **Verificado**: `xcodebuild` para
      `iphonesimulator` (iPhone 17, iOS 26.5) → `** BUILD SUCCEEDED **`, 0
      errores. `@capacitor-community/background-geolocation` (marcado "built for
      Capacitor 7" por el CLI) **compila sin problemas** contra Capacitor 8 por
      SPM. `Package.resolved` pinea `capacitor-swift-pm@8.5.0` y
      `ion-ios-geolocation@2.1.1`.
- [ ] Correr en un **iPhone físico** y probar en runtime: cámara, permiso de
      ubicación "Siempre" + grabado con pantalla bloqueada, háptico,
      notificación local con la app cerrada, splash, safe-area/notch, offline,
      export de backup (`<a download>` en WKWebView). El simulador no cubre GPS
      real ni háptico.
- [ ] Aplanar el canal alfa del `AppIcon` antes de subir a la App Store.
- [ ] Firmar y publicar. Android: keystore + Play Console. iOS: Apple Developer
      Program (99 USD/año) para App Store; para uso personal alcanza el Apple ID
      gratis y correr desde Xcode (perfil de 7 días).
- [ ] Revisar el teclado en Android: `@capacitor/keyboard` permite ajustar
      cómo se comporta el layout al abrirse, y el temporizador de descanso es
      fijo en la parte inferior.
- [ ] `android.useLegacyBridge: true` en `capacitor.config.ts`: el README de
      `@capacitor-community/background-geolocation` lo pide para que el location
      de fondo **en Android** no se corte a los 5 min. Hallazgo al configurar
      iOS; no se tocó para no arriesgar el Android en producción. Ver `docs/18`.
