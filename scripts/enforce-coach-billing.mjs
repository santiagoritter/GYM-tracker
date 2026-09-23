#!/usr/bin/env node
/**
 * Se corre A MANO, una sola vez, justo después de prender
 * `app_config.coach_billing_required` (UPDATE directo en el SQL Editor).
 * Baja a `user` a todo coach sin una suscripción 'coach' vigente:
 *  1. Llama a la RPC `enforce_coach_billing()` (0024_billing_config.sql),
 *     que ya terminó los vínculos con sus alumnos y devuelve a quién bajarle
 *     el rol.
 *  2. Por cada uno, `admin.auth.admin.updateUserById(id, { app_metadata:
 *     { role: 'user' } })` — eso no se puede hacer por SQL directo, hace
 *     falta el SDK con la service_role.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/enforce-coach-billing.mjs
 *
 * Sin --confirm, solo lista a quién bajaría (dry run) — no toca nada.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CONFIRM = process.argv.includes('--confirm')

if (!URL || !KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const admin = createClient(URL, KEY)

const { data: rows, error } = await admin.rpc('enforce_coach_billing')
if (error) {
  console.error('No se pudo correr enforce_coach_billing():', error.message)
  process.exit(1)
}

const ids = (rows ?? []).map((r) => r.downgraded_user_id)
if (ids.length === 0) {
  console.log('✅ Nadie para bajar — todos los coach tienen suscripción vigente (o no hay coaches).')
  process.exit(0)
}

console.log(`${ids.length} coach(es) sin suscripción vigente (vínculos ya terminados por la RPC):`)
ids.forEach((id) => console.log(`  - ${id}`))

if (!CONFIRM) {
  console.log('\nDry run — corré de nuevo con --confirm para bajarles el rol a "user".')
  process.exit(0)
}

for (const id of ids) {
  const { error: roleErr } = await admin.auth.admin.updateUserById(id, {
    app_metadata: { role: 'user' },
  })
  if (roleErr) console.error(`  ❌ ${id}: ${roleErr.message}`)
  else console.log(`  ✅ ${id} → role: user`)
}
