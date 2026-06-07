import type { MetadataRoute } from 'next'

// Web app manifest — installability + mobile metadata signals.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ClearPass — CA Final Prep',
    short_name: 'ClearPass',
    description:
      'CA Final exam prep — ICAI-style MCQs, diagnostic assessments, adaptive practice, and readiness reports for AFM, FR, Audit, and IDT.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8F2',
    theme_color: '#FAF8F2',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
