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

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>
  if (error || !attempt) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3"><p className="text-sm text-red-500">{error ?? 'Not found'}</p></div>

  const readinessScore: ReadinessScore = {
    score: attempt.readinessScore,
    tier: attempt.readinessTier as ReadinessScore['tier'],
    label: attempt.readinessTier === 'strong' ? 'Likely to clear' : attempt.readinessTier === 'moderate' ? 'Borderline' : 'Needs work',
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-3xl font-black">Past Attempt</h1>
        <span className="text-xs text-gray-400">
          {new Date(attempt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
      <p className="mb-8 text-sm text-gray-500">
        {attempt.totalCount} questions across {attempt.sectionScores.length} sections
      </p>

      <ScoreOverview overallScore={attempt.overallScore} correctCount={attempt.correctCount}
        totalCount={attempt.totalCount} readinessScore={readinessScore} />
      <SectionBreakdown sectionScores={attempt.sectionScores} />
      <NodeBreakdown chapterScores={attempt.chapterScores} />

      <div className="my-8 text-center">
        <button
          onClick={() => setShowReview(v => !v)}
          className="rounded-xl border border-gray-200 px-8 py-3 text-sm font-bold transition-colors hover:border-gray-400"
        >
          {showReview ? 'Hide Answer Review' : `Review Answers (${attempt.totalCount - attempt.correctCount} wrong)`}
        </button>
      </div>

      {showReview && <AnswerReview questions={attempt.questionReview} />}

      <WeaknessAnalysis weaknessAnalysis={attempt.weaknessAnalysis} />
      <StudyPlanCard studyPlan={attempt.studyPlan} />

      <div className="mt-8 text-center">
        <a href="/history" className="rounded-xl border border-gray-200 px-8 py-3 text-sm font-bold hover:border-gray-400">
          ← Back to History
        </a>
      </div>
    </div>
  )
}
