export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4" role="status" aria-label="Loading">
      <div className="h-24 animate-pulse rounded-xl bg-[#e8eaf2]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-[#e8eaf2]" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
