function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--cp-surface-2)] ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="cp-card">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Pulse className="h-3 w-28" />
          <Pulse className="h-8 w-32" />
        </div>
        <Pulse className="h-8 w-8" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-surface)] p-4">
      <Pulse className="h-12 w-12 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-4 w-1/3" />
        <Pulse className="h-3 w-1/2" />
      </div>
      <Pulse className="h-6 w-16" />
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-surface)] p-4">
          <Pulse className="mb-3 h-32 w-full rounded-xl" />
          <Pulse className="h-4 w-2/3" />
          <Pulse className="mt-2 h-3 w-1/2" />
          <Pulse className="mt-3 h-8 w-full" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <Pulse className="-mx-5 -mt-8 h-40 rounded-none" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  )
}
