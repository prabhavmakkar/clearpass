'use client'

import { useState } from 'react'

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

export function FeedbackCard({ attemptId }: { attemptId?: string }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const storageKey = attemptId ? `feedback_${attemptId}` : null

  if (dismissed) return null
  if (storageKey && typeof window !== 'undefined' && localStorage.getItem(storageKey)) return null

  if (submitted) {
    return (
      <div
        className="my-6 rounded-2xl p-6 text-center"
        style={{ background: 'var(--color-success-soft)', border: '1px solid #BEDFCF' }}
      >
        <p className="text-sm font-semibold" style={{ color: '#0E5A3D' }}>Thanks for your feedback!</p>
        <p className="mt-1 text-xs" style={{ color: '#0E5A3D', opacity: 0.7 }}>
          It helps us make ClearPass better for everyone.
        </p>
      </div>
    )
  }

  async function handleSubmit() {
    if (rating === 0) return
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attemptId ?? null, rating, comment: comment.trim() || null }),
      })
      if (storageKey) localStorage.setItem(storageKey, '1')
      setSubmitted(true)
    } catch {
      // silently fail
    }
  }

  return (
    <div className="my-6 card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-1">Feedback</p>
          <p className="text-base font-display">How was your experience?</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Your feedback helps us improve ClearPass.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || rating)
          return (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110"
              aria-label={`${star} star — ${STAR_LABELS[star - 1]}`}
            >
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill={filled ? 'var(--color-accent)' : 'var(--color-line)'}
                style={{ color: filled ? 'var(--color-accent)' : 'var(--color-line)' }}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          )
        })}
        {rating > 0 && (
          <span className="ml-2 text-xs text-[var(--color-muted)]">{STAR_LABELS[rating - 1]}</span>
        )}
      </div>

      {rating > 0 && (
        <div className="mt-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any suggestions? (optional)"
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border bg-paper px-3 py-2 text-sm placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[#C7C0AF]"
            style={{ borderColor: 'var(--color-line)' }}
          />
          <button
            onClick={handleSubmit}
            className="mt-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-ink)' }}
          >
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  )
}
