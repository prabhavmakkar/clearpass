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
      <p className="mb-6 text-base font-medium leading-relaxed md:text-lg">
        {question.stem}
      </p>
      <div className="space-y-3">
        {question.options.map((option, i) => {
          const isSelected = selectedIndex === i
          return (
            <button
              key={`${questionNumber}-${i}`}
              onClick={() => onSelect(i)}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all duration-150
                ${isSelected
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400'
                }`}
            >
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold
                ${isSelected ? 'border-white text-white' : 'border-gray-400 text-gray-500'}`}>
                {optionLabels[i]}
              </span>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
