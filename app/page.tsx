import Nav from '@/components/landing/Nav'
import Hero from '@/components/landing/Hero'
import LiveTicker from '@/components/landing/LiveTicker'
import Story from '@/components/landing/Story'
import Features from '@/components/landing/Features'
import Comparison from '@/components/landing/Comparison'
import Pricing from '@/components/landing/Pricing'
import Testimonials from '@/components/landing/Testimonials'
import FAQ from '@/components/landing/FAQ'
import FinalCTA from '@/components/landing/Waitlist'
import { StructuredData } from '@/components/landing/StructuredData'
import type { Metadata } from 'next'

// Self-referencing canonical for the homepage (title/description inherit the
// root layout defaults, which are already tuned for the home page).
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <Nav />
      <Hero />
      <LiveTicker />
      <Story />
      <Features />
      <Comparison />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </>
  )
}
