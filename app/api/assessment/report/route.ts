import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { verifySession } from '@/lib/sessionToken'
import { calculateChapterScores, getSectionScores, calculateReadinessScore, calculateOverallScore } from '@/lib/scoring'
import { getChaptersByIds, getSections, getQuestionsByIds, insertAttempt } from '@/lib/queries'
import { generateReport } from '@/lib/gemini'
import { nanoid } from 'nanoid'
import type { AssessmentReport, QuestionReview, StudyPlan } from '@/lib/types'

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

  const fullQuestions = await getQuestionsByIds(questions.map(q => q.id))
  const questionMap = new Map(fullQuestions.map(q => [q.id, q]))
  const chapterNameMap = new Map(relevantChapters.map(c => [c.id, c.name]))

  const questionReview: QuestionReview[] = questions.map((q, i) => {
    const full = questionMap.get(q.id)
    return {
      stem: full?.stem ?? '',
      options: full?.options ?? ['', '', '', ''],
      userAnswer: body.answers[i],
      correctIndex: q.correctIndex,
      isCorrect: body.answers[i] === q.correctIndex,
      explanation: full?.explanation ?? '',
      chapterName: chapterNameMap.get(q.chapterId) ?? '',
      difficulty: full?.difficulty ?? 'medium',
    }
  })

  const attemptId = nanoid(12)
  const report: AssessmentReport = {
    sessionId,
    attemptId,
    readinessScore,
    overallScore: overall.percentage,
    correctCount: overall.correct,
    totalCount: overall.total,
    chapterScores,
    sectionScores,
    weaknessAnalysis,
    studyPlan,
    questionReview,
    generatedAt: new Date().toISOString(),
  }

  const session = await auth()
  if (session?.user?.id) {
    try {
      await insertAttempt({
        id: attemptId,
        userId: Number(session.user.id),
        subjectId,
        scope: { sectionIds: Array.from(sectionIds), chapterIds },
        overallScore: overall.percentage,
        readinessScore: readinessScore.score,
        readinessTier: readinessScore.tier,
        correctCount: overall.correct,
        totalCount: overall.total,
        chapterScores,
        sectionScores,
        questionReview,
        weaknessAnalysis,
        studyPlan: studyPlan as unknown as Record<string, unknown>,
        createdAt: report.generatedAt,
      })
    } catch (err) {
      console.error('[assessment/report] Failed to persist attempt:', err)
    }
  }

  return NextResponse.json({ report })
}
