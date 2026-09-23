// Supabase Edge Function: revenuecat-webhook
//
// Recibe los eventos de RevenueCat (compra, renovación, vencimiento…) y deja
// `subscriptions` al día. Al VENCER una suscripción de coach, y solo si
// `app_config.coach_billing_required` está prendido, el usuario deja de ser
// coach (rol → user y se terminan los vínculos con sus alumnos) — el mismo
// efecto que `leave-coach`. Con el cobro apagado (modo gratis), una
// suscripción que vence no le saca el rol a nadie — nunca se lo exigió para
// tenerlo.
//
// Autenticación: RevenueCat no manda un JWT de Supabase; en su dashboard
// (Integrations → Webhooks) se configura una cabecera `Authorization` con un
// secreto compartido, y acá se compara contra REVENUECAT_WEBHOOK_SECRET. Sin
// ese secreto configurado, la función rechaza todo (falla cerrada).
//
// El `app_user_id` es el id de la cuenta de Supabase (el cliente hace
// `Purchases.logIn(userId)`); los ids anónimos de RevenueCat se ignoran.
//
// Desplegar SIN verificación de JWT (no lo manda RevenueCat):
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<un secreto largo>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { entitlementsFromEvent, type KnownEntitlement } from '../_shared/entitlements.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? ''

const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
])

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  if (!WEBHOOK_SECRET || req.headers.get('Authorization') !== WEBHOOK_SECRET) {
    return json({ error: 'No autorizado.' }, 401)
  }

  let body: { event?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body inválido.' }, 400)
  }
  const event = body.event ?? {}
  const type = String(event.type ?? '')
  const userId = String(event.app_user_id ?? '')
  const productId = String(event.product_id ?? '')
  const entitlements = entitlementsFromEvent(event)

  // Eventos que no nos interesan (TEST, anónimos, entitlements ajenos): 200
  // para que RevenueCat no reintente.
  if (!UUID.test(userId) || entitlements.length === 0) return json({ ok: true, ignored: true })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const expiresMs = typeof event.expiration_at_ms === 'number' ? event.expiration_at_ms : null
  const expiresAt = expiresMs ? new Date(expiresMs).toISOString() : null

  try {
    for (const entitlement of entitlements) {
      if (ACTIVE_EVENTS.has(type)) {
        await upsert(admin, userId, entitlement, productId, 'active', expiresAt)
      } else if (type === 'BILLING_ISSUE') {
        await upsert(admin, userId, entitlement, productId, 'billing_issue', expiresAt)
      } else if (type === 'EXPIRATION') {
        await upsert(admin, userId, entitlement, productId, 'expired', expiresAt)
        if (entitlement === 'coach') await maybeRevokeCoach(admin, userId)
      }
      // CANCELLATION: la suscripción sigue vigente hasta `expires_at`; el
      // cambio real llega con EXPIRATION.
    }
    return json({ ok: true })
  } catch (err) {
    // 5xx para que RevenueCat reintente.
    return json({ error: err instanceof Error ? err.message : 'Error interno.' }, 500)
  }
})

async function upsert(
  admin: ReturnType<typeof createClient>,
  userId: string,
  entitlement: KnownEntitlement,
  productId: string,
  status: 'active' | 'expired' | 'billing_issue',
  expiresAt: string | null
) {
  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    entitlement,
    product_id: productId,
    status,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

/** Igual que `leave-coach`: termina los vínculos y vuelve el rol a `user`
 * (un admin no se degrada) — pero SOLO si el cobro está exigido. Con
 * `coach_billing_required = false` (modo gratis, el default), nadie tuvo
 * que pagar para ser coach, así que una suscripción que vence no le tiene
 * que sacar nada a nadie. */
async function maybeRevokeCoach(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: config } = await admin
    .from('app_config')
    .select('coach_billing_required')
    .eq('id', true)
    .maybeSingle()
  if (!config?.coach_billing_required) return

  const { data } = await admin.auth.admin.getUserById(userId)
  const role = (data.user?.app_metadata as Record<string, unknown> | undefined)?.role
  if (role !== 'coach') return

  const { error: bondsErr } = await admin
    .from('coach_clients')
    .update({ status: 'ended', ended_at: new Date().toISOString(), ended_by: userId })
    .eq('coach_id', userId)
    .eq('status', 'active')
  if (bondsErr) throw bondsErr

  const { error: roleErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'user' },
  })
  if (roleErr) throw roleErr

  await admin
    .from('admin_audit')
    .insert({ actor_id: userId, action: 'coach_subscription_expired', target_user_id: userId, detail: {} })
    .then(() => {}, () => {})
}
