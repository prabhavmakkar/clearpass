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

const DIFF_BADGE: Record<string, { icon: string; label: string; bg: string; fg: string }> = {
  easy:   { icon: '🌱', label: 'Easy',   bg: 'var(--color-success-soft)', fg: '#0E5A3D' },
  medium: { icon: '⚖️', label: 'Medium', bg: 'var(--color-warning-soft)', fg: '#7A5A0F' },
  hard:   { icon: '🔥', label: 'Hard',   bg: 'var(--color-error-soft)',   fg: '#7A1F1F' },
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
  const [sessionStreak, setSessionStreak] = useState(0)

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
    setSessionStreak(prev => wasCorrect ? prev + 1 : 0)

    setHistory(prev => [...prev, { question: current, selected: optionIndex, correct: wasCorrect, explanation }])
  }, [current, selected, isReviewing, answerKey])

  const handleNext = useCallback(() => {
    if (isReviewing) {
      if (viewIndex < history.length - 1) setViewIndex(viewIndex + 1)
      else setViewIndex(-1)
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
      if (viewIndex > 0) setViewIndex(viewIndex - 1)
    } else if (history.length > 0) {
      setViewIndex(history.length - 1)
    }
  }, [isReviewing, viewIndex, history.length])

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--color-line)', borderTopColor: 'var(--color-ink)' }} />
    </div>
  )
  if (error) {
    // "No chapter selected" isn't a failure — it means the user reached /practice
    // without choosing a chapter (adaptive practice is per-chapter). Guide them to
    // the topic selector rather than dead-ending on a bare error.
    const noChapter = error === 'No chapter selected'
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center flex flex-col items-center">
        {noChapter ? (
          <>
            <p className="eyebrow mb-3">Adaptive practice</p>
            <h1 className="font-display text-3xl leading-tight mb-3">Pick a chapter to practice</h1>
            <p className="text-sm text-[var(--color-muted)] mb-8">
              Practice adapts to one chapter at a time. Choose a subject and chapter to begin.
            </p>
          </>
        ) : (
          <p className="text-sm mb-8" style={{ color: 'var(--color-error)' }}>{error}</p>
        )}
        <a
          href="/select"
          className="inline-block rounded-xl px-8 py-3 text-sm font-bold text-white hover:opacity-90"
          style={{ background: 'var(--color-ink)' }}
        >
          Choose a chapter
        </a>
      </div>
    )
  }

  if (done || (!current && !isReviewing)) {
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <p className="eyebrow mb-3">Practice complete</p>
        <p className="font-display text-7xl mb-2">{pct}%</p>
        <p className="text-sm text-[var(--color-muted)] mb-8">{stats.correct}/{stats.total} correct</p>
        <a
          href="/select"
          className="inline-block rounded-xl px-8 py-3 text-sm font-bold text-white hover:opacity-90"
          style={{ background: 'var(--color-ink)' }}
        >
          Back to Topics
        </a>
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
  const diff = displayQuestion?.difficulty ?? 'medium'
  const diffBadge = DIFF_BADGE[diff] ?? DIFF_BADGE.medium

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Top stats strip */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: diffBadge.bg, color: diffBadge.fg }}
          >
            {diffBadge.icon} {diffBadge.label}
          </span>
          {!isReviewing && sessionStreak > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
              <span className="fire">🔥</span>
              <span className="font-mono font-bold text-[var(--color-ink)]">{sessionStreak}</span>
              in a row
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-[var(--color-muted)]">
          {isReviewing
            ? `Reviewing ${viewIndex + 1}/${history.length}`
            : `${stats.total} answered · ${stats.correct} correct`}
        </span>
      </div>

      {/* Question card */}
      {displayQuestion && (
        <div className="card p-6 md:p-8">
          <AnimatePresence mode="wait">
            <QuestionCard
              key={displayQuestion.id + (isReviewing ? '-review' : '')}
              question={displayQuestion}
              questionNumber={isReviewing ? viewIndex + 1 : stats.total + 1}
              selectedIndex={displaySelected}
              onSelect={isReviewing ? () => {} : handleSelect}
            />
          </AnimatePresence>
          {displayFeedback && (
            <div
              className={`mt-5 rounded-xl p-4 text-sm ${displayFeedback.correct ? '' : 'shake'}`}
              style={{
                background: displayFeedback.correct ? 'var(--color-success-soft)' : 'var(--color-error-soft)',
                color: displayFeedback.correct ? '#0E5A3D' : '#7A1F1F',
              }}
            >
              <p className="font-semibold mb-1">
                {displayFeedback.correct ? '✓ Correct' : '✗ Not quite'}
              </p>
              {displayFeedback.explanation && (
                <p className="text-xs opacity-80 leading-relaxed">{displayFeedback.explanation}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className="rounded-xl border px-6 py-3 text-sm font-medium transition-colors hover:bg-[var(--color-line-soft)] disabled:opacity-30"
          style={{ borderColor: 'var(--color-line)' }}
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-30"
          style={{ background: 'var(--color-ink)' }}
        >
          {isReviewing && viewIndex < history.length - 1 ? 'Next →' : (
            <>
              Next Question <span style={{ color: 'var(--color-accent)' }}>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
