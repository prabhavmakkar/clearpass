'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ProgressBar } from '@/components/test/ProgressBar'
import { QuestionCard } from '@/components/test/QuestionCard'
import type { ClientQuestion, AssessmentSession } from '@/lib/types'

export function AssessmentShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [questions, setQuestions] = useState<ClientQuestion[]>([])
  const [sessionId, setSessionId] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    const chapters = searchParams.get('chapters')
    if (!chapters) { setError('No chapters selected'); setLoading(false); return }

    fetch(`/api/assessment/questions?chapters=${chapters}`)
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => null)
          throw new Error(body?.error ?? `Server error (${r.status})`)
        }
        return r.json()
      })
      .then(data => {
        setQuestions(data.questions)
        setSessionId(data.sessionId)
        setSessionToken(data.sessionToken)
        setAnswers(Array(data.questions.length).fill(null))
      })
      .catch((err: Error) => setError(err.message || 'Failed to load questions'))
      .finally(() => setLoading(false))
  }, [searchParams])

  function handleSelect(optionIndex: number) {
    setAnswers(prev => { const next = [...prev]; next[currentIndex] = optionIndex; return next })
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(i => i + 1), 300)
    }
  }

  function handleSubmit() {
    setIsSubmitting(true)
    const session: AssessmentSession = {
      sessionId, sessionToken,
      subjectId: searchParams.get('subject') ?? '',
      scope: {
        sectionIds: searchParams.get('sections')?.split(',') ?? [],
        chapterIds: searchParams.get('chapters')?.split(',') ?? [],
      },
      questions, answers, startedAt,
      submittedAt: new Date().toISOString(),
    }
    sessionStorage.setItem('clearpass_assessment', JSON.stringify(session))
    router.push('/assessment/results')
  }

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--color-line)', borderTopColor: 'var(--color-ink)' }} />
    </div>
  )
  if (error) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
    </div>
  )
  if (questions.length === 0) return null

  const answeredCount = answers.filter(a => a !== null).length
  const allAnswered = answeredCount === questions.length

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ProgressBar current={currentIndex + 1} total={questions.length} />
      <div className="card p-6 md:p-8">
        <AnimatePresence mode="wait">
          <QuestionCard
            key={currentIndex}
            question={questions[currentIndex]}
            questionNumber={currentIndex + 1}
            selectedIndex={answers[currentIndex]}
            onSelect={handleSelect}
          />
        </AnimatePresence>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="text-sm text-[var(--color-muted)] underline underline-offset-4 disabled:opacity-30"
        >
          ← Previous
        </button>
        {currentIndex < questions.length - 1 && (
          <button
            onClick={() => setCurrentIndex(i => i + 1)}
            className="text-sm text-[var(--color-ink)] underline underline-offset-4 font-medium"
          >
            Next →
          </button>
        )}
      </div>
      {(currentIndex === questions.length - 1 || allAnswered) && (
        <div className="mt-8 text-center">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className="rounded-xl px-10 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--color-ink)' }}
          >
            {isSubmitting ? 'Submitting…' : (
              <>
                Submit Assessment <span style={{ color: 'var(--color-accent)' }}>→</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
