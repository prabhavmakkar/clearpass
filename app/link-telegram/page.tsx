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
      <main className="min-h-screen bg-white">
        <AppNav />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <p className="text-sm text-red-500">Invalid link. Please use the link from the Telegram bot.</p>
        </div>
      </main>
    )
  }

  const userId = await consumeTelegramLinkCode(params.code)
  if (!userId || userId !== Number(session.user.id)) {
    return (
      <main className="min-h-screen bg-white">
        <AppNav />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <p className="text-sm text-red-500">Link expired or invalid. Please try again from the Telegram bot with /start.</p>
        </div>
      </main>
    )
  }

  await linkTelegramId(userId, Number(params.tgId))

  return (
    <main className="min-h-screen bg-white">
      <AppNav />
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h1 className="mb-2 text-2xl font-black">Telegram Linked!</h1>
        <p className="mb-6 text-sm text-gray-500">
          Your Telegram account is now connected to ClearPass.
          Go back to Telegram and send /practice to start.
        </p>
        <a href="https://t.me/ClearpassCAbot" className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white hover:opacity-80">
          Back to Telegram
        </a>
      </div>
    </main>
  )
}
