'use client'

import { useSession } from 'next-auth/react'

export default function Nav() {
  const { data: session } = useSession()

  function scrollToWaitlist() {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-black tracking-tight">ClearPass</span>
        <div className="flex items-center gap-3">
          {session ? (
            <a
              href="/select"
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-400"
            >
              Go to Dashboard
            </a>
          ) : (
            <a
              href="/sign-in"
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-400"
            >
              Sign In
            </a>
          )}
          <button
            onClick={scrollToWaitlist}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
          >
            Join Waitlist
          </button>
        </div>
      </div>
    </nav>
  )
}
