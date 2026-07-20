import { cn } from '@/lib/utils'

/** Bloque de carga con shimmer. Componer para armar placeholders. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />
}

/** Placeholder de una tarjeta de entreno (usado en Home mientras carga). */
export function WorkoutCardSkeleton() {
  return (
    <div className="rounded-xl bg-surface p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-2.5 h-3 w-40" />
    </div>
  )
}
