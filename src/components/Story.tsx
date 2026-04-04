// src/components/Story.tsx
import { motion } from 'framer-motion'
import { useScrollReveal } from '../hooks/useScrollReveal'

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
    badgeStyle: 'bg-green-100 text-green-700',
    headline: 'The false confidence.',
    body: "Foundation felt manageable. The syllabus was close enough to Class 12 that hard work alone got me through. I thought the CA journey would be tough but fair. I was wrong.",
  },
  {
    stage: 'CA Intermediate',
    badge: '3 attempts',
    badgeStyle: 'bg-red-100 text-red-700',
    headline: "The wall I couldn't see past.",
    body: "Nothing had prepared me for this scale. The syllabus was vast, the subjects were deep, and for the first time I genuinely didn't know what I didn't know. I paid for coaching classes expecting guidance — I got lectures. No one sat down and told me where I was actually weak. Three attempts, three report cards I couldn't make sense of.",
  },
  {
    stage: 'CA Finals',
    badge: 'Cleared — 2nd attempt',
    badgeStyle: 'bg-black text-white',
    headline: 'The moment everything changed.',
    body: "Before my second attempt, I stopped studying everything and started diagnosing myself. I mapped my weak topics, scored them honestly, and built a plan around the gaps — not the syllabus order. For the first time, I knew exactly what to fix. I cleared. That system became ClearPass.",
  },
]

function TimelineItem({ stage, badge, badgeStyle, headline, body, delay }: TimelineEntry) {
  const reveal = useScrollReveal(delay)
  return (
    <motion.div {...reveal} className="mb-12 last:mb-0">
      <span className="absolute -left-[7px] mt-1.5 block h-3 w-3 rounded-full border-2 border-black bg-black" />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{stage}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${badgeStyle}`}>{badge}</span>
      </div>
      <h3 className="mb-2 text-xl font-bold tracking-tight">{headline}</h3>
      <p className="max-w-lg text-sm leading-relaxed text-gray-500">{body}</p>
    </motion.div>
  )
}

function ResolutionCard() {
  const reveal = useScrollReveal(0.1)
  return (
    <motion.div {...reveal} className="mt-16 rounded-2xl bg-black p-8 text-white">
      <h3 className="mb-3 text-xl font-bold leading-snug tracking-tight md:text-2xl">
        The CA pass rate is ~5%. That's not a talent problem. It's a preparation problem.
      </h3>
      <p className="text-sm leading-relaxed text-gray-300">
        Most students study hard. What they lack is a mirror — something that shows them exactly
        where they stand, and exactly what to do next. That's what ClearPass is.
      </p>
    </motion.div>
  )
}

export default function Story() {
  const introReveal = useScrollReveal()

  return (
    <section id="story" className="mx-auto max-w-5xl px-6 py-20">
      <p className="mb-12 text-xs font-semibold uppercase tracking-widest text-gray-400">
        The Story Behind ClearPass
      </p>
      <motion.p
        {...introReveal}
        className="mb-16 max-w-xl text-2xl font-bold leading-snug tracking-tight md:text-3xl"
      >
        I didn't build this for fun. I built it because the CA system kept failing me — and I had no idea why.
      </motion.p>
      <div className="relative border-l-2 border-gray-200 pl-8">
        {timelineItems.map((item, i) => (
          <TimelineItem key={item.stage} {...item} delay={i * 0.15} />
        ))}
      </div>
      <ResolutionCard />
    </section>
  )
}
