// Supabase Edge Function: become-coach
//
// Self-serve: el usuario logueado se convierte en coach desde Ajustes,
// cargando sus datos. El rol vive en `app_metadata` (firmado en el JWT) y
// solo se escribe con la service_role — por eso va acá, y la función
// resuelve la identidad del JWT del que llama (CLAUDE.md §5), nunca de un
// id en el body.
//
// El verificado amarillo NO se otorga acá: sigue siendo admin-only (trigger
// `coaches_guard_verified` en 0013). Hacerse coach es libre; el check lo da
// un administrador tras cotejar el DNI.
//
// Desplegar CON verificación de JWT:
//   supabase functions deploy become-coach

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

  let payload: { displayName?: string; dni?: string; bio?: string; experienceYears?: number | null }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Body inválido.' }, 400)
  }

  const displayName = (payload.displayName ?? '').trim()
  const dni = (payload.dni ?? '').replace(/\D/g, '')
  if (!displayName) return json({ error: 'Falta el nombre.' }, 400)
  if (dni.length < 7) return json({ error: 'DNI inválido.' }, 400)

  try {
    // 1. DNI único entre cuentas de coach.
    const { data: dupe } = await admin
      .from('coach_identity')
      .select('coach_id')
      .eq('dni', dni)
      .neq('coach_id', userId)
      .maybeSingle()
    if (dupe) return json({ error: 'Ese DNI ya está registrado en otra cuenta de coach.' }, 409)

    // 2. Rol: `coach`, salvo que ya sea `admin` (que no se degrada — un admin
    //    ya tiene acceso al área de coach).
    const nextRole = currentRole === 'admin' ? 'admin' : 'coach'
    const { error: roleErr } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: nextRole },
    })
    if (roleErr) throw roleErr

    // 3. Ficha + DNI.
    const { error: cErr } = await admin.from('coaches').upsert({
      id: userId,
      display_name: displayName,
      bio: (payload.bio ?? '').trim() || null,
      experience_years: payload.experienceYears ?? null,
    })
    if (cErr) throw cErr

    const { error: iErr } = await admin
      .from('coach_identity')
      .upsert({ coach_id: userId, dni }, { onConflict: 'coach_id' })
    if (iErr) throw iErr

    // Auditoría best-effort: si `admin_audit` (0011) todavía no existe, no
    // debe tumbar el alta.
    await admin
      .from('admin_audit')
      .insert({
        actor_id: userId,
        action: 'self_become_coach',
        target_user_id: userId,
        detail: { display_name: displayName },
      })
      .then(() => {}, () => {})

    return json({ ok: true, role: nextRole })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error interno.' }, 500)
  }
})
