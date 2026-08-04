import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Configuración de Capacitor para empaquetar la PWA como app nativa.
 *
 * OJO con el base path: en GitHub Pages la app vive en `/GYM-tracker/`, pero
 * en nativo se sirve desde la raíz del webview (`capacitor://localhost` en
 * iOS, `http://localhost` en Android). Por eso la build nativa se hace SIN
 * la variable VITE_BASE_PATH — ver el script `build:native` en package.json.
 * Si se sincroniza una build con el base path de Pages, la app nativa
 * arranca en pantalla blanca porque ningún asset resuelve.
 */
const config: CapacitorConfig = {
  appId: 'com.santiagoritter.gymtracker',
  appName: 'GymTracker',
  webDir: 'dist',

  // El contenido va embebido en el binario, no se descarga de un servidor:
  // así la app abre sin conexión, que es el caso de uso real.
  server: {
    androidScheme: 'https',
  },

  ios: {
    // El contenido se dibuja por debajo de la barra de estado y el notch; el
    // padding lo pone la app con env(safe-area-inset-*), igual que en la web.
    contentInset: 'never',
    backgroundColor: '#0B0B0C',
  },

  android: {
    backgroundColor: '#0B0B0C',
  },

  plugins: {
    SplashScreen: {
      launchAutoHide: false, // la oculta la app cuando Dexie ya abrió
      backgroundColor: '#0B0B0C',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    LocalNotifications: {
      iconColor: '#E8FF47',
    },
  },
}

export default config
