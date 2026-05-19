import type { ChapterScore } from '@/lib/types'

const TIER_STYLES = {
  weak:     { bg: 'var(--color-error-soft)',   fg: '#7A1F1F', bar: 'var(--color-error)' },
  moderate: { bg: 'var(--color-warning-soft)', fg: '#7A5A0F', bar: 'var(--color-warning)' },
  strong:   { bg: 'var(--color-success-soft)', fg: '#0E5A3D', bar: 'var(--color-success)' },
}

interface Props { chapterScores: ChapterScore[] }

export function NodeBreakdown({ chapterScores }: Props) {
  return (
    <div className="card p-6 md:p-7 mb-6">
      <p className="eyebrow mb-2">By chapter</p>
      <h2 className="font-display text-2xl md:text-3xl mb-5">Where you stand</h2>
      <div className="space-y-2.5">
        {chapterScores.map(cs => {
          const styles = TIER_STYLES[cs.tier]
          return (
            <div
              key={cs.chapterId}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-line-soft)' }}
            >
              <div className="flex-1 pr-3 min-w-0">
                <p className="text-sm font-medium line-clamp-2 break-words">{cs.chapterName}</p>
                <div className="mt-1.5 h-1.5 w-full rounded-full" style={{ background: 'var(--color-line-soft)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${cs.percentage}%`, background: styles.bar }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-right shrink-0">
                <span className="font-mono text-xs text-[var(--color-muted)]">
                  {cs.correct}/{cs.total}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize"
                  style={{ background: styles.bg, color: styles.fg }}
                >
                  {cs.tier}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
