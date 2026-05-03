import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getQuestionsForChapters, getAccessibleChapterIds, getSubjectForChapter } from '@/lib/queries'
import type { ClientQuestion } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chapterId = searchParams.get('chapter')
  if (!chapterId) return NextResponse.json({ error: 'chapter param required' }, { status: 400 })

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessible = await getAccessibleChapterIds(Number(session.user.id))
  if (!accessible.has(chapterId)) {
    const subject = await getSubjectForChapter(chapterId)
    return NextResponse.json(
      {
        error: 'subject_not_purchased',
        subjectId: subject?.id ?? null,
        subjectName: subject?.name ?? null,
      },
      { status: 403 }
    )
  }

  try {
    const questions = await getQuestionsForChapters([chapterId])
    if (questions.length === 0) return NextResponse.json({ error: 'No questions for this chapter' }, { status: 404 })

    const clientQuestions: ClientQuestion[] = questions.map(
      ({ correctIndex, explanation, ...rest }) => rest
    )

    const answerKey = Object.fromEntries(questions.map(q => [q.id, { correctIndex: q.correctIndex, explanation: q.explanation }]))

    return NextResponse.json({ questions: clientQuestions, answerKey })
  } catch (err) {
    console.error('[/api/practice/questions]', err)
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
  }
}
