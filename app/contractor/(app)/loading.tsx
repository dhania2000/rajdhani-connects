import { LoadingSkeleton } from '@/components/contractor/shared/loading-skeleton'

export default function Loading() {
  return (
    <>
      <div className="h-[84px] bg-navy" />
      <LoadingSkeleton />
    </>
  )
}
