import { ImageResponse } from 'next/og'

// Generated apple-touch-icon (180×180) — the ClearPass mark (ink ring + accent
// core) on paper, matching the in-app logo. Used for iOS home-screen bookmarks.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF8F2',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 120,
            height: 120,
            borderRadius: 999,
            background: '#0A0A0A',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', width: 60, height: 60, borderRadius: 999, background: '#D9501E' }} />
        </div>
      </div>
    ),
    { ...size },
  )
}
