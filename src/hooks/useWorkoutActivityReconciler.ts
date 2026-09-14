import { useEffect } from 'react'
import { workoutsFor } from '@/db/scoped'
import { endWorkoutActivity } from '@/lib/liveActivity'
import { useCurrentUserId } from '@/hooks/useCurrentUserId'

/**
 * Al arrancar la app (cold start o webview reciclada por iOS) hay que
 * decidir qué hacer con la Live Activity del entreno: si el usuario tenía
 * uno genuinamente en curso, la Live Activity del sistema siguió viva sola
 * durante todo ese tiempo (ActivityKit no depende de que el proceso de la
 * app esté corriendo) — no hay que tocarla. Si no hay ningún entreno sin
 * terminar, cualquier Live Activity que haya quedado es huérfana (se cerró
 * la app entre "Finalizar" y que corriera la limpieza normal de
 * `Workout.tsx`) y ahí sí se cierra.
 *
 * Antes esto lo hacía `main.tsx` llamando `endWorkoutActivity()` sin
 * condición — mataba la Live Activity de cualquier entreno real que
 * siguiera activo apenas la webview se recicla (una sesión larga, de
 * varias horas, es tiempo de sobra para que iOS lo haga). Se movió acá,
 * con el mismo query que ya usa `Home.tsx` para el banner "Entreno en
 * curso" — dos lugares, un solo criterio de "hay un entreno activo".
 *
 * Se monta una vez en `Layout.tsx`/`LayoutDesktop.tsx` (ambos siempre
 * activos mientras haya sesión) y corre una sola vez por usuario conocido,
 * no en cada navegación.
 */
export function useWorkoutActivityReconciler(): void {
  const userId = useCurrentUserId()

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    workoutsFor(userId)
      .filter((w) => !w.finishedAt)
      .first()
      .then((active) => {
        if (!cancelled && !active) endWorkoutActivity()
      })
      .catch(() => {
        // Best-effort: si la consulta falla, no tocar nada — mejor una
        // Live Activity de más que cortar una que sigue siendo real.
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
}
