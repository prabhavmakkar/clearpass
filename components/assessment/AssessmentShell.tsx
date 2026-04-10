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
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(data => {
        setQuestions(data.questions)
        setSessionId(data.sessionId)
        setSessionToken(data.sessionToken)
        setAnswers(Array(data.questions.length).fill(null))
      })
      .catch(() => setError('Failed to load questions'))
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

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>
  if (error) return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-red-500">{error}</p></div>
  if (questions.length === 0) return null

  const answeredCount = answers.filter(a => a !== null).length
  const allAnswered = answeredCount === questions.length

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <ProgressBar current={currentIndex + 1} total={questions.length} />
      <AnimatePresence mode="wait">
        <QuestionCard
          key={currentIndex}
          question={questions[currentIndex]}
          questionNumber={currentIndex + 1}
          selectedIndex={answers[currentIndex]}
          onSelect={handleSelect}
        />
      </AnimatePresence>
      <div className="mt-8 flex items-center justify-between">
        <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
          className="text-sm text-gray-500 underline underline-offset-4 disabled:opacity-30">← Previous</button>
        {currentIndex < questions.length - 1 && (
          <button onClick={() => setCurrentIndex(i => i + 1)}
            className="text-sm text-gray-800 underline underline-offset-4">Next →</button>
        )}
      </div>
      {(currentIndex === questions.length - 1 || allAnswered) && (
        <div className="mt-8 text-center">
          <button onClick={handleSubmit} disabled={!allAnswered || isSubmitting}
            className="rounded-xl bg-black px-10 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-40">
            {isSubmitting ? 'Submitting…' : 'Submit Assessment →'}
          </button>
        </div>
      )}
    </div>
  )
}
