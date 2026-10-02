import { useEffect, useState } from 'react'
import { loadPurchaseOptions, purchasesAvailable } from '@/lib/purchases'
import { productBase } from '@/lib/premium'

/** Precio localizado de un producto (StoreKit), o `null` si todavía no cargó o
 * no hay compras en esta plataforma. Nunca un precio escrito a mano. */
export function useProductPrice(productId: string): { price: string; period: string } | null {
  const [value, setValue] = useState<{ price: string; period: string } | null>(null)
  useEffect(() => {
    if (!purchasesAvailable()) return
    let alive = true
    loadPurchaseOptions()
      .then((options) => {
        const o = options.find((x) => productBase(x.productId) === productId)
        if (alive && o) setValue({ price: o.priceString, period: o.period })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [productId])
  return value
}
