import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/sessionToken'
import { calculateNodeScores, calculateOverallScore } from '@/lib/scoring'
import { generateReport } from '@/lib/gemini'
import type { TestReport, StudyPlan } from '@/lib/types'

interface ReportRequest {
  sessionToken: string
  topic: string
  answers: (number | null)[]
}

const FALLBACK_STUDY_PLAN: StudyPlan = {
  weekSummary: 'Focus on your weakest chapters this week.',
  days: Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    focus: 'Revision',
    tasks: ['Review chapter notes', 'Practice MCQs'],
    estimatedHours: 2,
  })),
  priorityNodes: [],
}

export async function POST(request: Request) {
  let body: ReportRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sessionToken, answers } = body

  if (!sessionToken || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'sessionToken and answers are required' }, { status: 400 })
  }

  // Verify the signed token — no shared memory or DB needed
  let sessionPayload: { sessionId: string; questions: { id: string; nodeId: string; correctIndex: number }[] }
  try {
    sessionPayload = verifySession(sessionToken)
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired session. Please restart the test.' },
      { status: 401 }
    )
  }

  const { sessionId, questions } = sessionPayload

  if (answers.length !== questions.length) {
    return NextResponse.json(
      { error: `Answer count ${answers.length} does not match question count ${questions.length}` },
      { status: 422 }
    )
  }

  const nodeScores = calculateNodeScores(questions, answers)
  const overallScore = calculateOverallScore(questions, answers)
  const correctCount = questions.filter((q, i) => answers[i] === q.correctIndex).length

  let weaknessAnalysis = ''
  let studyPlan: StudyPlan = {
    ...FALLBACK_STUDY_PLAN,
    priorityNodes: nodeScores.filter(s => s.tier === 'weak').map(s => s.nodeId),
  }

  // Attempt Gemini report — degrade gracefully on failure
  try {
    const aiOutput = await generateReport(nodeScores, overallScore)
    weaknessAnalysis = aiOutput.weaknessAnalysis
    studyPlan = aiOutput.studyPlan
  } catch (err) {
    console.error('[/api/report] Gemini failed, returning stub report:', err)
  }

  const report: TestReport = {
    sessionId,
    overallScore,
    correctCount,
    totalCount: questions.length,
    nodeScores,
    weaknessAnalysis,
    studyPlan,
    generatedAt: new Date().toISOString(),
  }

  return NextResponse.json({ report })
}
