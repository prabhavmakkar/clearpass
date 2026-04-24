import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createTelegramLinkCode } from '@/lib/queries'
import { nanoid } from 'nanoid'

export async function GET(req: Request) {
  const session = await auth()
  const url = new URL(req.url)
  const tgId = url.searchParams.get('tgId')

  if (!session?.user?.id || !tgId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  const code = nanoid(20)
  await createTelegramLinkCode(Number(session.user.id), code)

  return NextResponse.redirect(
    new URL(`/link-telegram?code=${code}&tgId=${tgId}`, req.url)
  )
}
