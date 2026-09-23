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

  let payload: {
    displayName?: string
    dni?: string
    bio?: string
    experienceYears?: number | null
    specialties?: unknown
    location?: string
    certifications?: string
    coachTermsVersion?: number
  }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Body inválido.' }, 400)
  }

  const displayName = (payload.displayName ?? '').trim().slice(0, 80)
  const dni = (payload.dni ?? '').replace(/\D/g, '')
  const bio = (payload.bio ?? '').trim().slice(0, 600) || null
  const experienceYears =
    typeof payload.experienceYears === 'number' &&
    Number.isFinite(payload.experienceYears) &&
    payload.experienceYears >= 0 &&
    payload.experienceYears <= 80
      ? Math.round(payload.experienceYears)
      : null
  const location = (payload.location ?? '').trim().slice(0, 80) || null
  const certifications = (payload.certifications ?? '').trim().slice(0, 400) || null
  const specialties = Array.isArray(payload.specialties)
    ? [...new Set(payload.specialties.filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, 30)).filter(Boolean))].slice(0, 6)
    : []
  // Los términos de coach hay que aceptarlos para activar el modo (el cliente
  // manda la versión que vio; la función solo exige que sea una versión válida).
  const termsVersion = Number.isInteger(payload.coachTermsVersion) ? (payload.coachTermsVersion as number) : 0
  if (termsVersion < 1) return json({ error: 'Tenés que aceptar los términos para coaches.' }, 400)
  if (!displayName) return json({ error: 'Falta el nombre.' }, 400)
  if (dni.length < 7 || dni.length > 9) return json({ error: 'DNI inválido.' }, 400)

  try {
    // Antes leía un secret de Edge Function (REQUIRE_COACH_SUBSCRIPTION) que
    // nadie sincronizaba con lo que el CLIENTE mostraba (que decidía según
    // la plataforma, no según si de verdad se cobraba) — con el secret
    // apagado (su default), cualquiera se daba de alta gratis. Ahora hay una
    // sola fuente de verdad en la base, que también lee el cliente
    // (`app_config`, ver 0024_billing_config.sql / appConfigStore.ts).
    const { data: config } = await admin
      .from('app_config')
      .select('coach_billing_required')
      .eq('id', true)
      .maybeSingle()
    if (config?.coach_billing_required && currentRole !== 'admin') {
      const { data: sub } = await admin
        .from('subscriptions')
        .select('status, expires_at')
        .eq('user_id', userId)
        .eq('entitlement', 'coach')
        .maybeSingle()
      const valid =
        sub?.status === 'active' && (!sub.expires_at || new Date(sub.expires_at).getTime() > Date.now())
      if (!valid) return json({ error: 'Necesitás una suscripción de coach activa.' }, 402)
    }

    // 1. DNI único entre cuentas de coach.
    const { data: dupe } = await admin
      .from('coach_identity')
      .select('coach_id')
      .eq('dni', dni)
      .neq('coach_id', userId)
      .maybeSingle()
    if (dupe) return json({ error: 'Ese DNI ya está registrado en otra cuenta de coach.' }, 409)

    // 2. Ficha + DNI. Si ya había una ficha verificada y cambió lo que el
    //    admin cotejó (nombre/bio/DNI), vuelve a "pendiente": este camino usa
    //    la service_role y por eso esquiva el trigger `coaches_guard_verified`
    //    (que solo frena al rol `authenticated`), así que se resuelve acá.
    const { data: prev } = await admin
      .from('coaches')
      .select('display_name, bio, verified')
      .eq('id', userId)
      .maybeSingle()
    const { data: prevIdentity } = await admin
      .from('coach_identity')
      .select('dni')
      .eq('coach_id', userId)
      .maybeSingle()
    const changed =
      !!prev &&
      (prev.display_name !== displayName || (prev.bio ?? null) !== bio || prevIdentity?.dni !== dni)

    const { error: cErr } = await admin.from('coaches').upsert({
      id: userId,
      display_name: displayName,
      bio,
      experience_years: experienceYears,
      specialties,
      location,
      certifications,
      terms_version: termsVersion,
      terms_accepted_at: new Date().toISOString(),
      ...(changed ? { verified: false, verified_at: null } : {}),
    })
    if (cErr) throw cErr

    const { error: iErr } = await admin
      .from('coach_identity')
      .upsert({ coach_id: userId, dni }, { onConflict: 'coach_id' })
    if (iErr) {
      // Carrera con otro alta del mismo DNI: el índice único gana.
      if ((iErr as { code?: string }).code === '23505') {
        return json({ error: 'Ese DNI ya está registrado en otra cuenta de coach.' }, 409)
      }
      throw iErr
    }

    // 3. Rol (al final, cuando ficha y DNI ya quedaron guardados — si el DNI chocaba
    //    con otra alta simultánea no queda una cuenta con rol coach sin identidad):
    //    `coach`, salvo que ya sea `admin` (que no se degrada — un admin
    //    ya tiene acceso al área de coach).
    const nextRole = currentRole === 'admin' ? 'admin' : 'coach'
    const { error: roleErr } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: nextRole },
    })
    if (roleErr) throw roleErr

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
