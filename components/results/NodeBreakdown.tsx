import type { ChapterScore } from '@/lib/types'

const TIER_STYLES = {
  weak:     'bg-red-50 text-red-700 border-red-200',
  moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  strong:   'bg-green-50 text-green-700 border-green-200',
}

interface Props { chapterScores: ChapterScore[] }

export function NodeBreakdown({ chapterScores }: Props) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-black">Chapter Breakdown</h2>
      <div className="space-y-2">
        {chapterScores.map(cs => (
          <div key={cs.chapterId}
            className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium">{cs.chapterName}</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-black transition-all"
                  style={{ width: `${cs.percentage}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              <span className="text-sm text-gray-500">{cs.correct}/{cs.total}</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[cs.tier]}`}>
                {cs.tier}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
