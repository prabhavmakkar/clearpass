interface Props {
  overallScore: number
  correctCount: number
  totalCount: number
}

export function ScoreOverview({ overallScore, correctCount, totalCount }: Props) {
  const r = 40
  const circumference = 2 * Math.PI * r
  const filled = (overallScore / 100) * circumference
  const color = overallScore >= 70 ? '#16a34a' : overallScore >= 40 ? '#ca8a04' : '#dc2626'

  return (
    <div className="mb-10 flex flex-col items-center gap-4 text-center">
      <svg width="120" height="120" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="800" fill="#000">
          {overallScore}%
        </text>
      </svg>
      <p className="text-sm text-gray-500">{correctCount} correct out of {totalCount}</p>
    </div>
  )
}
