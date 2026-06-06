import Link from 'next/link'

const productLinks = [
  { label: 'Home', href: '/' },
  { label: 'Test Yourself', href: '/select' },
  // Practice starts from the topic selector (per-chapter "Practice →").
  { label: 'Practice', href: '/select' },
  { label: 'History', href: '/history' },
]

const resourceLinks = [
  { label: 'Telegram Bot', href: 'https://t.me/ClearpassCAbot', external: true },
  { label: 'Help', href: '/help' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Refund Policy', href: '/refund' },
]

export default function Footer() {
  return (
    <footer
      className="border-t px-6 pb-8 pt-14"
      style={{ borderColor: 'var(--color-line)', background: 'var(--color-bg)' }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full relative" style={{ background: 'var(--color-ink)' }}>
                <span className="absolute inset-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
              </span>
              <span className="font-display text-2xl leading-none">ClearPass</span>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)] max-w-[200px]">
              CA prep, finally done right.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Product
            </h3>
            <ul className="space-y-2">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Resources
            </h3>
            <ul className="space-y-2">
              {resourceLinks.map((l) => (
                <li key={l.href}>
                  {l.external ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Legal
            </h3>
            <ul className="space-y-2">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 sm:flex-row"
          style={{ borderColor: 'var(--color-line)' }}
        >
          <p className="text-xs text-[var(--color-muted)]">
            Built by a CA, for CAs. &copy; {new Date().getFullYear()} ClearPass
          </p>
          <a
            href="https://t.me/ClearpassCAbot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Practice on Telegram
          </a>
        </div>
      </div>
    </footer>
  )
}
