export function GiftBoxIcon({ className = 'size-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 18c-4-9-15-11-16-4-1 5 8 6 16 4Z" fill="#f7b500" />
      <path d="M32 18c4-9 15-11 16-4 1 5-8 6-16 4Z" fill="#f59e0b" />
      <rect x="10" y="30" width="44" height="28" rx="3" fill="#e11d48" />
      <rect x="10" y="30" width="44" height="6" fill="#be123c" />
      <rect x="7" y="19" width="50" height="12" rx="3" fill="#f43f5e" />
      <rect x="28" y="19" width="8" height="39" fill="#fbbf24" />
      <rect x="28" y="30" width="8" height="6" fill="#f59e0b" />
    </svg>
  )
}
