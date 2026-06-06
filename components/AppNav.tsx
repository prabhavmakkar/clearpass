'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useStats } from '@/hooks/useStats'

const NAV_LINKS = [
  { href: '/select', label: 'Test Yourself' },
  // Practice is adaptive per-chapter, so it must start from the topic selector
  // (each chapter has a "Practice →" button). Link here routes through /select.
  { href: '/select', label: 'Practice' },
  { href: '/history', label: 'History' },
]

export function AppNav({ label }: { label?: string }) {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const { stats } = useStats()
  const streak = stats?.streak.current ?? 0

  return (
    <nav
      className="sticky top-0 z-10 border-b backdrop-blur-sm"
      style={{ borderColor: 'var(--color-line)', background: 'rgba(250,248,242,0.85)' }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-6 w-6 rounded-full relative" style={{ background: 'var(--color-ink)' }}>
            <span className="absolute inset-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
          </span>
          <span className="font-display text-xl leading-none">ClearPass</span>
          {label && (
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)] sm:inline-block ml-3">
              {label}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Daily streak chip — real data via useStats() */}
          {session && streak > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper border text-xs"
              style={{ borderColor: 'var(--color-line)' }}
              title="Daily practice streak"
            >
              <span className="fire">🔥</span>
              <span className="font-mono font-bold">{streak}</span>
              <span className="text-[var(--color-muted)]">day streak</span>
            </div>
          )}
          <Link href="/select" className="px-3 py-1.5 rounded-full text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors">
            Tests
          </Link>
          <Link href="/history" className="px-3 py-1.5 rounded-full text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors">
            History
          </Link>
          <a
            href="https://t.me/ClearpassCAbot"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            title="Practice on Telegram"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-line-soft)]" />
          ) : session ? (
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: 'var(--color-navy)' }}
            >
              {session.user?.name?.[0]?.toUpperCase() ?? '?'}
            </Link>
          ) : (
            <a
              href="/sign-in"
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:border-[#C7C0AF] transition-colors"
              style={{ borderColor: 'var(--color-line)' }}
            >
              Sign in
            </a>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          {status !== 'loading' && session && (
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: 'var(--color-navy)' }}
            >
              {session.user?.name?.[0]?.toUpperCase() ?? '?'}
            </Link>
          )}
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
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t bg-paper px-6 pb-4 md:hidden" style={{ borderColor: 'var(--color-line)' }}>
          {session && streak > 0 && (
            <div
              className="my-3 flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--color-bg)] text-xs w-fit"
            >
              <span className="fire">🔥</span>
              <span className="font-mono font-bold">{streak}</span>
              <span className="text-[var(--color-muted)]">day streak</span>
            </div>
          )}
          <div className="flex flex-col gap-1 pt-1">
            {NAV_LINKS.map(l => (
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
            {!session && status !== 'loading' && (
              <a
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
