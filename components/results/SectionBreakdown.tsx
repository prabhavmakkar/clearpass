import type { SectionScore } from '@/lib/types'

const TIER_STYLES = {
  strong:   { bar: 'var(--color-success)', badgeBg: 'var(--color-success-soft)', badgeFg: '#0E5A3D', label: 'Strong' },
  moderate: { bar: 'var(--color-warning)', badgeBg: 'var(--color-warning-soft)', badgeFg: '#7A5A0F', label: 'Moderate' },
  weak:     { bar: 'var(--color-error)',   badgeBg: 'var(--color-error-soft)',   badgeFg: '#7A1F1F', label: 'Needs work' },
}

interface Props { sectionScores: SectionScore[] }

export function SectionBreakdown({ sectionScores }: Props) {
  return (
    <div className="card p-6 md:p-7 mb-6">
      <p className="eyebrow mb-2">By section</p>
      <h2 className="font-display text-2xl md:text-3xl mb-5">Where the marks went</h2>
      <div className="flex flex-col gap-4">
        {sectionScores.map(s => {
          const styles = TIER_STYLES[s.tier]
          return (
            <div key={s.sectionId}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-medium">{s.sectionName}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold" style={{ color: styles.bar }}>
                    {s.percentage}%
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: styles.badgeBg, color: styles.badgeFg }}
                  >
                    {styles.label}
                  </span>
                </div>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ background: 'var(--color-line-soft)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.percentage}%`, background: styles.bar, transition: 'width 1s cubic-bezier(.2,.8,.2,1)' }}
                />
              </div>
              <p className="mt-1 text-[11px] font-mono text-[var(--color-muted)]">
                {s.correct}/{s.total} correct
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
