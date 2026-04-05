interface Props {
  answeredCount: number
  totalCount: number
  onSubmit: () => void
  isSubmitting: boolean
}

export function SubmitButton({ answeredCount, totalCount, onSubmit, isSubmitting }: Props) {
  const allAnswered = answeredCount === totalCount
  const remaining = totalCount - answeredCount
  return (
    <div className="mt-8 text-center">
      {!allAnswered && (
        <p className="mb-3 text-sm text-gray-500">
          {remaining} question{remaining !== 1 ? 's' : ''} remaining
        </p>
      )}
      <button
        onClick={onSubmit}
        disabled={!allAnswered || isSubmitting}
        className="rounded-xl bg-black px-10 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? 'Submitting…' : 'Submit Test →'}
      </button>
    </div>
  )
}
