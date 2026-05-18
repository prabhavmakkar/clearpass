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

const TIER_STYLES: Record<string, { bg: string; fg: string }> = {
  strong:   { bg: 'var(--color-success-soft)', fg: '#0E5A3D' },
  moderate: { bg: 'var(--color-warning-soft)', fg: '#7A5A0F' },
  weak:     { bg: 'var(--color-error-soft)',   fg: '#7A1F1F' },
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
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--color-line)', borderTopColor: 'var(--color-ink)' }}
        />
      </div>
    )
  }

  if (attempts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="eyebrow mb-3">History</p>
        <h1 className="font-display text-4xl mb-3">No attempts yet</h1>
        <p className="mb-7 text-sm text-[var(--color-muted)]">
          Take an assessment to see your history here.
        </p>
        <a
          href="/select"
          className="inline-block rounded-xl px-8 py-3 text-sm font-bold text-white hover:opacity-90"
          style={{ background: 'var(--color-ink)' }}
        >
          Start Assessment <span style={{ color: 'var(--color-accent)' }}>→</span>
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="eyebrow mb-2">History</p>
      <h1 className="font-display text-4xl mb-6">Past attempts</h1>
      <div className="space-y-2.5">
        {attempts.map(a => {
          const tier = TIER_STYLES[a.readinessTier] ?? { bg: 'var(--color-line-soft)', fg: 'var(--color-muted)' }
          return (
            <a
              key={a.id}
              href={`/history/${a.id}`}
              className="flex items-center justify-between card p-5 transition-all hover:border-[#C7C0AF] hover:-translate-y-0.5"
            >
              <div>
                <p className="text-sm font-semibold">
                  <span className="font-mono">{a.correctCount}/{a.totalCount}</span> correct ·{' '}
                  <span className="font-mono">{Math.round(a.overallScore)}%</span>
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {new Date(a.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium capitalize"
                  style={{ background: tier.bg, color: tier.fg }}
                >
                  {a.readinessTier}
                </span>
                <span className="text-[var(--color-muted)]">→</span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
