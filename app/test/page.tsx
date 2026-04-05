import { TestShell } from '@/components/test/TestShell'
import type { ClientQuestion } from '@/lib/types'

async function getQuestions(): Promise<{ sessionId: string; questions: ClientQuestion[] }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/questions?topic=ca-inter-audit`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch questions')
  return res.json()
}

export default async function TestPage() {
  const { sessionId, questions } = await getQuestions()
  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="text-base font-black">ClearPass</span>
          <span className="text-xs text-gray-500">CA Intermediate · Audit</span>
        </div>
      </nav>
      <TestShell sessionId={sessionId} questions={questions} topic="ca-inter-audit" />
    </main>
  )
}
