// Supabase Edge Function: admin-users
//
// El único camino para que el panel de admin ESCRIBA sobre cuentas (cambiar
// email, rol, resetear contraseña, deshabilitar, crear). `auth.admin.*`
// necesita la service_role key, que NUNCA puede ir al frontend — así que va
// acá, y la función re-chequea server-side que quien llama sea admin de
// verdad (rol firmado en su JWT), igual que exige CLAUDE.md §5.
//
// Toda acción mutante deja una fila en `admin_audit` (0011).
//
// Desplegar CON verificación de JWT (es un usuario con sesión quien llama,
// no pg_cron):
//   supabase functions deploy admin-users
// No hace falta setear secrets: SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY ya están en el entorno de las Edge Functions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Falta el token de sesión.' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // 1. Resolver quién llama y confirmar que es admin (rol en app_metadata,
  //    firmado por el server — el cliente no puede falsearlo).
  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt)
  if (callerErr || !caller.user) return json({ error: 'Sesión inválida.' }, 401)
  if ((caller.user.app_metadata as Record<string, unknown>)?.role !== 'admin') {
    return json({ error: 'No autorizado.' }, 403)
  }
  const actorId = caller.user.id

  let payload: { action?: string; [k: string]: unknown }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Body inválido.' }, 400)
  }
  const { action } = payload

  const audit = (a: string, targetUserId: string | null, detail: Record<string, unknown> = {}) =>
    admin.from('admin_audit').insert({ actor_id: actorId, action: a, target_user_id: targetUserId, detail })

  try {
    switch (action) {
      case 'list': {
        // listUsers pagina de a 50; para el volumen actual una página alcanza.
        const perPage = 1000
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage })
        if (error) throw error
        return json({
          users: data.users.map((u) => ({
            id: u.id,
            email: u.email ?? '',
            createdAt: u.created_at,
            lastSignInAt: u.last_sign_in_at ?? null,
            role: ((u.app_metadata as Record<string, unknown>)?.role as string) ?? 'user',
            banned: Boolean((u as unknown as { banned_until?: string }).banned_until),
          })),
        })
      }

      case 'setRole': {
        const userId = String(payload.userId)
        const role = String(payload.role)
        if (!['admin', 'coach', 'user'].includes(role)) return json({ error: 'Rol inválido.' }, 400)
        // 'user' se guarda como app_metadata sin `role` (el default).
        const app_metadata = role === 'user' ? { role: null } : { role }
        const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata })
        if (error) throw error
        await audit('setRole', userId, { role })
        return json({ ok: true })
      }

      case 'updateEmail': {
        const userId = String(payload.userId)
        const email = String(payload.email).toLowerCase().trim()
        const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true })
        if (error) throw error
        await audit('updateEmail', userId, { email })
        return json({ ok: true })
      }

      case 'sendPasswordReset': {
        const email = String(payload.email).toLowerCase().trim()
        // Método de cliente normal (no admin): dispara el email de recuperación
        // con la plantilla configurada. Se usa la anon key para esto.
        const anon = createClient(SUPABASE_URL, ANON_KEY)
        const { error } = await anon.auth.resetPasswordForEmail(email)
        if (error) throw error
        await audit('sendPasswordReset', null, { email })
        return json({ ok: true })
      }

      case 'setBanned': {
        const userId = String(payload.userId)
        const banned = Boolean(payload.banned)
        const { error } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: banned ? '876000h' : 'none', // ~100 años / levantar
        })
        if (error) throw error
        await audit('setBanned', userId, { banned })
        return json({ ok: true })
      }

      case 'createUser': {
        const email = String(payload.email).toLowerCase().trim()
        const password = String(payload.password)
        const role = payload.role ? String(payload.role) : null
        if (password.length < 8) return json({ error: 'La contraseña necesita 8+ caracteres.' }, 400)
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: role && role !== 'user' ? { role } : {},
        })
        if (error) throw error
        await audit('createUser', data.user?.id ?? null, { email, role })
        return json({ ok: true, userId: data.user?.id })
      }

      default:
        return json({ error: `Acción desconocida: ${action}` }, 400)
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error interno.' }, 500)
  }
})
