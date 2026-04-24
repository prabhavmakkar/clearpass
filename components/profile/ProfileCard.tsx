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

const TIER_COLORS: Record<string, string> = {
  strong: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  weak: 'bg-red-100 text-red-800',
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
      </div>
    )
  }

  if (!session) return null

  const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.overallScore)) : null
  const avgScore = attempts.length > 0 ? attempts.reduce((s, a) => s + a.overallScore, 0) / attempts.length : null
  const totalQuestions = attempts.reduce((s, a) => s + a.totalCount, 0)

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center gap-5">
        {session.user?.image && (
          <img src={session.user.image} alt="" className="h-16 w-16 rounded-full" referrerPolicy="no-referrer" />
        )}
        <div>
          <h1 className="text-2xl font-black">{session.user?.name}</h1>
          <p className="text-sm text-gray-500">{session.user?.email}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-2xl font-bold">{attempts.length}</p>
          <p className="mt-1 text-xs text-gray-500">Tests Taken</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-2xl font-bold">{bestScore !== null ? `${Math.round(bestScore)}%` : '—'}</p>
          <p className="mt-1 text-xs text-gray-500">Best Score</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-2xl font-bold">{totalQuestions}</p>
          <p className="mt-1 text-xs text-gray-500">Questions Attempted</p>
        </div>
      </div>

      {attempts.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">Recent Attempts</h2>
            <a href="/history" className="text-xs font-medium text-gray-500 hover:text-gray-900">View all →</a>
          </div>
          <div className="space-y-2">
            {attempts.slice(0, 5).map(a => (
              <a
                key={a.id}
                href={`/history/${a.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-4 transition-colors hover:border-gray-400"
              >
                <div>
                  <p className="text-sm font-semibold">{a.correctCount}/{a.totalCount} — {Math.round(a.overallScore)}%</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${TIER_COLORS[a.readinessTier] ?? 'bg-gray-100'}`}>
                  {a.readinessTier}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <a href="/select" className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white hover:opacity-80">
          Take a Test
        </a>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="rounded-xl border border-gray-200 px-8 py-3 text-sm font-bold transition-colors hover:border-gray-400"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
