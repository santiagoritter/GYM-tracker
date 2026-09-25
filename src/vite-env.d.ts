/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string
  readonly VITE_PUBLIC_APP_URL?: string
  readonly VITE_PURCHASES_ENABLED?: string
  readonly VITE_REVENUECAT_IOS_KEY?: string
  readonly VITE_REVENUECAT_ANDROID_KEY?: string
  readonly VITE_ADS_ENABLED?: string
  readonly VITE_ADMOB_BANNER_ID_IOS?: string
  readonly VITE_ADMOB_BANNER_ID_ANDROID?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
