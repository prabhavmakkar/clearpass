'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const FEATURES = [
  'Unlimited 20-Q readiness assessments',
  'Adaptive practice with instant explanations',
  'AI-written 7-day study plans, per attempt',
  'Telegram bot — practice between metro stops',
  'Mastery tracking + progress radar',
  'New questions added monthly (no extra cost)',
]

export default function Pricing() {
  const reveal = useScrollReveal()
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <motion.div {...reveal} className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
        <div>
          <p className="eyebrow mb-3">One bundle</p>
          <h2 className="font-display text-5xl md:text-6xl leading-[1.0]">
            Pay once.<br />
            Pass the{' '}
            <em className="not-italic relative inline-block">
              finals
              <span
                className="absolute left-0 right-0 -bottom-1 h-1.5"
                style={{ background: 'var(--color-accent)', opacity: 0.8 }}
              />
            </em>
            .
          </h2>
          <p className="mt-5 text-[var(--color-ink-soft)] max-w-md leading-relaxed">
            A single unlock for the entire CA Finals syllabus — AFM, FR, Audit, IDT.
            No subscription, no upsell, no hidden tier.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-success-soft)', color: '#0E5A3D' }}
            >
              CA Inter Audit is free forever
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-warning-soft)', color: '#7A5A0F' }}
            >
              Free preview in every subject
            </span>
          </div>
        </div>

        <div
          className="rounded-3xl p-8 text-white relative overflow-hidden"
          style={{ background: 'var(--color-navy)' }}
        >
          <div
            className="absolute -top-32 -right-24 h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(217,80,30,0.35), transparent 65%)' }}
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.18em] opacity-60">CA Finals Bundle</div>
              <div
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: 'var(--color-accent)' }}
              >
                MOST POPULAR
              </div>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-7xl">₹299</span>
              <span className="text-sm opacity-60">one-time</span>
            </div>
            <p className="text-sm opacity-80 mt-1">All four subjects · every chapter · every question.</p>

            <ul className="mt-7 space-y-3 text-sm">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5" style={{ color: 'var(--color-accent)' }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <a
              href="/sign-in"
              className="mt-7 w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--color-accent)', color: 'white' }}
            >
              Unlock the bundle — ₹299 →
            </a>
            <p className="text-[11px] opacity-60 text-center mt-3">
              Pay with UPI, card, or net-banking · powered by Razorpay
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
