import { createHmac, timingSafeEqual } from 'crypto'

// Compact question data needed for scoring — no stems/options sent
export interface SessionQuestion {
  id: string
  nodeId: string
  correctIndex: number
}

interface TokenPayload {
  sessionId: string
  questions: SessionQuestion[]
}

function secret(): string {
  const s = process.env.GEMINI_API_KEY
  if (!s) throw new Error('GEMINI_API_KEY not set')
  return s
}

export function signSession(sessionId: string, questions: SessionQuestion[]): string {
  const payload: TokenPayload = { sessionId, questions }
  const data = JSON.stringify(payload)
  const sig = createHmac('sha256', secret()).update(data).digest('hex')
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url')
}

export function verifySession(token: string): TokenPayload {
  let parsed: { data: string; sig: string }
  try {
    parsed = JSON.parse(Buffer.from(token, 'base64url').toString())
  } catch {
    throw new Error('Malformed session token')
  }
  const expected = createHmac('sha256', secret()).update(parsed.data).digest('hex')
  const a = Buffer.from(parsed.sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid session token signature')
  }
  return JSON.parse(parsed.data) as TokenPayload
}
