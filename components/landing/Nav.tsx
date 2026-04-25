'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const NAV_LINKS = [
  { href: '/select', label: 'Test Yourself' },
  { href: '/practice', label: 'Practice' },
  { href: '/history', label: 'History' },
]

export default function Nav() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-black tracking-tight">ClearPass</span>

        {session ? (
          <>
            {/* Desktop nav */}
            <div className="hidden items-center gap-4 md:flex">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="text-sm font-medium text-gray-500 transition-colors hover:text-black">
                  {l.label}
                </Link>
              ))}
              <a
                href="https://t.me/ClearpassCAbot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 transition-colors hover:text-black"
                title="Practice on Telegram"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
              <Link
                href="/profile"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white"
                title="Profile"
              >
                {session.user?.name?.[0]?.toUpperCase() ?? '?'}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <div className="flex items-center gap-3 md:hidden">
              <Link
                href="/profile"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white"
              >
                {session.user?.name?.[0]?.toUpperCase() ?? '?'}
              </Link>
              <button
                onClick={() => setOpen(!open)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                {open ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </>
        ) : (
          <a
            href="/sign-in"
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
          >
            Sign In
          </a>
        )}
      </div>

      {/* Mobile dropdown */}
      {session && open && (
        <div className="border-t border-gray-100 bg-white px-6 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {l.label}
              </Link>
            ))}
            <a
              href="https://t.me/ClearpassCAbot"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Practice on Telegram
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
