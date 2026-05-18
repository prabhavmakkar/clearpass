'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoreOverview } from '@/components/results/ScoreOverview'
import { NodeBreakdown } from '@/components/results/NodeBreakdown'
import { SectionBreakdown } from '@/components/results/SectionBreakdown'
import { WeaknessAnalysis } from '@/components/results/WeaknessAnalysis'
import { StudyPlanCard } from '@/components/results/StudyPlanCard'
import { AnswerReview } from '@/components/results/AnswerReview'
import { FeedbackCard } from '@/components/assessment/FeedbackCard'
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

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center gap-3">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--color-line)', borderTopColor: 'var(--color-ink)' }}
      />
      <p className="text-sm text-[var(--color-muted)]">Analysing your results…</p>
    </div>
  )
  if (error || !report) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <p className="text-sm" style={{ color: 'var(--color-error)' }}>
        {error ?? 'Something went wrong'}
      </p>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <ScoreOverview
        overallScore={report.overallScore}
        correctCount={report.correctCount}
        totalCount={report.totalCount}
        readinessScore={report.readinessScore}
      />

      <SectionBreakdown sectionScores={report.sectionScores} />
      <NodeBreakdown chapterScores={report.chapterScores} />
      <WeaknessAnalysis weaknessAnalysis={report.weaknessAnalysis} />
      <StudyPlanCard studyPlan={report.studyPlan} />

      <div className="my-6 text-center">
        <button
          onClick={() => setShowReview(v => !v)}
          className="rounded-xl border px-8 py-3 text-sm font-bold transition-colors hover:border-[#C7C0AF]"
          style={{ borderColor: 'var(--color-line)' }}
        >
          {showReview
            ? 'Hide answer review'
            : `Review your answers (${report.totalCount - report.correctCount} wrong)`}
        </button>
      </div>

      {showReview && <AnswerReview questions={report.questionReview} />}

      <FeedbackCard attemptId={report.attemptId} />

      <div
        className="my-6 card p-6 text-center relative overflow-hidden"
      >
        <div
          className="absolute -top-16 -right-12 h-40 w-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(217,80,30,0.12), transparent 65%)' }}
        />
        <div className="relative">
          <p className="text-sm font-semibold mb-1">Keep practicing on the go</p>
          <p className="mb-4 text-xs text-[var(--color-muted)]">
            Practice MCQs directly in Telegram — pick your topic and get instant feedback.
          </p>
          <a
            href="https://t.me/ClearpassCAbot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#2AABEE' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Open ClearPass Bot
          </a>
        </div>
      </div>

      <div className="flex gap-3 justify-center mt-8">
        <a
          href="/select"
          className="rounded-xl border px-8 py-3 text-sm font-bold hover:border-[#C7C0AF] transition-colors"
          style={{ borderColor: 'var(--color-line)' }}
        >
          Change scope
        </a>
        <button
          onClick={() => { sessionStorage.removeItem('clearpass_assessment'); router.push('/select') }}
          className="rounded-xl px-8 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ background: 'var(--color-ink)' }}
        >
          Retake <span style={{ color: 'var(--color-accent)' }}>→</span>
        </button>
      </div>
    </div>
  )
}
