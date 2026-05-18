'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

// Despite the legacy filename, this is the editorial "Final CTA" block.
// Keeping the file path so /app/page.tsx imports don't break elsewhere.
export default function FinalCTA() {
  const reveal = useScrollReveal()

  return (
    <section className="mx-auto max-w-6xl px-6 pb-28 pt-20">
      <motion.div
        {...reveal}
        className="rounded-3xl p-10 md:p-14 text-center relative overflow-hidden"
        style={{ background: 'var(--color-ink)', color: 'white' }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(217,80,30,0.5), transparent 50%), radial-gradient(circle at 80% 80%, rgba(15,27,61,0.6), transparent 50%)',
          }}
        />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.18em] opacity-60 mb-4">Stop guessing</div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.95] max-w-3xl mx-auto">
            Find out where you actually stand.<br />
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>In fifteen minutes.</em>
          </h2>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/sign-in"
              className="px-7 py-4 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ background: 'white', color: 'var(--color-ink)' }}
            >
              Take your first test — free →
            </a>
            <a
              href="https://t.me/ClearpassCAbot"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-4 rounded-xl border font-semibold text-sm hover:bg-white/5 transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.2)' }}
            >
              Open Telegram bot
            </a>
          </div>
          <p className="mt-6 text-xs opacity-60">
            First diagnostic test is free. ₹299 unlocks the full library — only when you&apos;re ready.
          </p>
        </div>
      </motion.div>
    </section>
  )
}
