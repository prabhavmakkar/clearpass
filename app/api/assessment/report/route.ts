import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/sessionToken'
import { calculateChapterScores, getSectionScores, calculateReadinessScore, calculateOverallScore } from '@/lib/scoring'
import { getChaptersByIds, getSections } from '@/lib/queries'
import { generateReport } from '@/lib/gemini'
import type { AssessmentReport, StudyPlan } from '@/lib/types'

const FALLBACK_PLAN: StudyPlan = {
  weekSummary: 'Focus on your weakest chapters this week.',
  days: Array.from({ length: 7 }, (_, i) => ({
    day: i + 1, focus: 'Revision', tasks: ['Review chapter notes', 'Practice MCQs'], estimatedHours: 2,
  })),
  priorityChapters: [],
}

export async function POST(request: Request) {
  let body: { sessionToken: string; answers: (number | null)[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.sessionToken || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: 'sessionToken and answers required' }, { status: 400 })
  }

  let sessionPayload: { sessionId: string; questions: { id: string; chapterId: string; correctIndex: number }[] }
  try {
    sessionPayload = verifySession(body.sessionToken)
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  const { sessionId, questions } = sessionPayload
  if (body.answers.length !== questions.length) {
    return NextResponse.json({ error: 'Answer count mismatch' }, { status: 422 })
  }

  const scorable = questions.map(q => ({ chapterId: q.chapterId, correctIndex: q.correctIndex }))

  const chapterIds = [...new Set(scorable.map(q => q.chapterId))]
  const relevantChapters = await getChaptersByIds(chapterIds)

  if (relevantChapters.length === 0) {
    return NextResponse.json({ error: 'Chapters not found — content may have been removed' }, { status: 404 })
  }

  const subjectId = relevantChapters[0].subjectId
  const allSections = await getSections(subjectId)
  const sectionIds = new Set(relevantChapters.map(c => c.sectionId))
  const relevantSections = allSections.filter(s => sectionIds.has(s.id))

  const chapterScores = calculateChapterScores(scorable, body.answers, relevantChapters)
  const sectionScores = getSectionScores(chapterScores, relevantSections)
  const readinessScore = calculateReadinessScore(chapterScores, relevantChapters)
  const overall = calculateOverallScore(scorable, body.answers)

  let weaknessAnalysis = ''
  let studyPlan: StudyPlan = {
    ...FALLBACK_PLAN,
    priorityChapters: chapterScores.filter(s => s.tier === 'weak').map(s => s.chapterId),
  }

  try {
    const aiOutput = await generateReport(chapterScores, readinessScore.score)
    weaknessAnalysis = aiOutput.weaknessAnalysis
    studyPlan = aiOutput.studyPlan
  } catch (err) {
    console.error('[assessment/report] Gemini failed:', err)
  }

  const report: AssessmentReport = {
    sessionId,
    readinessScore,
    overallScore: overall.percentage,
    correctCount: overall.correct,
    totalCount: overall.total,
    chapterScores,
    sectionScores,
    weaknessAnalysis,
    studyPlan,
    generatedAt: new Date().toISOString(),
  }

  return NextResponse.json({ report })
}
