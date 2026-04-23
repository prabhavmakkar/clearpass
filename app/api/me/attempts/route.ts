import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAttemptsByUser } from '@/lib/queries'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const attempts = await getAttemptsByUser(Number(session.user.id))
  return NextResponse.json({ attempts })
}
