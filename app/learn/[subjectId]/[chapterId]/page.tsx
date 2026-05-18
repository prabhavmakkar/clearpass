import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Nav from '@/components/landing/Nav'
import { getSubjects, getSections, getChapters, getQuestionCountsByChapter, getFreeChapterIds } from '@/lib/queries'

interface PageProps {
  params: Promise<{ subjectId: string; chapterId: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  const subjects = await getSubjects()
  const finalSubjects = subjects.filter(s => s.id.startsWith('ca-final-'))
  const params: { subjectId: string; chapterId: string }[] = []
  for (const s of finalSubjects) {
    const sections = await getSections(s.id)
    if (sections.length === 0) continue
    const chapters = await getChapters(sections.map(sec => sec.id))
    for (const ch of chapters) {
      const last = ch.id.split('/').pop()
      if (last) params.push({ subjectId: s.id, chapterId: last })
    }
  }
  return params
}

async function resolveChapter(subjectId: string, chapterShort: string) {
  const sections = await getSections(subjectId)
  if (sections.length === 0) return null
  const chapters = await getChapters(sections.map(s => s.id))
  const chapter = chapters.find(c => c.id.split('/').pop() === chapterShort)
  if (!chapter) return null
  const section = sections.find(s => s.id === chapter.sectionId)
  return section ? { chapter, section } : null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subjectId, chapterId } = await params
  const subjects = await getSubjects()
  const subject = subjects.find(s => s.id === subjectId)
  if (!subject) return {}
  const resolved = await resolveChapter(subjectId, chapterId)
  if (!resolved) return {}
  const subjectShort = subject.name.replace(/^CA Final — /, '')
  return {
    title: `${resolved.chapter.name} — CA Final ${subjectShort} MCQs`,
    description: `${resolved.chapter.name} — CA Final ${subjectShort}, ${resolved.section.name}. ICAI-aligned practice MCQs with explanations on ClearPass. ₹299 unlocks all four CA Final subjects.`,
    alternates: { canonical: `/learn/${subjectId}/${chapterId}` },
    openGraph: {
      title: `${resolved.chapter.name} — CA Final ${subjectShort}`,
      description: `Practice ${resolved.chapter.name} with ICAI-style MCQs and explanations.`,
      url: `https://clearpass.snpventures.in/learn/${subjectId}/${chapterId}`,
      type: 'article',
    },
  }
}

export default async function LearnChapterPage({ params }: PageProps) {
  const { subjectId, chapterId } = await params
  const subjects = await getSubjects()
  const subject = subjects.find(s => s.id === subjectId)
  if (!subject || !subject.id.startsWith('ca-final-')) notFound()

  const resolved = await resolveChapter(subjectId, chapterId)
  if (!resolved) notFound()

  const { chapter, section } = resolved
  const [questionCounts, freeChapterIds] = await Promise.all([
    getQuestionCountsByChapter(),
    getFreeChapterIds(),
  ])
  const questionCount = questionCounts[chapter.id] ?? 0
  const isFree = freeChapterIds.includes(chapter.id)
  const subjectShort = subject.name.replace(/^CA Final — /, '')

  return (
    <main className="min-h-screen">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-6 text-xs text-gray-500">
          <Link href="/learn" className="underline underline-offset-2 hover:text-black">Subjects</Link>
          <span className="mx-2">/</span>
          <Link href={`/learn/${subject.id}`} className="underline underline-offset-2 hover:text-black">{subjectShort}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{chapter.name}</span>
        </nav>

        <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight md:text-4xl">{chapter.name}</h1>
        <p className="mb-2 text-base text-gray-600">CA Final {subjectShort} · {section.name}</p>
        <p className="mb-8 text-sm text-gray-500">
          Chapter weight: {Number(chapter.examWeightPercent || 0)}% · {questionCount.toLocaleString('en-IN')} ICAI-aligned MCQs available · {isFree ? 'Free preview chapter' : 'Part of the ₹299 CA Final bundle'}
        </p>

        <section className="prose prose-sm max-w-none text-gray-700">
          <p>
            <strong>{chapter.name}</strong> is part of the {section.name} section in the CA Final {subjectShort} syllabus. ClearPass provides ICAI-aligned practice MCQs with detailed explanations referencing the underlying section, standard, or rule wherever applicable.
          </p>
          <p>
            Each question on this platform is reviewed against the official ICAI study material so the level and framing match what you'll see in the actual exam. After taking a diagnostic, ClearPass tells you exactly which chapters and sub-topics are weak, with a chapter-by-chapter readiness score.
          </p>
          {questionCount === 0 && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900">
              Practice questions for this chapter are being added. Check back shortly, or browse other chapters in {subjectShort} that are already live.
            </p>
          )}
        </section>

        <div className="mt-10 rounded-xl bg-gray-900 px-6 py-6 text-white">
          {isFree ? (
            <>
              <p className="text-sm font-bold">Try this chapter for free</p>
              <p className="mt-1 text-xs text-gray-300">{chapter.name} is a free preview — sign in to start practising.</p>
              <Link
                href="/select"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100"
              >
                Practise free
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-bold">Practise {chapter.name}</p>
              <p className="mt-1 text-xs text-gray-300">Unlock all four CA Final subjects on ClearPass for ₹299.</p>
              <Link
                href="/select"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100"
              >
                Get the bundle
              </Link>
            </>
          )}
        </div>

        <section className="mt-12 border-t border-gray-100 pt-8">
          <p className="text-xs uppercase tracking-wider text-gray-400">More from {subjectShort}</p>
          <p className="mt-2 text-sm text-gray-600">
            Browse the <Link href={`/learn/${subject.id}`} className="underline underline-offset-2 hover:text-black">full {subjectShort} syllabus</Link> or jump back to the <Link href="/learn" className="underline underline-offset-2 hover:text-black">CA Final subject index</Link>.
          </p>
        </section>
      </article>
    </main>
  )
}
