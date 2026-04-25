import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { insertFeedback } from '@/lib/queries'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { attemptId, rating, comment } = body

  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
  }

  await insertFeedback(
    Number(session.user.id),
    attemptId ?? null,
    rating,
    typeof comment === 'string' && comment.trim() ? comment.trim() : null
  )

  return NextResponse.json({ ok: true })
}
