import { Skeleton } from '@/components/ui/skeleton'

export default function AdminPanelLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48 bg-border/70" />
        <Skeleton className="h-4 w-80 max-w-full bg-border/60" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex h-[124px] flex-col justify-between rounded-[14px] border border-border bg-white p-5">
            <Skeleton className="h-4 w-28 bg-app-bg" />
            <Skeleton className="h-7 w-20 bg-app-bg" />
          </div>
        ))}
      </div>
      <div className="rounded-[14px] border border-border bg-white p-5">
        <Skeleton className="mb-5 h-5 w-40 bg-app-bg" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-app-bg" />
          ))}
        </div>
      </div>
    </div>
  )
}
