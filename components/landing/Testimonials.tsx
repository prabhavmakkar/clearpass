'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

// Placeholder testimonials. Swap with real quotes when you have them.
const QUOTES = [
  {
    quote:
      "I'd written FR twice. ClearPass told me I was leaking 18% just on Ind AS 115. I focused on it for 4 days. Cleared with 62.",
    name: 'Aanya M.',
    meta: 'CA Finals · 3rd attempt',
    accent: 'var(--color-navy)',
  },
  {
    quote:
      'The Telegram bot is the entire app for me. 20 questions on the train, every day. My streak hit 47 days before I stopped counting.',
    name: 'Rohan K.',
    meta: 'CA Finals · 1st attempt',
    accent: 'var(--color-accent)',
  },
  {
    quote:
      'Honestly, ₹299 felt suspicious. Then I realised the AI study plan replaced what my coaching never gave me. Worth it.',
    name: 'Devanshi P.',
    meta: 'CA Inter Audit · cleared',
    accent: 'var(--color-success)',
  },
]

function QuoteCard({ idx, quote, name, meta, accent }: { idx: number; quote: string; name: string; meta: string; accent: string }) {
  const reveal = useScrollReveal(idx * 0.08)
  return (
    <motion.div {...reveal} className="card p-6 h-full">
      <p className="font-display text-lg leading-snug">&ldquo;{quote}&rdquo;</p>
      <div className="mt-5 flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
          style={{ background: accent }}
        >
          {name[0]}
        </div>
        <div>
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-[11px] text-[var(--color-muted)]">{meta}</div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Testimonials() {
  const reveal = useScrollReveal()
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <motion.div {...reveal} className="mb-10">
        <p className="eyebrow mb-2">From the trenches</p>
        <h2 className="font-display text-4xl md:text-5xl leading-tight">Students who stopped guessing.</h2>
      </motion.div>
      <div className="grid md:grid-cols-3 gap-4">
        {QUOTES.map((q, i) => (
          <QuoteCard key={q.name} idx={i} {...q} />
        ))}
      </div>
    </section>
  )
}
