import { NextResponse } from 'next/server'
import { parseSyllabusCsv } from '@/lib/csvParser'
import { insertSubject, insertSection, insertChapter } from '@/lib/queries'

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
    const { subjects, sections, chapters } = parseSyllabusCsv(text)

    for (const s of subjects) await insertSubject(s.id, s.name)
    for (const s of sections) await insertSection(s)
    for (const c of chapters) await insertChapter(c)

    return NextResponse.json({
      message: 'Syllabus uploaded',
      counts: { subjects: subjects.length, sections: sections.length, chapters: chapters.length },
    })
  } catch (err) {
    console.error('[admin/upload-syllabus]', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
