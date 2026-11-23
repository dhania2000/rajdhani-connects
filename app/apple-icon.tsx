import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** Home-screen icon: the Rajdhani Connects diamond mark on the brand navy. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#171c49' }}>
        <svg width="132" height="132" viewBox="0 0 40 40">
          <path d="M20 3 L37 20 L20 20 Z" fill="#ffffff" />
          <path d="M37 20 L20 37 L20 20 Z" fill="#ffffff" fillOpacity="0.7" />
          <path d="M20 37 L3 20 L20 20 Z" fill="#ffffff" />
          <path d="M3 20 L20 3 L20 20 Z" fill="#ffffff" fillOpacity="0.55" />
          <path d="M20 11 L29 20 L20 29 L11 20 Z" fill="#171c49" />
          <path d="M20 15 L25 20 L20 25 L15 20 Z" fill="#ffffff" fillOpacity="0.85" />
        </svg>
      </div>
    ),
    size,
  )
}
