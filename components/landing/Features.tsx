'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

interface Feature {
  num: string
  title: string
  description: string
  tag: string
  delay: number
}

const features: Omit<Feature, 'delay'>[] = [
  {
    num: '01',
    title: 'Readiness Report',
    description: 'Take a diagnostic MCQ test and receive a detailed preparation report — topic by topic. Know exactly where you stand before you waste another month studying the wrong things.',
    tag: 'SKILL GAP ANALYSIS',
  },
  {
    num: '02',
    title: 'AI Study Plan',
    description: 'Based on your readiness report, ClearPass generates a personalised study plan that prioritises your real weak spots. Not a generic schedule — a plan built around your gaps.',
    tag: 'AI-POWERED',
  },
  {
    num: '03',
    title: 'Adaptive MCQ Practice',
    description: 'Topic-by-topic adaptive practice that adjusts to your level in real time. Pick your subject, section, and chapter — then practice at your own pace.',
    tag: 'WEB + TELEGRAM',
  },
  {
    num: '04',
    title: 'Practice on Telegram',
    description: 'Don\'t want to open a browser? Practice MCQs directly in Telegram. Pick your topic, answer questions, get instant feedback — all from your phone.',
    tag: 'TELEGRAM BOT',
  },
]

interface FeatureItemProps extends Feature {
  href?: string
}

function FeatureItem({ num, title, description, tag, delay, href }: FeatureItemProps) {
  const reveal = useScrollReveal(delay)
  const inner = (
    <>
      <span className="pt-1 text-sm font-bold text-gray-200">{num}</span>
      <div>
        <h3 className="mb-2 text-lg font-bold tracking-tight">
          {title}
          {href && <span className="ml-2 text-sm font-normal text-gray-400">→</span>}
        </h3>
        <p className="mb-3 text-sm leading-relaxed text-gray-500">{description}</p>
        <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {tag}
        </span>
      </div>
    </>
  )

  return (
    <motion.div {...reveal} className="border-t border-gray-100">
      {href ? (
        <a
          href={href}
          className="grid grid-cols-[40px_1fr] gap-6 py-8 -mx-4 px-4 rounded-xl transition-colors hover:bg-gray-50 cursor-pointer block"
        >
          {inner}
        </a>
      ) : (
        <div className="grid grid-cols-[40px_1fr] gap-6 py-8">
          {inner}
        </div>
      )}
    </motion.div>
  )
}

export default function Features() {
  const headingReveal = useScrollReveal()

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <motion.div {...headingReveal} className="mb-12">
        <h2 className="mb-3 text-4xl font-black tracking-tight md:text-5xl">
          Three tools. One clear outcome.
        </h2>
        <p className="text-lg text-gray-500">Built for students who are done guessing.</p>
      </motion.div>
      <div>
        {features.map((f, i) => (
          <FeatureItem
            key={f.num}
            {...f}
            delay={i * 0.1}
            href={f.num === '01' || f.num === '03' ? '/select' : f.num === '04' ? 'https://t.me/ClearPassBot' : undefined}
          />
        ))}
      </div>
    </section>
  )
}
