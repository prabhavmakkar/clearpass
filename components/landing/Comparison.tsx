'use client'

import { motion } from 'framer-motion'
import { useScrollReveal } from '@/hooks/useScrollReveal'

interface Row { label: string; cp: string; coaching: string; papers: string; books: string }

const ROWS: Row[] = [
  { label: 'Tells you why you failed',   cp: '✓', coaching: '—',       papers: '—', books: '—' },
  { label: 'Personalised study plan',    cp: '✓', coaching: 'generic', papers: '—', books: '—' },
  { label: 'ICAI mark-weighted scoring', cp: '✓', coaching: '—',       papers: '—', books: '—' },
  { label: 'Practice on Telegram',       cp: '✓', coaching: '—',       papers: '—', books: '—' },
  { label: 'Adaptive difficulty',        cp: '✓', coaching: '—',       papers: '—', books: '—' },
]

const COST_ROW: Row = { label: 'Total cost', cp: '₹299', coaching: '₹40,000+', papers: 'free–₹2k', books: '₹3k+' }

export default function Comparison() {
  const reveal = useScrollReveal()
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <motion.div {...reveal} className="mb-8 sm:mb-10">
        <p className="eyebrow mb-2">The honest comparison</p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl leading-tight">
          Why not just <em className="not-italic text-[var(--color-muted)]">coaching</em>?
        </h2>
      </motion.div>

      {/* ── Mobile: stacked feature cards ──────────────────────────── */}
      <div className="md:hidden space-y-2.5">
        {[...ROWS, COST_ROW].map((r, i) => (
          <MobileRow key={i} {...r} isCost={r === COST_ROW} />
        ))}
      </div>

      {/* ── Desktop: 5-col grid ────────────────────────────────────── */}
      <div className="hidden md:block card overflow-hidden">
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
            <ComparisonRow key={i} {...r} />
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

function ComparisonRow({ label, cp, coaching, papers, books }: Row) {
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

/** Stacked card per row — used on mobile only. Feature name on top, then a
 *  4-column row showing each alternative's value. ClearPass column is tinted. */
function MobileRow({ label, cp, coaching, papers, books, isCost }: Row & { isCost: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-sm font-medium mb-3">{label}</p>
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <MobileCell label="ClearPass" value={cp} highlight isCost={isCost} />
        <MobileCell label="Coaching" value={coaching} isCost={isCost} />
        <MobileCell label="Past papers" value={papers} isCost={isCost} />
        <MobileCell label="Books" value={books} isCost={isCost} />
      </div>
    </div>
  )
}

function MobileCell({ label, value, highlight, isCost }: { label: string; value: string; highlight?: boolean; isCost: boolean }) {
  const isDash = value === '—'
  return (
    <div
      className="rounded-lg p-2 flex flex-col items-center justify-center min-h-[58px]"
      style={{
        background: highlight ? 'var(--color-warning-soft)' : 'var(--color-bg)',
        border: highlight ? '1px solid #F0D894' : '1px solid var(--color-line-soft)',
      }}
    >
      <div
        className="text-[9px] uppercase tracking-[0.1em] mb-1 leading-none"
        style={{ color: highlight ? '#7A5A0F' : 'var(--color-muted)' }}
      >
        {label}
      </div>
      {value === '✓' ? (
        <span className="text-base font-bold" style={{ color: 'var(--color-success)' }}>✓</span>
      ) : isDash ? (
        <span className="text-base" style={{ color: 'var(--color-muted)' }}>—</span>
      ) : isCost && highlight ? (
        <span className="font-display text-base leading-none">{value}</span>
      ) : (
        <span className="text-[10px] leading-tight" style={{ color: highlight ? '#7A5A0F' : 'var(--color-muted)' }}>
          {value}
        </span>
      )}
    </div>
  )
}
