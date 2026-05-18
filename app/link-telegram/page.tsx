import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { consumeTelegramLinkCode, linkTelegramId } from '@/lib/queries'
import { AppNav } from '@/components/AppNav'

export const dynamic = 'force-dynamic'

export default async function LinkTelegramPage({ searchParams }: { searchParams: Promise<{ code?: string; tgId?: string }> }) {
  const session = await auth()
  const params = await searchParams

  if (!session?.user?.id) {
    const callbackUrl = `/link-telegram?code=${params.code ?? ''}&tgId=${params.tgId ?? ''}`
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  if (!params.code || !params.tgId) {
    return (
      <main className="min-h-screen">
        <AppNav />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="card p-8">
            <p className="eyebrow mb-2">Link error</p>
            <h1 className="font-display text-2xl mb-2">Invalid link</h1>
            <p className="text-sm text-[var(--color-muted)]">
              Please use the link from the Telegram bot — send /start to the bot to get a fresh one.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const userId = await consumeTelegramLinkCode(params.code)
  if (!userId || userId !== Number(session.user.id)) {
    return (
      <main className="min-h-screen">
        <AppNav />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="card p-8">
            <p className="eyebrow mb-2">Link expired</p>
            <h1 className="font-display text-2xl mb-2">Try again</h1>
            <p className="text-sm text-[var(--color-muted)]">
              This link has expired or doesn&apos;t match your account. Go back to the Telegram bot and send /start for a new one.
            </p>
          </div>
        </div>
      </main>
    )
  }

  await linkTelegramId(userId, Number(params.tgId))

  return (
    <main className="min-h-screen">
      <AppNav />
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="card p-8">
          <div
            className="mx-auto mb-4 h-14 w-14 rounded-full flex items-center justify-center text-2xl text-white"
            style={{ background: 'var(--color-success)' }}
          >
            ✓
          </div>
          <p className="eyebrow mb-2">All set</p>
          <h1 className="font-display text-3xl mb-3">Telegram linked.</h1>
          <p className="mb-6 text-sm text-[var(--color-muted)] leading-relaxed">
            Your Telegram account is now connected to ClearPass.
            Go back to Telegram and send <span className="font-mono">/practice</span> to start.
          </p>
          <a
            href="https://t.me/ClearpassCAbot"
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-ink)' }}
          >
            Back to Telegram
            <span style={{ color: 'var(--color-accent)' }}>→</span>
          </a>
        </div>
      </div>
    </main>
  )
}
