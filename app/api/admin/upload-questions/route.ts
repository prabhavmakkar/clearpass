import { NextResponse } from 'next/server'
import { parseQuestionsCsv } from '@/lib/csvParser'
import { insertQuestion } from '@/lib/queries'
import { nanoid } from 'nanoid'

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-admin-password')
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const text = await file.text()
    const questions = parseQuestionsCsv(text)

    let inserted = 0
    for (const q of questions) {
      await insertQuestion({
        id: `bank-${nanoid(8)}`,
        chapterId: q.chapterId,
        difficulty: q.difficulty,
        stem: q.stem,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation,
        icaiReference: q.icaiReference,
        source: 'bank',
      })
      inserted++
    }

    return NextResponse.json({ message: 'Questions uploaded', count: inserted })
  } catch (err) {
    console.error('[admin/upload-questions]', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
