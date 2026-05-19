'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useStats } from '@/hooks/useStats'
import type { HeatmapDay, Badge } from '@/lib/derivedStats'

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

// Map daily question-count to a heatmap intensity (0–4).
function intensityFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count < 10) return 1
  if (count < 25) return 2
  if (count < 50) return 3
  return 4
}

export function ProfileCard() {
  const { data: session, status } = useSession()
  const { stats } = useStats()
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

  const totals = stats?.totals
  const streak = stats?.streak
  const heatmap = stats?.heatmap
  const badges = stats?.badges ?? []
  const earnedCount = badges.filter(b => b.earned).length

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="card p-6 md:p-8 mb-6 flex items-center gap-5">
        {session.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
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
        <div className="flex-1 min-w-0">
          <p className="eyebrow mb-1">Profile</p>
          <h1 className="font-display text-3xl leading-tight truncate">{session.user?.name}</h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">{session.user?.email}</p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-5 text-center">
          <p className="font-display text-4xl">{totals?.testsTaken ?? (loading ? '—' : 0)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Tests taken
          </p>
        </div>
        <div className="card p-5 text-center">
          <p className="font-display text-4xl">
            {totals?.bestScore != null ? `${Math.round(totals.bestScore)}%` : '—'}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Best score
          </p>
        </div>
        <div className="card p-5 text-center">
          <p className="font-display text-4xl">{totals?.questionsAnswered ?? 0}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Questions
          </p>
        </div>
      </div>

      {/* Streak block */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow mb-1">Daily streak</p>
            <p className="font-display text-5xl flex items-end gap-2">
              {streak?.current ?? 0}
              {(streak?.current ?? 0) > 0 && <span className="fire text-3xl">🔥</span>}
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Longest: <span className="font-mono">{streak?.longest ?? 0}</span> days
              {streak?.lastActiveDate && (
                <>
                  {' · '}
                  Last practised{' '}
                  {new Date(streak.lastActiveDate).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short',
                  })}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card p-6 mb-6">
        <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="eyebrow mb-1">Activity · last 12 weeks</p>
            <h2 className="font-display text-2xl">
              {heatmap ? heatmap.filter(d => d.count > 0).length : 0} days practised
            </h2>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
            <span>less</span>
            <span className="h-3 w-3 rounded-sm heat-0" />
            <span className="h-3 w-3 rounded-sm heat-1" />
            <span className="h-3 w-3 rounded-sm heat-2" />
            <span className="h-3 w-3 rounded-sm heat-3" />
            <span className="h-3 w-3 rounded-sm heat-4" />
            <span>more</span>
          </div>
        </div>
        <HeatmapGrid days={heatmap ?? []} />
      </div>

      {/* Achievements */}
      {badges.length > 0 && (
        <div className="card p-6 mb-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="eyebrow mb-1">Achievements</p>
              <h2 className="font-display text-2xl">
                {earnedCount} of {badges.length} earned
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {badges.map(b => <BadgeTile key={b.id} badge={b} />)}
          </div>
        </div>
      )}

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

/** 12-week × 7-day grid. Columns are weeks (left = oldest), rows are days. */
function HeatmapGrid({ days }: { days: HeatmapDay[] }) {
  // Group days into weeks of 7
  const weeks: HeatmapDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return (
    <div className="flex gap-1 overflow-x-auto">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1 shrink-0">
          {week.map(d => (
            <div
              key={d.date}
              className={`h-3 w-3 rounded-sm heat-${intensityFor(d.count)}`}
              title={`${d.date} · ${d.count} questions`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function BadgeTile({ badge }: { badge: Badge }) {
  return (
    <div
      className="rounded-xl border border-[var(--color-line)] bg-paper p-3 text-center transition-all hover:-translate-y-0.5 hover:border-[#C7C0AF]"
      style={{ filter: badge.earned ? undefined : 'grayscale(1)', opacity: badge.earned ? 1 : 0.4 }}
      title={badge.description}
    >
      <div className="text-2xl">{badge.emoji}</div>
      <div className="text-[10px] mt-1 font-semibold leading-tight">{badge.name}</div>
    </div>
  )
}
