import { TestShell } from '@/components/test/TestShell'
import { assembleTest } from '@/lib/testEngine'
import { signSession } from '@/lib/sessionToken'
import type { ClientQuestion } from '@/lib/types'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

export default async function TestPage() {
  const allQuestions = await assembleTest('ca-inter-audit')
  const sessionId = nanoid()

  // Sign the answer key into a token — no shared memory needed across serverless instances
  const sessionToken = signSession(
    sessionId,
    allQuestions.map(q => ({ id: q.id, nodeId: q.nodeId, correctIndex: q.correctIndex }))
  )

  const questions: ClientQuestion[] = allQuestions.map(
    ({ correctIndex: _, explanation: __, ...rest }) => rest
  )
  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="text-base font-black">ClearPass</span>
          <span className="text-xs text-gray-500">CA Intermediate · Audit</span>
        </div>
      </nav>
      <TestShell sessionId={sessionId} sessionToken={sessionToken} questions={questions} topic="ca-inter-audit" />
    </main>
  )
}
