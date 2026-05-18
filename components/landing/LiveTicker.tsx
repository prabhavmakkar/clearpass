'use client'

import { useEffect, useRef } from 'react'

// Drift-counter that ticks numbers up slowly. Numbers are illustrative —
// when we wire to /api/me/stats they can be sourced from Neon directly.
const BASE = { questions: 12847, students: 1284, reports: 6431 }
const RATE = { questions: 4, students: 0.04, reports: 0.3 } // increments per second

export default function LiveTicker() {
  const qRef = useRef<HTMLSpanElement | null>(null)
  const sRef = useRef<HTMLSpanElement | null>(null)
  const rRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    let start = 0
    let raf = 0
    function tick(ts: number) {
      if (!start) start = ts
      const elapsed = (ts - start) / 1000
      if (qRef.current) qRef.current.textContent = Math.floor(BASE.questions + elapsed * RATE.questions).toLocaleString()
      if (sRef.current) sRef.current.textContent = Math.floor(BASE.students + elapsed * RATE.students).toLocaleString()
      if (rRef.current) rRef.current.textContent = Math.floor(BASE.reports + elapsed * RATE.reports).toLocaleString()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="py-5 border-y"
      style={{ borderColor: 'var(--color-line)', background: 'rgba(255,255,255,0.5)' }}
    >
      <div className="mx-auto max-w-6xl px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
          <span ref={qRef} className="font-mono text-base font-bold">12,847</span>
          <span className="text-[var(--color-muted)]">questions answered today</span>
        </div>
        <div className="hidden md:block text-[var(--color-line)]">·</div>
        <div className="flex items-center gap-2">
          <span ref={sRef} className="font-mono text-base font-bold">1,284</span>
          <span className="text-[var(--color-muted)]">students prepping for May &apos;26</span>
        </div>
        <div className="hidden md:block text-[var(--color-line)]">·</div>
        <div className="flex items-center gap-2">
          <span ref={rRef} className="font-mono text-base font-bold">6,431</span>
          <span className="text-[var(--color-muted)]">readiness reports generated</span>
        </div>
      </div>
    </div>
  )
}
