export function BrandLogo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M20 3 L37 20 L20 20 Z" fill="#ffffff" />
      <path d="M37 20 L20 37 L20 20 Z" fill="#ffffff" fillOpacity="0.7" />
      <path d="M20 37 L3 20 L20 20 Z" fill="#ffffff" />
      <path d="M3 20 L20 3 L20 20 Z" fill="#ffffff" fillOpacity="0.55" />
      <path d="M20 11 L29 20 L20 29 L11 20 Z" fill="#171c49" />
      <path d="M20 15 L25 20 L20 25 L15 20 Z" fill="#ffffff" fillOpacity="0.85" />
    </svg>
  )
}
