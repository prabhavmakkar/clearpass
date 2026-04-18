import { getSubjects, getSections, getChapters, getQuestionCountsByChapter } from '@/lib/queries'
import { TopicSelector } from '@/components/select/TopicSelector'

export const dynamic = 'force-dynamic'

export default async function SelectPage() {
  const subjects = await getSubjects()
  if (subjects.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">No subjects available. Ask your admin to upload a syllabus.</p>
      </main>
    )
  }

  const allSectionIds: string[] = []
  const allSections = []
  for (const s of subjects) {
    const secs = await getSections(s.id)
    allSections.push(...secs)
    allSectionIds.push(...secs.map(sec => sec.id))
  }
  const [allChapters, questionCounts] = await Promise.all([
    allSectionIds.length > 0 ? getChapters(allSectionIds) : Promise.resolve([]),
    getQuestionCountsByChapter(),
  ])

  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <a href="/" className="text-base font-black">ClearPass</a>
        </div>
      </nav>
      <TopicSelector subjects={subjects} sections={allSections} chapters={allChapters} questionCounts={questionCounts} />
    </main>
  )
}
