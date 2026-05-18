'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

interface TimelineEntry {
  stage: string
  badge: string
  badgeStyle: string
  headline: string
  body: string
  delay: number
}

const timelineItems: Omit<TimelineEntry, 'delay'>[] = [
  {
    stage: 'CA Foundation',
    badge: 'Cleared — 1st attempt',
    badgeStyle: 'bg-[var(--color-success-soft)] text-[#0E5A3D]',
    headline: 'The false confidence.',
    body: "Foundation felt manageable. The syllabus was close enough to Class 12 that hard work alone got me through. I thought the CA journey would be tough but fair. I was wrong.",
  },
  {
    stage: 'CA Intermediate',
    badge: '3 attempts',
    badgeStyle: 'bg-[var(--color-error-soft)] text-[#7A1F1F]',
    headline: "The wall I couldn't see past.",
    body: "Nothing had prepared me for this scale. The syllabus was vast, the subjects were deep, and for the first time I genuinely didn't know what I didn't know. I paid for coaching classes expecting guidance — I got lectures. No one sat down and told me where I was actually weak. Three attempts, three report cards I couldn't make sense of.",
  },
  {
    stage: 'CA Finals',
    badge: 'Cleared — 2nd attempt',
    badgeStyle: 'text-white',
    headline: 'The moment everything changed.',
    body: "Before my second attempt, I stopped studying everything and started diagnosing myself. I mapped my weak topics, scored them honestly, and built a plan around the gaps — not the syllabus order. For the first time, I knew exactly what to fix. I cleared. That system became ClearPass.",
  },
]

function TimelineItem({ stage, badge, badgeStyle, headline, body, delay }: TimelineEntry) {
  const reveal = useScrollReveal(delay)
  const isFinal = stage === 'CA Finals'
  return (
    <motion.div {...reveal} className="relative mb-14 last:mb-0">
      <span
        className="absolute -left-[31px] mt-1.5 block h-3 w-3 rounded-full border-2"
        style={{
          borderColor: 'var(--color-ink)',
          background: isFinal ? 'var(--color-accent)' : 'var(--color-ink)',
        }}
      />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          {stage}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
          style={isFinal ? { background: 'var(--color-ink)' } : undefined}
        >
          {badge}
        </span>
      </div>
      <h3 className="mb-3 font-display text-3xl leading-tight">{headline}</h3>
      <p className="max-w-xl text-[15px] leading-[1.75] text-[var(--color-ink-soft)]">{body}</p>
    </motion.div>
  )
}

function ResolutionCard() {
  const reveal = useScrollReveal(0.1)
  return (
    <motion.div
      {...reveal}
      className="mt-16 rounded-3xl p-10 md:p-12 relative overflow-hidden"
      style={{ background: 'var(--color-ink)', color: 'white' }}
    >
      <div
        className="absolute -top-24 -right-24 h-72 w-72 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(217,80,30,0.25), transparent 65%)' }}
      />
      <div className="relative">
        <h3 className="mb-4 font-display text-3xl md:text-4xl leading-tight max-w-2xl">
          The CA pass rate is ~5%. That&apos;s not a talent problem.{' '}
          <em className="not-italic" style={{ color: 'var(--color-accent)' }}>It&apos;s a preparation problem.</em>
        </h3>
        <p className="max-w-xl text-[15px] leading-[1.75] text-white/75">
          Most students study hard. What they lack is a mirror — something that shows them exactly
          where they stand, and exactly what to do next. That&apos;s what ClearPass is.
        </p>
      </div>
    </motion.div>
  )
}

export default function Story() {
  const introReveal = useScrollReveal()

  return (
    <section id="story" className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
      <p className="eyebrow mb-5">The story behind ClearPass</p>
      <motion.p
        {...introReveal}
        className="mb-16 max-w-2xl font-display text-4xl md:text-5xl leading-[1.05]"
      >
        I didn&apos;t build this for fun. I built it because the CA system kept failing me —{' '}
        <em className="not-italic text-[var(--color-muted)]">and I had no idea why.</em>
      </motion.p>
      <div className="relative border-l-2 pl-10" style={{ borderColor: 'var(--color-line)' }}>
        {timelineItems.map((item, i) => (
          <TimelineItem key={item.stage} {...item} delay={i * 0.15} />
        ))}
      </div>
      <ResolutionCard />
    </section>
  )
}
