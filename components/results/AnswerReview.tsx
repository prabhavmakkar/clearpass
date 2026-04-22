'use client'
import { useState } from 'react'
import type { QuestionReview } from '@/lib/types'

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
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
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black">Answer Review</h2>
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

      <div className="space-y-4">
        {filtered.map((q, i) => (
          <div key={i} className={`rounded-xl border p-5 ${q.isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
              <span className="capitalize">{q.difficulty}</span>
              <span>·</span>
              <span>{q.chapterName}</span>
            </div>
            <p className="mb-3 text-sm font-medium text-gray-900">{q.stem}</p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => {
                const isUserPick = q.userAnswer === oi
                const isCorrect = q.correctIndex === oi
                let className = 'rounded-lg border px-3 py-2 text-xs'

                if (isCorrect) {
                  className += ' border-green-300 bg-green-50 text-green-800 font-semibold'
                } else if (isUserPick && !isCorrect) {
                  className += ' border-red-300 bg-red-50 text-red-700 line-through'
                } else {
                  className += ' border-gray-100 text-gray-500'
                }

                return (
                  <div key={oi} className={className}>
                    <span className="mr-2 font-bold">{OPTION_LABELS[oi]}</span>
                    {opt}
                    {isCorrect && <span className="ml-2">✓</span>}
                    {isUserPick && !isCorrect && <span className="ml-2">✗</span>}
                  </div>
                )
              })}
            </div>
            {q.explanation && (
              <p className="mt-3 rounded-lg bg-white/60 p-3 text-xs text-gray-600">
                <span className="font-semibold">Explanation:</span> {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
