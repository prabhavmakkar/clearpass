import { NextResponse } from 'next/server'
import { assembleTest, cacheSession } from '@/lib/testEngine'
import type { ClientQuestion } from '@/lib/types'
import { nanoid } from 'nanoid'

export async function GET(request: Request) {
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
