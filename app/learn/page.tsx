import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import { getSubjects, getSections, getChapters, getQuestionCountsByChapter } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'CA Final Subjects & Chapters — Free Syllabus Index',
  description:
    'Browse the full CA Final syllabus on ClearPass — AFM, FR, Auditing & Ethics, and Indirect Tax Laws. Each subject is broken down by section and chapter, with practice MCQs available for the bundle (₹299).',
  alternates: { canonical: '/learn' },
  openGraph: {
    title: 'CA Final Subjects & Chapters — ClearPass',
    description:
      'Browse the full CA Final syllabus — AFM, FR, Audit, IDT — each subject broken down by chapter, with ICAI-style MCQs.',
    url: 'https://clearpass.snpventures.in/learn',
    type: 'website',
  },
}

export const revalidate = 3600 // Re-build hourly so newly-added chapters appear without a redeploy.

export default async function LearnIndexPage() {
  const subjects = await getSubjects()
  const finalSubjects = subjects.filter(s => s.id.startsWith('ca-final-'))

  const allSections = []
  const allSectionIds: string[] = []
  for (const s of finalSubjects) {
    const secs = await getSections(s.id)
    allSections.push(...secs)
    allSectionIds.push(...secs.map(sec => sec.id))
  }
  const [chapters, questionCounts] = await Promise.all([
    allSectionIds.length > 0 ? getChapters(allSectionIds) : Promise.resolve([]),
    getQuestionCountsByChapter(),
  ])

  const stats = finalSubjects.map(s => {
    const subChapters = chapters.filter(c => c.subjectId === s.id)
    const total = subChapters.reduce((sum, c) => sum + (questionCounts[c.id] ?? 0), 0)
    return { subject: s, chapterCount: subChapters.length, questionCount: total }
  })

  return (
    <main className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-4 text-4xl font-black tracking-tight">CA Final Syllabus & Practice Subjects</h1>
        <p className="mb-2 text-lg text-gray-600">
          Browse the full ICAI-aligned CA Final syllabus on ClearPass. Each subject below opens a list of sections and chapters with MCQ practice available.
        </p>
        <p className="mb-10 text-sm text-gray-500">
          Bundle pricing: a single ₹299 purchase unlocks every chapter across all four subjects. <Link href="/select" className="underline underline-offset-2 hover:text-black">Sign in to start practising →</Link>
        </p>

        <div className="grid gap-4">
          {stats.map(({ subject, chapterCount, questionCount }) => {
            const shortName = subject.name.replace(/^CA Final — /, '')
            return (
              <Link
                key={subject.id}
                href={`/learn/${subject.id}`}
                className="group block rounded-xl border border-gray-200 p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
              >
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-black">{shortName}</h2>
                <p className="mt-2 text-sm text-gray-500">
                  {chapterCount} chapters · {questionCount.toLocaleString('en-IN')} ICAI-style MCQs
                </p>
                <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gray-700 group-hover:text-black">
                  View syllabus
                  <span aria-hidden>→</span>
                </p>
              </Link>
            )
          })}
        </div>

        <section className="mt-12 rounded-xl bg-gray-50 px-6 py-8">
          <h2 className="text-lg font-bold text-gray-900">About ClearPass</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            ClearPass is a CA Final preparation platform built around adaptive practice and diagnostic assessments. Every chapter on the platform is mapped to its ICAI section, with explanations referencing the underlying standard or section number wherever applicable. Students take a short readiness assessment, see exactly where they're weak by chapter, and get an AI-generated study plan to close gaps before the exam.
          </p>
        </section>
      </div>
    </main>
  )
}
