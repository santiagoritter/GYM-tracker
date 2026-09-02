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
npm run build:native      # compila + copia el dist al proyecto nativo

npm run android           # abre Android Studio
npm run ios               # abre Xcode (solo en macOS)
```

Cada vez que cambia el código web hay que volver a correr `build:native`:
el webview sirve una copia, no el `dist/` en vivo.

### Requisitos

| Plataforma | Necesita |
|---|---|
| Android | Android Studio + JDK 17. La carpeta `android/` ya está en el repo. |
| iOS | macOS + Xcode + CocoaPods. **La carpeta `ios/` no está**: `npx cap add ios` solo corre en macOS. |

Para generar el proyecto de iOS, desde una Mac:

```bash
npm install
npx cap add ios
npm run ios
```

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
con `build:native` (sin base path), sincroniza Capacitor, arma el APK y lo publica como
asset del release `android-latest` — así hay un link de descarga directo y estable:
`github.com/santiagoritter/GYM-tracker/releases/latest`. Ese link también está en `README.md`
y en Ajustes → "La app" → "Descargar para Android".

Hoy firma con el **keystore debug** (instala, pero Android avisa "app de origen desconocido").
Para un APK de release firmado de verdad:

1. Generar un keystore de subida:
   `keytool -genkey -v -keystore gymtracker.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`
2. Cargar como secrets del repo: `ANDROID_KEYSTORE_BASE64` (`base64 -w0 gymtracker.jks`),
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
3. En el workflow, cambiar `assembleDebug` por `assembleRelease` + `signingConfig` que lea
   esos secrets, o firmar con `apksigner` después del assemble.

Play Store queda para más adelante (revisión, ficha, cuenta de desarrollador 25 USD única vez).

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

- [ ] Generar `ios/` desde una Mac.
- [ ] Iconos y splash nativos (`@capacitor/assets` los genera desde un PNG de
      1024×1024).
- [ ] Firmar y publicar. Android: keystore + Play Console. iOS: cuenta de
      desarrollador de Apple (99 USD/año) o instalación por cable con Xcode
      para uso personal.
- [ ] Revisar el teclado en Android: `@capacitor/keyboard` permite ajustar
      cómo se comporta el layout al abrirse, y el temporizador de descanso es
      fijo en la parte inferior.
