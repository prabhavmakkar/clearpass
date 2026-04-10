import type { ReadinessScore } from '@/lib/types'

interface Props {
  overallScore: number
  correctCount: number
  totalCount: number
  readinessScore?: ReadinessScore
}

export function ScoreOverview({ overallScore, correctCount, totalCount, readinessScore }: Props) {
  const displayScore = readinessScore?.score ?? overallScore
  const r = 40
  const circumference = 2 * Math.PI * r
  const filled = (displayScore / 100) * circumference
  const color = displayScore >= 70 ? '#16a34a' : displayScore >= 40 ? '#ca8a04' : '#dc2626'
  const bgColor = displayScore >= 70 ? 'bg-green-50' : displayScore >= 40 ? 'bg-yellow-50' : 'bg-red-50'
  const textColor = displayScore >= 70 ? 'text-green-700' : displayScore >= 40 ? 'text-yellow-700' : 'text-red-700'

  return (
    <div className="mb-10 flex flex-col items-center gap-4 text-center">
      <svg width="120" height="120" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circumference - filled}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="800" fill="#000">{displayScore}%</text>
      </svg>
      {readinessScore && (
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${bgColor} ${textColor}`}>{readinessScore.label}</span>
      )}
      <p className="text-sm text-gray-500">
        {correctCount} correct out of {totalCount} questions
        {readinessScore && <><br /><span className="text-xs text-gray-400">Weighted by ICAI exam mark allocation</span></>}
      </p>
    </div>
  )
}
