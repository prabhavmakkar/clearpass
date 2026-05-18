'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const ROWS: { label: string; cp: string; coaching: string; papers: string; books: string }[] = [
  { label: 'Tells you why you failed', cp: '✓', coaching: '—', papers: '—', books: '—' },
  { label: 'Personalised study plan',  cp: '✓', coaching: 'generic', papers: '—', books: '—' },
  { label: 'ICAI mark-weighted scoring', cp: '✓', coaching: '—', papers: '—', books: '—' },
  { label: 'Practice on Telegram',     cp: '✓', coaching: '—', papers: '—', books: '—' },
  { label: 'Adaptive difficulty',      cp: '✓', coaching: '—', papers: '—', books: '—' },
]

export default function Comparison() {
  const reveal = useScrollReveal()
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <motion.div {...reveal} className="mb-10">
        <p className="eyebrow mb-2">The honest comparison</p>
        <h2 className="font-display text-4xl md:text-5xl leading-tight">
          Why not just <em className="not-italic text-[var(--color-muted)]">coaching</em>?
        </h2>
      </motion.div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1.6fr_repeat(4,1fr)] text-sm">
          {/* Header row */}
          <div className="px-5 py-4 border-b border-[var(--color-line)]" />
          <div className="px-3 py-4 border-b border-[var(--color-line)] text-center" style={{ background: 'var(--color-warning-soft)' }}>
            <div className="font-display text-lg">ClearPass</div>
          </div>
          <div className="px-3 py-4 border-b border-[var(--color-line)] text-center text-[var(--color-muted)] text-xs font-medium">Coaching</div>
          <div className="px-3 py-4 border-b border-[var(--color-line)] text-center text-[var(--color-muted)] text-xs font-medium">Past papers</div>
          <div className="px-3 py-4 border-b border-[var(--color-line)] text-center text-[var(--color-muted)] text-xs font-medium">Textbooks</div>

          {/* Feature rows */}
          {ROWS.map((r, i) => (
            <ComparisonRow key={i} {...r} isLast={false} />
          ))}

          {/* Cost row */}
          <div className="px-5 py-4">Total cost</div>
          <div className="px-3 py-4 text-center" style={{ background: '#FFFBF5' }}>
            <span className="font-display text-xl">₹299</span>
          </div>
          <div className="px-3 py-4 text-center text-[var(--color-muted)] text-xs">₹40,000+</div>
          <div className="px-3 py-4 text-center text-[var(--color-muted)] text-xs">free–₹2k</div>
          <div className="px-3 py-4 text-center text-[var(--color-muted)] text-xs">₹3k+</div>
        </div>
      </div>
      <p className="text-[11px] text-[var(--color-muted)] text-center mt-4">
        ClearPass replaces nothing. It tells you what to revisit.
      </p>
    </section>
  )
}

function ComparisonRow({ label, cp, coaching, papers, books }: { label: string; cp: string; coaching: string; papers: string; books: string; isLast: boolean }) {
  return (
    <>
      <div className="px-5 py-4 border-b border-[var(--color-line)]">{label}</div>
      <div className="px-3 py-4 border-b border-[var(--color-line)] text-center" style={{ background: '#FFFBF5' }}>
        {cp === '✓' ? (
          <span className="text-lg" style={{ color: 'var(--color-success)' }}>✓</span>
        ) : (
          <span>{cp}</span>
        )}
      </div>
      <Cell value={coaching} />
      <Cell value={papers} />
      <Cell value={books} />
    </>
  )
}

function Cell({ value }: { value: string }) {
  if (value === '—') {
    return <div className="px-3 py-4 border-b border-[var(--color-line)] text-center text-[var(--color-muted)]">—</div>
  }
  return <div className="px-3 py-4 border-b border-[var(--color-line)] text-center text-[var(--color-muted)] text-xs">{value}</div>
}
