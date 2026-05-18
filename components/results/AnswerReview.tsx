'use client'
import { useState } from 'react'
import type { QuestionReview } from '@/lib/types'

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
      style={{
        background: active ? 'var(--color-ink)' : 'var(--color-line-soft)',
        color: active ? 'white' : 'var(--color-muted)',
      }}
    >
      {children}
    </button>
  )
}

export function AnswerReview({ questions }: { questions: QuestionReview[] }) {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct'>('all')

  const filtered = questions.filter(q => {
    if (filter === 'wrong') return !q.isCorrect
    if (filter === 'correct') return q.isCorrect
    return true
  })

  const wrongCount = questions.filter(q => !q.isCorrect).length

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="eyebrow mb-1">Answer review</p>
          <h2 className="font-display text-2xl md:text-3xl">Every question, every answer</h2>
        </div>
        <div className="flex gap-2">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            All ({questions.length})
          </FilterButton>
          <FilterButton active={filter === 'wrong'} onClick={() => setFilter('wrong')}>
            Wrong ({wrongCount})
          </FilterButton>
          <FilterButton active={filter === 'correct'} onClick={() => setFilter('correct')}>
            Correct ({questions.length - wrongCount})
          </FilterButton>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((q, i) => (
          <div
            key={i}
            className="card p-5"
            style={{
              borderColor: q.isCorrect ? '#BEDFCF' : '#F4C8B5',
              background: q.isCorrect ? 'rgba(236,246,241,0.4)' : 'rgba(251,237,236,0.4)',
            }}
          >
            <div className="mb-2 flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
              <span className="capitalize">{q.difficulty}</span>
              <span>·</span>
              <span>{q.chapterName}</span>
            </div>
            <p className="mb-3 text-sm font-medium leading-snug">{q.stem}</p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => {
                const isUserPick = q.userAnswer === oi
                const isCorrect = q.correctIndex === oi

                let style: React.CSSProperties = {
                  border: '1px solid var(--color-line)',
                  color: 'var(--color-muted)',
                }
                let extraClass = ''
                if (isCorrect) {
                  style = {
                    border: '1px solid #BEDFCF',
                    background: 'var(--color-success-soft)',
                    color: '#0E5A3D',
                    fontWeight: 600,
                  }
                } else if (isUserPick && !isCorrect) {
                  style = {
                    border: '1px solid #F4C8B5',
                    background: 'var(--color-error-soft)',
                    color: '#7A1F1F',
                  }
                  extraClass = 'line-through'
                }

                return (
                  <div key={oi} className={`rounded-lg px-3 py-2 text-xs ${extraClass}`} style={style}>
                    <span className="mr-2 font-bold font-mono">{OPTION_LABELS[oi]}</span>
                    {opt}
                    {isCorrect && <span className="ml-2">✓</span>}
                    {isUserPick && !isCorrect && <span className="ml-2">✗</span>}
                  </div>
                )
              })}
            </div>
            {q.explanation && (
              <p
                className="mt-3 rounded-lg p-3 text-xs leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.7)', color: 'var(--color-ink-soft)' }}
              >
                <span className="font-semibold">Why: </span>{q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
