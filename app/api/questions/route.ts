import { NextResponse } from 'next/server'
import { assembleTest, cacheSession } from '@/lib/testEngine'
import type { ClientQuestion } from '@/lib/types'
import { nanoid } from 'nanoid'

// Simple in-memory rate limiter: max 10 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (entry.count >= 10) return true
  entry.count++
  return false
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic')

  if (!topic) {
    return NextResponse.json({ error: 'topic param required' }, { status: 400 })
  }

  if (topic !== 'ca-inter-audit') {
    return NextResponse.json({ error: `Unknown topic: ${topic}` }, { status: 400 })
  }

  try {
    const questions = await assembleTest(topic)
    const sessionId = nanoid()

    // Cache full questions (with correctIndex) server-side keyed by sessionId
    cacheSession(sessionId, questions)

    // Strip answer key before sending to client
    const clientQuestions: ClientQuestion[] = questions.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ correctIndex: _, explanation: __, ...rest }) => rest
    )

    return NextResponse.json({ sessionId, questions: clientQuestions })
  } catch (err) {
    console.error('[/api/questions]', err)
    return NextResponse.json({ error: 'Failed to assemble test' }, { status: 500 })
  }
}
