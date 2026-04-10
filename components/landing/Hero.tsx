'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const stats = [
  { value: '~5%', label: 'CA Finals pass rate' },
  { value: '6+', label: 'Avg. attempts across levels' },
  { value: '0', label: 'Tools that tell you why you failed' },
]

export default function Hero() {
  const reveal = useScrollReveal()

  function scrollToWaitlist() {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  function scrollToStory() {
    document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20 pt-24">
      <motion.div {...reveal}>
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-1.5 text-xs text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Now accepting early access signups
        </div>
        <h1 className="mb-6 text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
          CA prep, finally{' '}
          <span className="border-b-4 border-black">done right.</span>
        </h1>
        <p className="mb-10 max-w-xl text-lg leading-relaxed text-gray-500 md:text-xl">
          The CA journey is brutal — but failing because you didn't know where you were weak?
          That's a problem we can fix.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="/select"
            className="rounded-lg bg-black px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
          >
            Take Free Diagnostic Test →
          </a>
          <button
            onClick={scrollToWaitlist}
            className="rounded-lg border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-500"
          >
            Join the Waitlist
          </button>
          <button
            onClick={scrollToStory}
            className="text-sm text-gray-500 underline underline-offset-4 transition-colors hover:text-black"
          >
            See how it works ↓
          </button>
        </div>
        <div className="mt-14 flex flex-col gap-6 border-t border-gray-100 pt-8 sm:flex-row sm:gap-16">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold tracking-tight">{s.value}</div>
              <div className="mt-1 text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
