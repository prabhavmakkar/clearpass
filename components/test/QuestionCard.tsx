'use client'
import { motion } from 'framer-motion'
import type { ClientQuestion } from '@/lib/types'

interface Props {
  question: ClientQuestion
  questionNumber: number
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export function QuestionCard({ question, questionNumber, selectedIndex, onSelect }: Props) {
  const optionLabels = ['A', 'B', 'C', 'D']
  return (
    <motion.div
      key={questionNumber}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <p className="mb-7 text-base md:text-lg font-medium leading-relaxed">
        {question.stem}
      </p>
      <div className="space-y-3">
        {question.options.map((option, i) => {
          const isSelected = selectedIndex === i
          return (
            <button
              key={`${questionNumber}-${i}`}
              onClick={() => onSelect(i)}
              className="flex w-full items-start gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition-all duration-150 active:scale-[0.99]"
              style={{
                border: '1.5px solid',
                borderColor: isSelected ? 'var(--color-ink)' : 'var(--color-line)',
                background: isSelected ? 'var(--color-ink)' : 'var(--color-paper)',
                color: isSelected ? 'white' : 'var(--color-ink-soft)',
              }}
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono"
                style={{
                  border: '1.5px solid',
                  borderColor: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-muted)',
                  color: isSelected ? 'white' : 'var(--color-muted)',
                }}
              >
                {optionLabels[i]}
              </span>
              <span className="leading-snug">{option}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
