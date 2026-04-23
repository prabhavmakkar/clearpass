import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAttemptById } from '@/lib/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const attempt = await getAttemptById(id, Number(session.user.id))
  if (!attempt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ attempt })
}
