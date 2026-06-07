import { ImageResponse } from 'next/og'

// Site-wide default social share image (1200×630). Placing this at the app root
// auto-wires og:image AND twitter:image for every route that doesn't override it,
// so links shared on Telegram/WhatsApp/X render a branded preview card.
export const alt = 'ClearPass — CA Final prep with 4,000+ ICAI-style MCQs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #0F1B3D 0%, #0A0A0A 100%)',
          color: '#FAF8F2',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', width: 40, height: 40, borderRadius: 999, background: '#D9501E' }} />
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>ClearPass</div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 78, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 940 }}>
            CA Final prep, finally done right.
          </div>
          <div style={{ display: 'flex', fontSize: 34, color: '#C9C4BA' }}>
            4,000+ ICAI-style MCQs · AFM · FR · Audit · IDT
          </div>
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#D9501E',
              color: '#FFFFFF',
              fontSize: 30,
              fontWeight: 700,
              padding: '14px 28px',
              borderRadius: 999,
            }}
          >
            Rs 299 for the full bundle
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#8B8276' }}>clearpass.snpventures.in</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
