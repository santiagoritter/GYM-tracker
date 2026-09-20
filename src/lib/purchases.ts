import { platform } from '@/lib/native'
import { useEntitlementsStore } from '@/stores/entitlementsStore'

/**
 * Compras dentro de la app (StoreKit vía RevenueCat). Guideline 3.1.1: las
 * funciones digitales (modo coach, quitar anuncios) se cobran SOLO por IAP; no
 * hay pagos externos.
 *
 * Todo degrada sin romper: si el flag `VITE_PURCHASES_ENABLED` está apagado, no
 * hay API key de RevenueCat, o no es iOS, `purchasesAvailable()` da `false` y
 * ninguna pantalla muestra compras — la app se comporta como gratuita.
 *
 * Productos (crear en App Store Connect, mismo grupo de suscripciones) y
 * entitlements (crear en RevenueCat y asociar a cada producto):
 */
export const PRODUCT_COACH = 'gymtracker.coach.monthly'
export const PRODUCT_AD_FREE = 'gymtracker.noads.monthly'
export const ENTITLEMENT_COACH = 'coach'
export const ENTITLEMENT_AD_FREE = 'ad_free'

const API_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined

export function purchasesAvailable(): boolean {
  return import.meta.env.VITE_PURCHASES_ENABLED === 'on' && platform === 'ios' && Boolean(API_KEY)
}

export interface PurchaseOption {
  /** Id del paquete de RevenueCat (para comprar). */
  packageId: string
  productId: string
  title: string
  /** Precio ya localizado por StoreKit (moneda y formato del usuario). */
  priceString: string
  /** "mensual" — no se asume: viene del producto. */
  period: string
}

type PluginModule = typeof import('@revenuecat/purchases-capacitor')
type CustomerInfo = Awaited<ReturnType<PluginModule['Purchases']['getCustomerInfo']>>['customerInfo']
type Package = Awaited<ReturnType<PluginModule['Purchases']['getOfferings']>>['current'] extends infer O
  ? O extends { availablePackages: (infer P)[] }
    ? P
    : never
  : never

let ready: Promise<PluginModule> | null = null
const packages = new Map<string, Package>()

function applyCustomerInfo(info: CustomerInfo): void {
  const active = info.entitlements.active
  useEntitlementsStore.getState().setEntitlements({
    adFree: Boolean(active[ENTITLEMENT_AD_FREE]),
    coach: Boolean(active[ENTITLEMENT_COACH]),
  })
}

/**
 * Configura RevenueCat una sola vez. `userId` es el id de la cuenta (así la
 * compra queda atada a la cuenta y el webhook sabe a quién pertenece); sin él
 * (modo sin cuenta) RevenueCat usa un id anónimo y, al registrarse, `identify`
 * lo une a la cuenta.
 */
export function initPurchases(userId: string | null): Promise<PluginModule | null> {
  if (!purchasesAvailable()) return Promise.resolve(null)
  if (!ready) {
    ready = (async () => {
      const mod = await import('@revenuecat/purchases-capacitor')
      await mod.Purchases.configure({ apiKey: API_KEY!, appUserID: userId ?? undefined })
      await mod.Purchases.addCustomerInfoUpdateListener(applyCustomerInfo)
      applyCustomerInfo((await mod.Purchases.getCustomerInfo()).customerInfo)
      return mod
    })().catch((e) => {
      ready = null // se reintenta la próxima vez
      throw e
    })
  }
  return ready
}

/** Ata las compras a la cuenta al iniciar sesión / registrarse. */
export async function identifyPurchasesUser(userId: string): Promise<void> {
  const mod = await initPurchases(userId)
  if (!mod) return
  const { customerInfo } = await mod.Purchases.logIn({ appUserID: userId })
  applyCustomerInfo(customerInfo)
}

/** Al cerrar sesión: vuelve a un usuario anónimo y limpia los beneficios locales. */
export async function resetPurchasesUser(): Promise<void> {
  useEntitlementsStore.getState().reset()
  if (!ready) return
  try {
    const mod = await ready
    await mod.Purchases.logOut()
  } catch {
    // ya era anónimo o sin red: no hay nada que deshacer
  }
}

/** Productos disponibles para comprar, con precio localizado. */
export async function loadPurchaseOptions(): Promise<PurchaseOption[]> {
  const mod = await initPurchases(null)
  if (!mod) return []
  const offerings = await mod.Purchases.getOfferings()
  const list = offerings.current?.availablePackages ?? []
  packages.clear()
  return list.map((p) => {
    packages.set(p.identifier, p as Package)
    return {
      packageId: p.identifier,
      productId: p.product.identifier,
      title: p.product.title,
      priceString: p.product.priceString,
      period: p.product.subscriptionPeriod === 'P1M' ? 'mes' : (p.product.subscriptionPeriod ?? ''),
    }
  })
}

/** Compra un paquete. Devuelve `false` si el usuario canceló (no es un error). */
export async function purchase(packageId: string): Promise<boolean> {
  const mod = await initPurchases(null)
  const aPackage = packages.get(packageId)
  if (!mod || !aPackage) throw new Error('Producto no disponible.')
  try {
    const { customerInfo } = await mod.Purchases.purchasePackage({ aPackage: aPackage as never })
    applyCustomerInfo(customerInfo)
    return true
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false
    throw e
  }
}

/** "Restaurar compras" (obligatorio y visible, Guideline 3.1.1). */
export async function restorePurchases(): Promise<void> {
  const mod = await initPurchases(null)
  if (!mod) throw new Error('Las compras no están disponibles.')
  const { customerInfo } = await mod.Purchases.restorePurchases()
  applyCustomerInfo(customerInfo)
}
