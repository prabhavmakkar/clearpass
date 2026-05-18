import type { Metadata } from 'next'
import { Instrument_Serif, Geist, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import { Providers } from '@/components/Providers'
import Footer from '@/components/landing/Footer'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument-serif',
})

const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-geist',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://clearpass.snpventures.in'),
  title: {
    default: 'ClearPass — CA Prep, Finally Done Right',
    template: '%s | ClearPass',
  },
  description: 'CA Final exam prep — 4,000+ ICAI-style MCQs across AFM, FR, Auditing & Ethics, and Indirect Tax Laws. Diagnostic assessments, adaptive practice, and readiness reports. Unlock the full bundle for ₹299.',
  keywords: ['CA Final exam preparation', 'CA Final AFM', 'CA Final FR', 'CA Final Audit', 'CA Final IDT', 'Chartered Accountancy MCQs', 'ICAI mock test', 'CA practice questions', 'Financial Reporting Ind AS', 'Advanced Financial Management', 'Indirect Tax Laws GST'],
  openGraph: {
    title: 'ClearPass — CA Final Prep with 4,000+ ICAI-style MCQs',
    description: 'AFM, FR, Auditing & Ethics, and IDT — all four CA Final subjects, ₹299 for the full bundle.',
    url: 'https://clearpass.snpventures.in',
    siteName: 'ClearPass',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClearPass — CA Final Prep, Finally Done Right',
    description: '4,000+ ICAI-style MCQs across AFM, FR, Audit, and IDT. ₹299 for the full bundle.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        <Providers>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
