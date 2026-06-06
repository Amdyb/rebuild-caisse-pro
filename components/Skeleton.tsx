export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-8 w-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-200 dark:bg-slate-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-6 w-16 rounded-xl bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="mb-3 h-32 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-8 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse -mx-5 -mt-8 h-40 bg-slate-200 dark:bg-slate-700" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  )
}
