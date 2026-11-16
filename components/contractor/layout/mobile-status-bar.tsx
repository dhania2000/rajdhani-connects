import { BatteryFull, SignalHigh, Wifi } from 'lucide-react'

export function MobileStatusBar() {
  return (
    <div
      className="flex h-7 items-center justify-between px-5 pt-[env(safe-area-inset-top)] text-[13px] font-semibold text-white"
      aria-hidden="true"
    >
      <span>10:24</span>
      <div className="flex items-center gap-1">
        <Wifi className="size-3.5" strokeWidth={2.5} />
        <SignalHigh className="size-3.5" strokeWidth={2.5} />
        <BatteryFull className="size-4" strokeWidth={2} />
      </div>
    </div>
  )
}
