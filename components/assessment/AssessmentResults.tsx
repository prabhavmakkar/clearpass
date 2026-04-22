'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoreOverview } from '@/components/results/ScoreOverview'
import { NodeBreakdown } from '@/components/results/NodeBreakdown'
import { SectionBreakdown } from '@/components/results/SectionBreakdown'
import { WeaknessAnalysis } from '@/components/results/WeaknessAnalysis'
import { StudyPlanCard } from '@/components/results/StudyPlanCard'
import { AnswerReview } from '@/components/results/AnswerReview'
import type { AssessmentSession, AssessmentReport } from '@/lib/types'

export function AssessmentResults() {
  const router = useRouter()
  const [report, setReport] = useState<AssessmentReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('clearpass_assessment')
    if (!raw) { router.replace('/select'); return }

    let session: AssessmentSession
    try { session = JSON.parse(raw) } catch { router.replace('/select'); return }

    fetch('/api/assessment/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: session.sessionToken, answers: session.answers }),
    })
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => null)
          throw new Error(body?.error ?? `Server error (${r.status})`)
        }
        return r.json()
      })
      .then(data => setReport(data.report))
      .catch((err: Error) => setError(err.message || 'Failed to generate report'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /><p className="ml-3 text-sm text-gray-500">Analysing your results…</p></div>
  if (error || !report) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3"><p className="text-sm text-red-500">{error ?? 'Something went wrong'}</p></div>

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-black">Your Readiness Report</h1>
      <p className="mb-8 text-sm text-gray-500">Based on {report.totalCount} questions across {report.sectionScores.length} sections</p>
      <ScoreOverview overallScore={report.overallScore} correctCount={report.correctCount}
        totalCount={report.totalCount} readinessScore={report.readinessScore} />
      <SectionBreakdown sectionScores={report.sectionScores} />
      <NodeBreakdown chapterScores={report.chapterScores} />

      <div className="my-8 text-center">
        <button
          onClick={() => setShowReview(v => !v)}
          className="rounded-xl border border-gray-200 px-8 py-3 text-sm font-bold transition-colors hover:border-gray-400"
        >
          {showReview ? 'Hide Answer Review' : `Review Your Answers (${report.totalCount - report.correctCount} wrong)`}
        </button>
      </div>

      {showReview && <AnswerReview questions={report.questionReview} />}

      <WeaknessAnalysis weaknessAnalysis={report.weaknessAnalysis} />
      <StudyPlanCard studyPlan={report.studyPlan} />
      <div className="flex gap-4 justify-center">
        <a href="/select" className="rounded-xl border border-gray-200 px-8 py-3 text-sm font-bold hover:border-gray-400">Change Scope</a>
        <button onClick={() => { sessionStorage.removeItem('clearpass_assessment'); router.push('/select') }}
          className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white hover:opacity-80">Retake →</button>
      </div>
    </div>
  )
}
