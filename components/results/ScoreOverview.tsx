'use client'

import { useEffect, useRef } from 'react'
import type { ReadinessScore } from '@/lib/types'

interface Props {
  overallScore: number
  correctCount: number
  totalCount: number
  readinessScore?: ReadinessScore
}

export function ScoreOverview({ overallScore, correctCount, totalCount, readinessScore }: Props) {
  const displayScore = readinessScore?.score ?? overallScore
  const r = 42
  const circumference = 2 * Math.PI * r
  const filled = (displayScore / 100) * circumference
  const color = displayScore >= 70 ? 'var(--color-success)' : displayScore >= 40 ? 'var(--color-warning)' : 'var(--color-error)'
  const labelColor = displayScore >= 70 ? '#0E5A3D' : displayScore >= 40 ? '#7A5A0F' : '#7A1F1F'

  const scoreTextRef = useRef<SVGTextElement | null>(null)

  // Animated count-up
  useEffect(() => {
    const initial = scoreTextRef.current
    if (!initial) return
    initial.textContent = '0%'
    const start = performance.now()
    const dur = 1400
    let raf = 0
    function step(now: number) {
      const node = scoreTextRef.current
      if (!node) return
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = Math.round(eased * displayScore)
      node.textContent = v + '%'
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [displayScore])

  return (
    <div className="card p-8 md:p-12 mb-6 relative overflow-hidden">
      <div
        className="absolute -top-20 -right-20 h-72 w-72 rounded-full"
        style={{ background: `radial-gradient(circle, rgba(217,80,30,0.10), transparent 70%)` }}
      />

      <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-10 items-center relative">
        <div className="flex justify-center md:justify-start">
          <svg width="200" height="200" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#ECE6D7" strokeWidth="6" />
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference - filled}`}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.2,.8,.2,1)' }}
            />
            <text
              ref={scoreTextRef}
              x="50" y="56" textAnchor="middle"
              className="font-mono"
              fontSize="22" fontWeight="700" fill="var(--color-ink)"
            >
              0%
            </text>
          </svg>
        </div>

        <div>
          <p className="eyebrow mb-1">Readiness report</p>
          {readinessScore && (
            <h2 className="font-display text-4xl md:text-5xl leading-tight mb-3">
              You&apos;re <span style={{ color: labelColor }}>{readinessScore.label.toLowerCase()}</span>.
            </h2>
          )}
          <p className="text-base leading-relaxed text-[var(--color-ink-soft)] max-w-md">
            {correctCount} correct out of {totalCount} questions.
            {readinessScore && (
              <span className="block text-xs text-[var(--color-muted)] mt-1.5">
                Weighted by ICAI exam mark allocation
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
