'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ScoreOverview } from '@/components/results/ScoreOverview'
import { NodeBreakdown } from '@/components/results/NodeBreakdown'
import { SectionBreakdown } from '@/components/results/SectionBreakdown'
import { WeaknessAnalysis } from '@/components/results/WeaknessAnalysis'
import { StudyPlanCard } from '@/components/results/StudyPlanCard'
import { AnswerReview } from '@/components/results/AnswerReview'
import type { ChapterScore, SectionScore, ReadinessScore, QuestionReview, StudyPlan } from '@/lib/types'

interface Attempt {
  id: string
  overallScore: number
  correctCount: number
  totalCount: number
  readinessScore: number
  readinessTier: string
  chapterScores: ChapterScore[]
  sectionScores: SectionScore[]
  questionReview: QuestionReview[]
  weaknessAnalysis: string
  studyPlan: StudyPlan
  createdAt: string
}

export function AttemptDetail() {
  const pathname = usePathname()
  const attemptId = pathname.split('/').pop()!
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    fetch(`/api/me/attempts/${attemptId}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? 'Failed to load')
        return r.json()
      })
      .then(data => setAttempt(data.attempt))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [attemptId])

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--color-line)', borderTopColor: 'var(--color-ink)' }}
      />
    </div>
  )
  if (error || !attempt) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error ?? 'Not found'}</p>
    </div>
  )

  const readinessScore: ReadinessScore = {
    score: attempt.readinessScore,
    tier: attempt.readinessTier as ReadinessScore['tier'],
    label: attempt.readinessTier === 'strong' ? 'Likely to clear' : attempt.readinessTier === 'moderate' ? 'Borderline' : 'Needs work',
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="eyebrow mb-1">Past attempt</p>
          <h1 className="font-display text-3xl">
            {new Date(attempt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {attempt.totalCount} questions · {attempt.sectionScores.length} sections
          </p>
        </div>
      </div>

      <ScoreOverview
        overallScore={attempt.overallScore}
        correctCount={attempt.correctCount}
        totalCount={attempt.totalCount}
        readinessScore={readinessScore}
      />
      <SectionBreakdown sectionScores={attempt.sectionScores} />
      <NodeBreakdown chapterScores={attempt.chapterScores} />

      <div className="my-6 text-center">
        <button
          onClick={() => setShowReview(v => !v)}
          className="rounded-xl border px-8 py-3 text-sm font-bold transition-colors hover:border-[#C7C0AF]"
          style={{ borderColor: 'var(--color-line)' }}
        >
          {showReview ? 'Hide answer review' : `Review answers (${attempt.totalCount - attempt.correctCount} wrong)`}
        </button>
      </div>

      {showReview && <AnswerReview questions={attempt.questionReview} />}

      <WeaknessAnalysis weaknessAnalysis={attempt.weaknessAnalysis} />
      <StudyPlanCard studyPlan={attempt.studyPlan} />

      <div className="mt-8 text-center">
        <a
          href="/history"
          className="inline-block rounded-xl border px-8 py-3 text-sm font-bold hover:border-[#C7C0AF] transition-colors"
          style={{ borderColor: 'var(--color-line)' }}
        >
          ← Back to history
        </a>
      </div>
    </div>
  )
}
