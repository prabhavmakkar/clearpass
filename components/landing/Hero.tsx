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

  function scrollToStory() {
    document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20 pt-24">
      <motion.div {...reveal}>
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-1.5 text-xs text-gray-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          Live now: AFM, FR &amp; Audit (CA Finals) — try one free chapter per subject
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
            href="/sign-in"
            className="rounded-lg bg-black px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
          >
            Get Started Free →
          </a>
          <a
            href="https://t.me/ClearpassCAbot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-500"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Practice on Telegram
          </a>
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
