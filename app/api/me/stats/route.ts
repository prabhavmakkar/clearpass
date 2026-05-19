import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAttemptsForStats, userOwnsCaFinalBundle } from '@/lib/queries'
import { deriveStats } from '@/lib/derivedStats'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = Number(session.user.id)
  const [attempts, ownsBundle] = await Promise.all([
    getAttemptsForStats(userId),
    userOwnsCaFinalBundle(userId),
  ])

  const stats = deriveStats({ attempts, ownsBundle })
  return NextResponse.json({ stats })
}
