import type { SectionScore } from '@/lib/types'

const TIER_STYLES = {
  strong: { bar: 'bg-green-500', badge: 'bg-green-50 text-green-700', label: 'Strong' },
  moderate: { bar: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700', label: 'Moderate' },
  weak: { bar: 'bg-red-400', badge: 'bg-red-50 text-red-700', label: 'Needs work' },
}

interface Props { sectionScores: SectionScore[] }

export function SectionBreakdown({ sectionScores }: Props) {
  return (
    <div className="mb-10">
      <h2 className="mb-1 text-xl font-bold">Gap Analysis by Section</h2>
      <p className="mb-5 text-sm text-gray-500">Weak sections indicate deeper syllabus gaps.</p>
      <div className="flex flex-col gap-4">
        {sectionScores.map(s => {
          const styles = TIER_STYLES[s.tier]
          return (
            <div key={s.sectionId} className="rounded-xl border border-gray-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{s.sectionName}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${styles.badge}`}>{styles.label}</span>
              </div>
              <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${styles.bar} transition-all duration-700`} style={{ width: `${s.percentage}%` }} />
              </div>
              <p className="text-xs text-gray-400">{s.correct}/{s.total} correct ({s.percentage}%)</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
