'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface AttemptSummary {
  id: string
  overallScore: number
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

export function ProfileCard() {
  const { data: session, status } = useSession()
  const [attempts, setAttempts] = useState<AttemptSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me/attempts')
      .then(r => r.json())
      .then(data => setAttempts(data.attempts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--color-line)', borderTopColor: 'var(--color-ink)' }}
        />
      </div>
    )
  }

  if (!session) return null

  const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.overallScore)) : null
  const totalQuestions = attempts.reduce((s, a) => s + a.totalCount, 0)

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="card p-6 md:p-8 mb-6 flex items-center gap-5">
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt=""
            className="h-16 w-16 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: 'var(--color-navy)' }}
          >
            {session.user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="flex-1">
          <p className="eyebrow mb-1">Profile</p>
          <h1 className="font-display text-3xl leading-tight">{session.user?.name}</h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">{session.user?.email}</p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-5 text-center">
          <p className="font-display text-4xl">{loading ? '—' : attempts.length}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Tests taken
          </p>
        </div>
        <div className="card p-5 text-center">
          <p className="font-display text-4xl">
            {bestScore !== null ? `${Math.round(bestScore)}%` : '—'}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Best score
          </p>
        </div>
        <div className="card p-5 text-center">
          <p className="font-display text-4xl">{totalQuestions}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Questions
          </p>
        </div>
      </div>

      {/* Streak placeholder card — wired up in Phase 4 (derivedStats) */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow mb-1">Daily streak</p>
            <p className="font-display text-5xl flex items-end gap-2">
              12<span className="fire text-3xl">🔥</span>
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1">Longest: 23 days · 2 rest tokens left</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1.5">
            <span className="text-[10px] text-[var(--color-muted)]">last 21 days</span>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 21 }).map((_, i) => {
                const intensities = [3, 2, 4, 3, 1, 4, 3, 2, 3, 4, 2, 3, 4, 1, 3, 4, 4, 2, 3, 4, 3]
                return <div key={i} className={`h-3 w-3 rounded-sm heat-${intensities[i]}`} />
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent attempts */}
      {attempts.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Recent attempts</h2>
            <a
              href="/history"
              className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              View all →
            </a>
          </div>
          <div className="space-y-2">
            {attempts.slice(0, 5).map(a => {
              const tier = TIER_STYLES[a.readinessTier] ?? { bg: 'var(--color-line-soft)', fg: 'var(--color-muted)' }
              return (
                <a
                  key={a.id}
                  href={`/history/${a.id}`}
                  className="flex items-center justify-between card p-4 transition-all hover:border-[#C7C0AF]"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      <span className="font-mono">{a.correctCount}/{a.totalCount}</span> ·{' '}
                      <span className="font-mono">{Math.round(a.overallScore)}%</span>
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                      {new Date(a.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium capitalize"
                    style={{ background: tier.bg, color: tier.fg }}
                  >
                    {a.readinessTier}
                  </span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <a
          href="/select"
          className="rounded-xl px-7 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ background: 'var(--color-ink)' }}
        >
          Take a test <span style={{ color: 'var(--color-accent)' }}>→</span>
        </a>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="rounded-xl border px-7 py-3 text-sm font-bold transition-colors hover:border-[#C7C0AF]"
          style={{ borderColor: 'var(--color-line)' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
