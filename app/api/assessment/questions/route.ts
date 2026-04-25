import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getQuestionsForChapters, getChaptersByIds, getFreeChapterIds, getUserPurchasedChapterIds } from '@/lib/queries'
import { signSession } from '@/lib/sessionToken'
import { nanoid } from 'nanoid'
import type { ClientQuestion, Question, Chapter } from '@/lib/types'

const ASSESSMENT_TARGET = 20

// Proportional allocation by `examWeightPercent`, floor-rounded, remainders distributed
// by descending fractional part. Chapters with no questions contribute 0.
function allocateSlotsByWeight(
  chapters: Chapter[],
  questionsByChapter: Map<string, Question[]>,
  target: number
): Map<string, number> {
  const eligible = chapters.filter(c => (questionsByChapter.get(c.id)?.length ?? 0) > 0)
  if (eligible.length === 0) return new Map()

  const totalWeight = eligible.reduce((sum, c) => sum + (c.examWeightPercent || 1), 0)
  const raw = eligible.map(c => {
    const weight = c.examWeightPercent || 1
    const ideal = (weight / totalWeight) * target
    const available = questionsByChapter.get(c.id)!.length
    return { id: c.id, ideal, available }
  })

  // First pass: floor allocation, capped at available
  const allocation = new Map<string, number>()
  let assigned = 0
  for (const r of raw) {
    const n = Math.min(Math.floor(r.ideal), r.available)
    allocation.set(r.id, n)
    assigned += n
  }

  // Distribute remaining slots by descending fractional part, still capped at availability
  const remaining = target - assigned
  if (remaining > 0) {
    const sorted = [...raw]
      .map(r => ({ ...r, frac: r.ideal - Math.floor(r.ideal), current: allocation.get(r.id)! }))
      .sort((a, b) => b.frac - a.frac)

    let left = remaining
    for (const r of sorted) {
      if (left === 0) break
      if (r.current < r.available) {
        allocation.set(r.id, r.current + 1)
        left--
      }
    }
    // Second sweep: if some chapters hit availability cap, spread leftover to any chapter with room
    if (left > 0) {
      for (const r of sorted) {
        while (left > 0 && (allocation.get(r.id)! < r.available)) {
          allocation.set(r.id, allocation.get(r.id)! + 1)
          left--
        }
      }
    }
  }

  return allocation
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chapterIds = searchParams.get('chapters')?.split(',').filter(Boolean) ?? []

  if (chapterIds.length === 0) {
    return NextResponse.json({ error: 'chapters param required' }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [freeIds, purchasedIds] = await Promise.all([
    getFreeChapterIds(),
    getUserPurchasedChapterIds(Number(session.user.id)),
  ])
  const accessibleSet = new Set([...freeIds, ...purchasedIds])
  const blocked = chapterIds.filter(id => !accessibleSet.has(id))
  if (blocked.length > 0) {
    return NextResponse.json({ error: 'Some chapters require purchase' }, { status: 403 })
  }

  try {
    const [allQuestions, chapters] = await Promise.all([
      getQuestionsForChapters(chapterIds),
      getChaptersByIds(chapterIds),
    ])

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions found for selected chapters' }, { status: 404 })
    }

    // Group randomised questions by chapter (already ORDER BY random() from query)
    const questionsByChapter = new Map<string, Question[]>()
    for (const q of allQuestions) {
      const arr = questionsByChapter.get(q.chapterId) ?? []
      arr.push(q)
      questionsByChapter.set(q.chapterId, arr)
    }

    const effectiveTarget = Math.min(ASSESSMENT_TARGET, allQuestions.length)
    const allocation = allocateSlotsByWeight(chapters, questionsByChapter, effectiveTarget)

    const selected: Question[] = []
    for (const [chapterId, count] of allocation.entries()) {
      const pool = questionsByChapter.get(chapterId) ?? []
      selected.push(...pool.slice(0, count))
    }

    // Final shuffle so the assessment doesn't appear chapter-grouped to the student
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[selected[i], selected[j]] = [selected[j], selected[i]]
    }

    const sessionId = nanoid()
    const sessionToken = signSession(
      sessionId,
      selected.map(q => ({ id: q.id, chapterId: q.chapterId, correctIndex: q.correctIndex }))
    )

    const clientQuestions: ClientQuestion[] = selected.map(
      ({ correctIndex, explanation, ...rest }) => rest
    )

    return NextResponse.json({ sessionId, sessionToken, questions: clientQuestions })
  } catch (err) {
    console.error('[/api/assessment/questions]', err)
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
  }
}
