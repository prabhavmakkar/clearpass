interface Props {
  current: number  // 1-indexed
  total: number
}

export function ProgressBar({ current, total }: Props) {
  const pct = Math.round(((current - 1) / total) * 100)
  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-between text-xs text-gray-500">
        <span>Question {current} of {total}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-black transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
