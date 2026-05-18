import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Nav from '@/components/landing/Nav'
import { getSubjects, getSections, getChapters, getQuestionCountsByChapter } from '@/lib/queries'

interface PageProps {
  params: Promise<{ subjectId: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  const subjects = await getSubjects()
  return subjects
    .filter(s => s.id.startsWith('ca-final-'))
    .map(s => ({ subjectId: s.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subjectId } = await params
  const subjects = await getSubjects()
  const subject = subjects.find(s => s.id === subjectId)
  if (!subject) return {}
  const shortName = subject.name.replace(/^CA Final — /, '')
  return {
    title: `${shortName} — CA Final Syllabus, Chapters & MCQs`,
    description: `Full CA Final ${shortName} syllabus on ClearPass. Browse every chapter, see exam weights, and practise ICAI-style MCQs. Unlock the full bundle for ₹299.`,
    alternates: { canonical: `/learn/${subjectId}` },
    openGraph: {
      title: `${shortName} — CA Final Syllabus & Practice MCQs`,
      description: `Browse the full ${shortName} chapter list and practise ICAI-aligned MCQs.`,
      url: `https://clearpass.snpventures.in/learn/${subjectId}`,
      type: 'article',
    },
  }
}

export default async function LearnSubjectPage({ params }: PageProps) {
  const { subjectId } = await params
  const subjects = await getSubjects()
  const subject = subjects.find(s => s.id === subjectId)
  if (!subject || !subject.id.startsWith('ca-final-')) notFound()

  const sections = await getSections(subject.id)
  const sectionIds = sections.map(s => s.id)
  const [chapters, questionCounts] = await Promise.all([
    sectionIds.length > 0 ? getChapters(sectionIds) : Promise.resolve([]),
    getQuestionCountsByChapter(),
  ])

  const totalQuestions = chapters.reduce((sum, c) => sum + (questionCounts[c.id] ?? 0), 0)
  const shortName = subject.name.replace(/^CA Final — /, '')

  return (
    <main className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-6 text-xs text-gray-500">
          <Link href="/learn" className="underline underline-offset-2 hover:text-black">All subjects</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{shortName}</span>
        </nav>

        <h1 className="mb-3 text-4xl font-black tracking-tight">{shortName}</h1>
        <p className="mb-2 text-base text-gray-600">CA Final · ICAI syllabus · {chapters.length} chapters · {totalQuestions.toLocaleString('en-IN')} practice MCQs</p>
        <p className="mb-10 text-sm text-gray-500">
          Every chapter below is mapped to its ICAI section. Practice each chapter individually or take a diagnostic across the whole subject.{' '}
          <Link href="/select" className="underline underline-offset-2 hover:text-black">Sign in to start practising →</Link>
        </p>

        {sections.map(section => {
          const sectionChapters = chapters.filter(c => c.sectionId === section.id)
          if (sectionChapters.length === 0) return null
          const sectionQs = sectionChapters.reduce((sum, c) => sum + (questionCounts[c.id] ?? 0), 0)
          return (
            <section key={section.id} className="mb-10">
              <h2 className="mb-1 text-xl font-bold text-gray-900">{section.name}</h2>
              <p className="mb-4 text-xs text-gray-500">
                Section weight: {Number(section.examWeightPercent || 0)}% · {sectionChapters.length} chapter{sectionChapters.length !== 1 ? 's' : ''} · {sectionQs.toLocaleString('en-IN')} questions
              </p>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {sectionChapters.map(ch => {
                  const qs = questionCounts[ch.id] ?? 0
                  return (
                    <li key={ch.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <Link
                        href={`/learn/${subject.id}/${encodeURIComponent(ch.id.split('/').pop() ?? '')}`}
                        className="min-w-0 flex-1 text-sm text-gray-800 hover:text-black"
                      >
                        {ch.name}
                      </Link>
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {qs > 0 ? `${qs} MCQs` : 'Coming soon'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        <div className="mt-12 rounded-xl bg-gray-900 px-6 py-6 text-white">
          <p className="text-sm font-bold">Practise {shortName} now</p>
          <p className="mt-1 text-xs text-gray-300">Unlock all four CA Final subjects on ClearPass for ₹299.</p>
          <Link
            href="/select"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100"
          >
            Start practising
          </Link>
        </div>
      </div>
    </main>
  )
}
