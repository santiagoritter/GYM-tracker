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
