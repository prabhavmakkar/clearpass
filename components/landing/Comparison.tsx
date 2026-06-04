'use client'

import { Fragment, type ReactNode } from 'react'
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
// Abbreviated cost figures used only on the compact mobile table (full figures stay on desktop).
const COST_MOBILE = { cp: '₹299', coaching: '₹40k+', papers: '~₹2k', books: '₹3k+' }

export default function Comparison() {
  const reveal = useScrollReveal()
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 lg:py-28">
      <motion.div {...reveal} className="mb-8 sm:mb-10">
        <p className="eyebrow mb-2">The honest comparison</p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl leading-tight">
          Why not just <em className="not-italic text-[var(--color-muted)]">coaching</em>?
        </h2>
      </motion.div>

      {/* ── Mobile: one compact comparison table (fits down to 320px) ── */}
      <MobileTable />

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

/* ──────────────────────────────────────────────────────────────────
 * Mobile-only compact table. A single 5-column grid (feature name + 4
 * alternatives) that scales with `fr` units so it never overflows on
 * narrow Android / iPhone-SE screens. The ClearPass column is tinted
 * top-to-bottom so it reads as one continuous hero band.
 * ──────────────────────────────────────────────────────────────── */
function MobileTable() {
  return (
    <div className="md:hidden card overflow-hidden">
      <div className="grid grid-cols-[1.4fr_repeat(4,1fr)]">
        {/* Header */}
        <Head />
        <Head highlight>CP</Head>
        <Head>Coach</Head>
        <Head>Papers</Head>
        <Head>Books</Head>

        {/* Feature rows */}
        {ROWS.map((r, i) => (
          <Fragment key={i}>
            <RowLabel>{r.label}</RowLabel>
            <V highlight>{r.cp}</V>
            <V>{r.coaching}</V>
            <V>{r.papers}</V>
            <V>{r.books}</V>
          </Fragment>
        ))}

        {/* Cost row (abbreviated figures) */}
        <RowLabel last>Total cost</RowLabel>
        <V highlight cost last>{COST_MOBILE.cp}</V>
        <V cost last>{COST_MOBILE.coaching}</V>
        <V cost last>{COST_MOBILE.papers}</V>
        <V cost last>{COST_MOBILE.books}</V>
      </div>
    </div>
  )
}

function Head({ children, highlight }: { children?: ReactNode; highlight?: boolean }) {
  return (
    <div
      className="px-1.5 py-2.5 border-b border-[var(--color-line)] flex items-center justify-center text-center"
      style={highlight ? { background: 'var(--color-warning-soft)' } : undefined}
    >
      {highlight ? (
        <span className="font-display text-[14px]" style={{ color: '#7A5A0F' }}>CP</span>
      ) : children ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">{children}</span>
      ) : null}
    </div>
  )
}

function RowLabel({ children, last }: { children: ReactNode; last?: boolean }) {
  return (
    <div className={`px-3 py-3 text-[12px] leading-snug flex items-center ${last ? 'font-medium' : 'border-b border-[var(--color-line)]'}`}>
      {children}
    </div>
  )
}

function V({ children, highlight, cost, last }: { children: ReactNode; highlight?: boolean; cost?: boolean; last?: boolean }) {
  const value = String(children)
  let content: ReactNode
  if (value === '✓') {
    content = <span className="text-[15px] font-bold" style={{ color: 'var(--color-success)' }}>✓</span>
  } else if (value === '—') {
    content = <span className="text-[var(--color-muted)]">—</span>
  } else if (value === 'generic') {
    content = <span className="text-[11px] text-[var(--color-muted)]">gen</span>
  } else if (cost && highlight) {
    content = <span className="font-display text-[15px] leading-none">{value}</span>
  } else {
    content = <span className="text-[11px]" style={{ color: highlight ? '#7A5A0F' : 'var(--color-muted)' }}>{value}</span>
  }
  return (
    <div
      className={`px-1.5 py-3 flex items-center justify-center text-center ${last ? '' : 'border-b border-[var(--color-line)]'}`}
      style={highlight ? { background: 'var(--color-warning-soft)' } : undefined}
    >
      {content}
    </div>
  )
}
