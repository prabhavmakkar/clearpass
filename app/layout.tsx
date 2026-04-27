import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Providers } from '@/components/Providers'
import Footer from '@/components/landing/Footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://clearpass.snpventures.in'),
  title: {
    default: 'ClearPass — CA Prep, Finally Done Right',
    template: '%s | ClearPass',
  },
  description: 'Diagnostic assessments, adaptive practice, and readiness reports for Chartered Accountancy students. CA Inter Audit and CA Final Derivatives & Valuation — free to use.',
  keywords: ['CA exam preparation', 'Chartered Accountancy', 'CA Inter Audit', 'CA Final AFM', 'Derivatives and Valuation', 'MCQ practice', 'readiness report', 'ICAI'],
  openGraph: {
    title: 'ClearPass — CA Prep, Finally Done Right',
    description: 'Diagnostic assessments, adaptive practice, and readiness reports for Chartered Accountancy students.',
    url: 'https://clearpass.snpventures.in',
    siteName: 'ClearPass',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClearPass — CA Prep, Finally Done Right',
    description: 'Diagnostic assessments, adaptive practice, and readiness reports for CA students.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
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
