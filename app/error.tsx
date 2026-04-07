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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <h1 className="text-2xl font-black">Something went wrong</h1>
      <p className="max-w-sm text-sm text-gray-500">
        We couldn&apos;t load the page. This is usually a temporary issue — try again.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white hover:opacity-80"
      >
        Try Again
      </button>
      <a href="/" className="text-xs text-gray-400 underline underline-offset-4">
        Back to home
      </a>
    </main>
  )
}
