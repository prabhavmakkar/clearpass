'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ProgressBar } from './ProgressBar'
import { QuestionCard } from './QuestionCard'
import { SubmitButton } from './SubmitButton'
import type { ClientQuestion, TestSession } from '@/lib/types'

interface Props {
  sessionId: string
  questions: ClientQuestion[]
  topic: string
}

export function TestShell({ sessionId, questions, topic }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startedAt] = useState(() => new Date().toISOString())

  const answeredCount = answers.filter(a => a !== null).length
  const currentQuestion = questions[currentIndex]

  function handleSelect(optionIndex: number) {
    setAnswers(prev => {
      const next = [...prev]
      next[currentIndex] = optionIndex
      return next
    })
    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex(i => i + 1), 300)
    }
  }

  function handleSubmit() {
    setIsSubmitting(true)
    const session: TestSession = {
      sessionId,
      topic,
      questions,
      answers,
      startedAt,
      submittedAt: new Date().toISOString(),
    }
    sessionStorage.setItem('clearpass_session', JSON.stringify(session))
    router.push('/results')
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <ProgressBar current={currentIndex + 1} total={questions.length} />
      <AnimatePresence mode="wait">
        <QuestionCard
          key={currentIndex}
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          selectedIndex={answers[currentIndex]}
          onSelect={handleSelect}
        />
      </AnimatePresence>
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="text-sm text-gray-500 underline underline-offset-4 disabled:opacity-30"
        >
          ← Previous
        </button>
        {currentIndex < questions.length - 1 && (
          <button
            onClick={() => setCurrentIndex(i => i + 1)}
            className="text-sm text-gray-800 underline underline-offset-4"
          >
            Next →
          </button>
        )}
      </div>
      {(currentIndex === questions.length - 1 || answeredCount === questions.length) && (
        <SubmitButton
          answeredCount={answeredCount}
          totalCount={questions.length}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
