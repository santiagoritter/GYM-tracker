// Supabase Edge Function: leave-coach
//
// Simétrica a become-coach: el usuario logueado deja el modo coach. Termina
// todos los vínculos activos con sus alumnos (quedan sin coach, no en un
// limbo) y vuelve el rol a `user`. No borra la ficha (`coaches`/
// `coach_identity`) — si vuelve a hacerse coach más adelante, no tiene que
// recargar el DNI de nuevo; el gate real de acceso es el rol, no esas filas.
//
// Un admin que llame a esto no pierde su rol: `admin` no es "modo coach",
// es acceso total — no tiene sentido degradarlo acá.
//
// Desplegar CON verificación de JWT:
//   supabase functions deploy leave-coach

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Falta el token de sesión.' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt)
  if (callerErr || !caller.user) return json({ error: 'Sesión inválida.' }, 401)
  const userId = caller.user.id
  const currentRole = (caller.user.app_metadata as Record<string, unknown>)?.role as string | undefined

  if (currentRole !== 'coach') {
    // No-op prolijo: admin no baja, y alguien que ya no es coach no tiene
    // nada que hacer acá — evita un 4xx confuso si el cliente llama dos
    // veces por una carrera de red.
    return json({ ok: true, role: currentRole ?? 'user' })
  }

  try {
    // 1. Termina todos los vínculos activos — un alumno no puede quedar
    //    "vinculado" a alguien que ya no puede coachearlo.
    const { error: bondsErr } = await admin
      .from('coach_clients')
      .update({ status: 'ended', ended_at: new Date().toISOString(), ended_by: userId })
      .eq('coach_id', userId)
      .eq('status', 'active')
    if (bondsErr) throw bondsErr

    // 2. Rol de vuelta a user.
    const { error: roleErr } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: 'user' },
    })
    if (roleErr) throw roleErr

    // Auditoría best-effort: si admin_audit no existe, no debe tumbar la baja.
    await admin
      .from('admin_audit')
      .insert({ actor_id: userId, action: 'self_leave_coach', target_user_id: userId, detail: {} })
      .then(() => {}, () => {})

    return json({ ok: true, role: 'user' })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error interno.' }, 500)
  }
})
