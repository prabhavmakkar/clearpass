'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { QuestionCard } from '@/components/test/QuestionCard'
import { updateTheta, selectNext, shouldStop } from '@/lib/adaptiveEngine'
import type { ClientQuestion, AdaptiveState } from '@/lib/types'

interface AnswerKey { [questionId: string]: { correctIndex: number; explanation: string } }

interface HistoryEntry {
  question: ClientQuestion
  selected: number
  correct: boolean
  explanation: string
}

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
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ correct: 0, total: 0 })
  const [done, setDone] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [viewIndex, setViewIndex] = useState(-1)

  const isReviewing = viewIndex >= 0 && viewIndex < history.length

  useEffect(() => {
    const chapter = searchParams.get('chapter')
    if (!chapter) { setError('No chapter selected'); setLoading(false); return }
    fetch(`/api/practice/questions?chapter=${chapter}`)
      .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then((data: { questions: ClientQuestion[]; answerKey: AnswerKey }) => {
        setPool(data.questions)
        setAnswerKey(data.answerKey)
        const first = selectNext(data.questions, INITIAL)
        setCurrent(first)
      })
      .catch(() => setError('Failed to load practice questions'))
      .finally(() => setLoading(false))
  }, [searchParams])

  const handleSelect = useCallback((optionIndex: number) => {
    if (!current || selected !== null || isReviewing) return
    setSelected(optionIndex)

    const key = answerKey[current.id]
    const wasCorrect = key ? optionIndex === key.correctIndex : false
    const explanation = key?.explanation ?? ''
    setFeedback({ correct: wasCorrect, explanation })
    setStats(prev => ({ correct: prev.correct + (wasCorrect ? 1 : 0), total: prev.total + 1 }))

    setHistory(prev => [...prev, { question: current, selected: optionIndex, correct: wasCorrect, explanation }])
  }, [current, selected, isReviewing, answerKey])

  const handleNext = useCallback(() => {
    if (isReviewing) {
      if (viewIndex < history.length - 1) {
        setViewIndex(viewIndex + 1)
      } else {
        setViewIndex(-1)
      }
      return
    }

    if (!current || selected === null) return

    const key = answerKey[current.id]
    const wasCorrect = key ? selected === key.correctIndex : false

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
  }, [current, selected, state, pool, answerKey, isReviewing, viewIndex, history.length])

  const handlePrevious = useCallback(() => {
    if (isReviewing) {
      if (viewIndex > 0) {
        setViewIndex(viewIndex - 1)
      }
    } else if (history.length > 0) {
      setViewIndex(history.length - 1)
    }
  }, [isReviewing, viewIndex, history.length])

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>
  if (error) return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-red-500">{error}</p></div>

  if (done || (!current && !isReviewing)) {
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

  const displayQuestion = isReviewing ? history[viewIndex].question : current
  const displaySelected = isReviewing ? history[viewIndex].selected : selected
  const displayFeedback = isReviewing
    ? { correct: history[viewIndex].correct, explanation: history[viewIndex].explanation }
    : feedback
  const canGoPrevious = isReviewing ? viewIndex > 0 : history.length > 0
  const canGoNext = isReviewing || selected !== null

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-4 flex items-center justify-between text-xs text-gray-400">
        <span>{stats.total} answered · {stats.correct} correct</span>
        <span className="rounded-full border border-gray-100 px-2.5 py-0.5 capitalize">
          {isReviewing ? `Reviewing ${viewIndex + 1}/${history.length}` : displayQuestion?.difficulty}
        </span>
      </div>
      {displayQuestion && (
        <AnimatePresence mode="wait">
          <QuestionCard key={displayQuestion.id + (isReviewing ? '-review' : '')} question={displayQuestion} questionNumber={isReviewing ? viewIndex + 1 : stats.total + 1}
            selectedIndex={displaySelected} onSelect={isReviewing ? () => {} : handleSelect} />
        </AnimatePresence>
      )}
      {displayFeedback && (
        <div className={`mt-4 rounded-xl p-4 text-sm ${displayFeedback.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <p className="font-bold">{displayFeedback.correct ? 'Correct!' : 'Incorrect'}</p>
          {displayFeedback.explanation && <p className="mt-1 text-xs opacity-80">{displayFeedback.explanation}</p>}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-30"
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-30"
        >
          {isReviewing && viewIndex < history.length - 1 ? 'Next →' : 'Next Question →'}
        </button>
      </div>
    </div>
  )
}
