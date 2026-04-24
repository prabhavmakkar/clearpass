import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createTelegramLinkCode } from '@/lib/queries'
import { nanoid } from 'nanoid'

const APP_URL = process.env.AUTH_URL ?? 'https://clearpass.snpventures.in'

export async function GET(req: Request) {
  const session = await auth()
  const url = new URL(req.url)
  const tgId = url.searchParams.get('tgId')

  if (!session?.user?.id || !tgId) {
    return NextResponse.redirect(`${APP_URL}/sign-in`)
  }

  const code = nanoid(20)
  await createTelegramLinkCode(Number(session.user.id), code)

  return NextResponse.redirect(
    `${APP_URL}/link-telegram?code=${code}&tgId=${tgId}`
  )
}
