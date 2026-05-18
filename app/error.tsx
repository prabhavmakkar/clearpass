'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="eyebrow">Error</p>
      <h1 className="font-display text-4xl">Something went wrong.</h1>
      <p className="max-w-sm text-sm text-[var(--color-muted)]">
        We couldn&apos;t load the page. This is usually a temporary issue — try again.
      </p>
      <button
        onClick={reset}
        className="rounded-xl px-8 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        style={{ background: 'var(--color-ink)' }}
      >
        Try again
      </button>
      <a
        href="/"
        className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-ink)]"
      >
        Back to home
      </a>
    </main>
  )
}
