'use client'

import { useEffect, useState } from 'react'

interface AttemptSummary {
  id: string
  subjectId: string
  overallScore: number
  readinessScore: number
  readinessTier: string
  correctCount: number
  totalCount: number
  createdAt: string
}

const TIER_COLORS: Record<string, string> = {
  strong: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  weak: 'bg-red-100 text-red-800',
}

export function HistoryList() {
  const [attempts, setAttempts] = useState<AttemptSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me/attempts')
      .then(r => r.json())
      .then(data => setAttempts(data.attempts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
      </div>
    )
  }

  if (attempts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="mb-2 text-2xl font-black">No attempts yet</h1>
        <p className="mb-6 text-sm text-gray-500">Take an assessment to see your history here.</p>
        <a href="/select" className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white hover:opacity-80">
          Start Assessment
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-black">Past Attempts</h1>
      <div className="space-y-3">
        {attempts.map(a => (
          <a
            key={a.id}
            href={`/history/${a.id}`}
            className="flex items-center justify-between rounded-xl border border-gray-200 p-5 transition-colors hover:border-gray-400"
          >
            <div>
              <p className="text-sm font-semibold">{a.correctCount}/{a.totalCount} correct — {Math.round(a.overallScore)}%</p>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${TIER_COLORS[a.readinessTier] ?? 'bg-gray-100'}`}>
                {a.readinessTier}
              </span>
              <span className="text-gray-300">→</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
