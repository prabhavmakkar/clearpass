interface Props {
  current: number  // 1-indexed
  total: number
}

export function ProgressBar({ current, total }: Props) {
  const pct = Math.round(((current - 1) / total) * 100)
  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-between items-baseline">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Question <span className="font-mono text-[var(--color-ink)] font-bold normal-case tracking-normal">{current}</span> of <span className="font-mono text-[var(--color-ink-soft)] normal-case tracking-normal">{total}</span>
        </span>
        <span className="text-[11px] font-mono text-[var(--color-muted)]">{pct}% complete</span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--color-line-soft)' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: 'var(--color-ink)' }}
        />
      </div>
    </div>
  )
}
