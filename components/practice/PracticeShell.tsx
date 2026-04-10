'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { QuestionCard } from '@/components/test/QuestionCard'
import { updateTheta, selectNext, shouldStop } from '@/lib/adaptiveEngine'
import type { ClientQuestion, AdaptiveState } from '@/lib/types'

interface AnswerKey { [questionId: string]: { correctIndex: number; explanation: string } }

const INITIAL: AdaptiveState = {
  theta: 0, answeredIds: [], consecutiveCorrect: 0, consecutiveWrong: 0, questionsAnswered: 0,
}

export function PracticeShell() {
  const searchParams = useSearchParams()
  const [pool, setPool] = useState<ClientQuestion[]>([])
  const [answerKey, setAnswerKey] = useState<AnswerKey>({})
  const [state, setState] = useState<AdaptiveState>(INITIAL)
  const [current, setCurrent] = useState<ClientQuestion | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ correct: 0, total: 0 })
  const [done, setDone] = useState(false)

  useEffect(() => {
    const chapter = searchParams.get('chapter')
    if (!chapter) return
    fetch(`/api/practice/questions?chapter=${chapter}`)
      .then(r => r.json())
      .then((data: { questions: ClientQuestion[]; answerKey: AnswerKey }) => {
        setPool(data.questions)
        setAnswerKey(data.answerKey)
        const first = selectNext(data.questions, INITIAL)
        setCurrent(first)
      })
      .finally(() => setLoading(false))
  }, [searchParams])

  const handleSelect = useCallback((optionIndex: number) => {
    if (!current || selected !== null) return
    setSelected(optionIndex)

    const key = answerKey[current.id]
    const wasCorrect = key ? optionIndex === key.correctIndex : false
    setFeedback({ correct: wasCorrect, explanation: key?.explanation ?? '' })
    setStats(prev => ({ correct: prev.correct + (wasCorrect ? 1 : 0), total: prev.total + 1 }))

    setTimeout(() => {
      const nextState = updateTheta(
        { ...state, answeredIds: [...state.answeredIds, current.id] },
        current.difficulty,
        wasCorrect
      )

      if (shouldStop(nextState, pool.length)) {
        setDone(true)
        setState(nextState)
        return
      }

      const next = selectNext(pool, nextState)
      setState(nextState)
      setCurrent(next)
      setSelected(null)
      setFeedback(null)
    }, 1500)
  }, [current, selected, state, pool, answerKey])

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>

  if (done || !current) {
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <h2 className="mb-4 text-2xl font-black">Practice Complete</h2>
        <p className="mb-2 text-4xl font-black">{pct}%</p>
        <p className="mb-6 text-sm text-gray-500">{stats.correct}/{stats.total} correct</p>
        <a href="/select" className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white hover:opacity-80">Back to Topics</a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-4 flex items-center justify-between text-xs text-gray-400">
        <span>{stats.total} answered · {stats.correct} correct</span>
        <span className="rounded-full border border-gray-100 px-2.5 py-0.5 capitalize">{current.difficulty}</span>
      </div>
      <AnimatePresence mode="wait">
        <QuestionCard key={current.id} question={current} questionNumber={stats.total + 1}
          selectedIndex={selected} onSelect={handleSelect} />
      </AnimatePresence>
      {feedback && (
        <div className={`mt-4 rounded-xl p-4 text-sm ${feedback.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <p className="font-bold">{feedback.correct ? 'Correct!' : 'Incorrect'}</p>
          {feedback.explanation && <p className="mt-1 text-xs opacity-80">{feedback.explanation}</p>}
        </div>
      )}
    </div>
  )
}
