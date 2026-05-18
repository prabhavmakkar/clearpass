'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

interface Feature {
  num: string
  title: string
  description: string
  tag: string
  time: string
  delay: number
  href?: string
}

const features: Omit<Feature, 'delay'>[] = [
  {
    num: '01',
    title: 'Pick your weak spots',
    description:
      'Browse subjects, drill into sections, tick the chapters you\'re worried about. Or hit Smart Mode and we\'ll pick them for you from your history.',
    tag: 'Skill-gap diagnostic',
    time: '~30 seconds',
    href: '/select',
  },
  {
    num: '02',
    title: 'Take a 20-Q test',
    description:
      'Real ICAI-pattern MCQs across the chapters you picked, weighted by official exam mark allocation. Question palette, timer, flag-for-review — everything an exam centre has.',
    tag: 'Adaptive · web + Telegram',
    time: '~12 minutes',
    href: '/select',
  },
  {
    num: '03',
    title: 'Get a readiness report',
    description:
      'Section-by-section scores, mastery radar, the weakest chapters named, and a 7-day study plan you can actually follow. Saved to your profile so you can compare next time.',
    tag: 'AI mentor study plan',
    time: 'Instant',
    href: 'https://t.me/ClearpassCAbot',
  },
]

function FeatureCard({ num, title, description, tag, time, delay, href }: Feature) {
  const reveal = useScrollReveal(delay)
  const inner = (
    <div className="card p-7 h-full transition-colors hover:border-[#C7C0AF]">
      <div className="font-mono text-xs text-[var(--color-muted)] mb-4">{num}</div>
      <h3 className="font-display text-2xl mb-3">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--color-ink-soft)] mb-5">{description}</p>
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-line-soft)]">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-semibold">
          {tag}
        </span>
        <span className="text-[11px] font-mono flex items-center gap-1.5 text-[var(--color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
          {time}
        </span>
      </div>
    </div>
  )
  return (
    <motion.div {...reveal}>
      {href ? (
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="block h-full"
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </motion.div>
  )
}

export default function Features() {
  const headingReveal = useScrollReveal()

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <motion.div {...headingReveal} className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">How it works</p>
          <h2 className="font-display text-4xl md:text-5xl leading-tight">
            Three steps. Fifteen minutes.
          </h2>
        </div>
        <p className="max-w-sm text-sm text-[var(--color-muted)]">
          No subscription. No fluff. Just answer twenty questions and let the report show you where to look next.
        </p>
      </motion.div>
      <div className="grid md:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <FeatureCard key={f.num} {...f} delay={i * 0.08} />
        ))}
      </div>
    </section>
  )
}
