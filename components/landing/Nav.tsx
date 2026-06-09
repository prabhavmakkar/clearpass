'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const NAV_LINKS = [
  { href: '/select', label: 'Test Yourself' },
  // Practice starts from the topic selector (per-chapter "Practice →").
  { href: '/select', label: 'Practice' },
  { href: '/history', label: 'History' },
  { href: '/blog', label: 'Blog' },
]

export default function Nav() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-line)] backdrop-blur-sm bg-[rgba(250,248,242,0.85)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-full relative" style={{ background: 'var(--color-ink)' }}>
            <span className="absolute inset-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
          </span>
          <span className="font-display text-2xl leading-none">ClearPass</span>
        </Link>

        {session ? (
          <>
            {/* Desktop nav */}
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex items-center gap-1 p-1 bg-paper border border-[var(--color-line)] rounded-full">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="px-4 py-1.5 rounded-full text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)] transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
              <a
                href="https://t.me/ClearpassCAbot"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 p-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
                title="Practice on Telegram"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
              <Link
                href="/profile"
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: 'var(--color-navy)' }}
                title="Profile"
              >
                {session.user?.name?.[0]?.toUpperCase() ?? '?'}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <div className="flex items-center gap-3 md:hidden">
              <Link
                href="/profile"
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: 'var(--color-navy)' }}
              >
                {session.user?.name?.[0]?.toUpperCase() ?? '?'}
              </Link>
              <button
                onClick={() => setOpen(!open)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]"
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
          <div className="flex items-center gap-4">
            <Link
              href="/blog"
              className="text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              Blog
            </Link>
            <a
              href="/sign-in"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-ink)' }}
            >
              Sign In
            </a>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      {session && open && (
        <div className="border-t border-[var(--color-line)] bg-paper px-6 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)] transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <a
              href="https://t.me/ClearpassCAbot"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)] transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Practice on Telegram
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
