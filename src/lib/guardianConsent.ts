import { supabase } from '@/lib/supabaseClient'
import { publicLink } from '@/lib/publicUrl'
import { classifyAcceptError, COACH_NOT_VERIFIED, GUARDIAN_REQUIRED, guardianWhatsappUrl, type AcceptBlock } from '@/lib/guardianCore'

export { classifyAcceptError, COACH_NOT_VERIFIED, GUARDIAN_REQUIRED, guardianWhatsappUrl }
export type { AcceptBlock }

/**
 * Consentimiento de madre/padre/tutor para que un menor se vincule con un
 * coach (migración 0028). El menor genera un enlace y se lo manda al tutor; el
 * tutor lo abre sin cuenta y confirma. Acá vive todo lo que habla con esas RPC.
 */

export function guardianLink(token: string): string {
  return publicLink(`tutor/${token}`)
}

export async function requestGuardianConsent(inviteCode: string): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.rpc('request_guardian_consent', { invite_code: inviteCode })
  if (error) throw new Error(error.message)
  return data as string
}

export interface GuardianInfo {
  coachName: string
  clientName: string
  confirmed: boolean
  expired: boolean
}

/** Sin sesión: el tutor no tiene cuenta. `null` si el enlace no existe. */
export async function fetchGuardianInfo(token: string): Promise<GuardianInfo | null> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.rpc('guardian_consent_info', { token })
  if (error) throw new Error(error.message)
  const row = (data as Record<string, unknown>[] | null)?.[0]
  if (!row) return null
  return {
    coachName: (row.coach_name as string) ?? '',
    clientName: (row.client_name as string) ?? '',
    confirmed: row.confirmed === true,
    expired: row.expired === true,
  }
}

export async function confirmGuardian(token: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.rpc('confirm_guardian_consent', { token })
  if (error) throw new Error(error.message)
}
