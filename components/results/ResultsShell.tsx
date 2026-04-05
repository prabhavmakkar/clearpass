'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoreOverview } from './ScoreOverview'
import { NodeBreakdown } from './NodeBreakdown'
import { WeaknessAnalysis } from './WeaknessAnalysis'
import { StudyPlanCard } from './StudyPlanCard'
import type { TestSession, TestReport } from '@/lib/types'

export function ResultsShell() {
  const router = useRouter()
  const [report, setReport] = useState<TestReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('clearpass_session')
    if (!raw) { router.replace('/test'); return }

    const session: TestSession = JSON.parse(raw)

    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        topic: session.topic,
        answers: session.answers,
      }),
    })
      .then(r => r.json())
      .then(data => setReport(data.report))
      .catch(() => setError('Failed to generate report. Please try again.'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
        <p className="text-sm text-gray-500">Analysing your results…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-500">{error ?? 'Something went wrong.'}</p>
        <button onClick={() => router.push('/test')}
          className="rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white">
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-black">Your Readiness Report</h1>
      <p className="mb-8 text-sm text-gray-500">CA Intermediate · Auditing &amp; Assurance</p>
      <ScoreOverview
        overallScore={report.overallScore}
        correctCount={report.correctCount}
        totalCount={report.totalCount}
      />
      <NodeBreakdown nodeScores={report.nodeScores} />
      <WeaknessAnalysis weaknessAnalysis={report.weaknessAnalysis} />
      <StudyPlanCard studyPlan={report.studyPlan} />
      <div className="text-center">
        <button
          onClick={() => { sessionStorage.removeItem('clearpass_session'); router.push('/test') }}
          className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white hover:opacity-80"
        >
          Retake Test →
        </button>
      </div>
    </div>
  )
}
