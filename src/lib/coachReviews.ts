import { supabase } from '@/lib/supabaseClient'

/**
 * Reseñas de alumnos a un coach. Una por alumno por coach
 * (`unique(coach_id, client_id)` en 0013). Puede reseñar cualquiera que
 * tenga o haya tenido vínculo (`has_bonded_with`). El promedio se calcula
 * en el cliente — volumen chico.
 */

export interface CoachReview {
  id: string
  clientId: string
  rating: number
  comment: string | null
  createdAt: string
}

export interface CoachRatingSummary {
  average: number | null
  count: number
  reviews: CoachReview[]
}

export async function fetchCoachReviews(coachId: string): Promise<CoachRatingSummary> {
  if (!supabase) return { average: null, count: 0, reviews: [] }
  const { data, error } = await supabase
    .from('coach_reviews')
    .select('id, client_id, rating, comment, created_at')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const reviews: CoachReview[] = (data ?? []).map((r) => ({
    id: r.id,
    clientId: r.client_id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }))
  const count = reviews.length
  const average = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : null
  return { average, count, reviews }
}

export async function fetchMyReviewFor(coachId: string, userId: string): Promise<CoachReview | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('coach_reviews')
    .select('id, client_id, rating, comment, created_at')
    .eq('coach_id', coachId)
    .eq('client_id', userId)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    clientId: data.client_id,
    rating: data.rating,
    comment: data.comment,
    createdAt: data.created_at,
  }
}

export async function submitReview(
  coachId: string,
  input: { rating: number; comment: string }
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: session } = await supabase.auth.getUser()
  const clientId = session.user?.id
  if (!clientId) throw new Error('Sin sesión.')
  const { error } = await supabase.from('coach_reviews').upsert(
    {
      coach_id: coachId,
      client_id: clientId,
      rating: input.rating,
      comment: input.comment.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'coach_id,client_id' }
  )
  if (error) throw error
}
