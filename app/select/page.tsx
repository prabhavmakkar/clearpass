import { auth } from '@/lib/auth'
import { getSubjects, getSections, getChapters, getQuestionCountsByChapter, getFreeChapterIds, getUserPurchasedSubjectIds } from '@/lib/queries'
import { TopicSelector } from '@/components/select/TopicSelector'
import { AppNav } from '@/components/AppNav'

export const dynamic = 'force-dynamic'

export default async function SelectPage() {
  const session = await auth()
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

  const [allChapters, questionCounts, freeChapterIds, purchasedSubjectIds] = await Promise.all([
    allSectionIds.length > 0 ? getChapters(allSectionIds) : Promise.resolve([]),
    getQuestionCountsByChapter(),
    getFreeChapterIds(),
    session?.user?.id ? getUserPurchasedSubjectIds(Number(session.user.id)) : Promise.resolve([]),
  ])

  return (
    <main className="min-h-screen bg-white">
      <AppNav />
      <TopicSelector
        subjects={subjects}
        sections={allSections}
        chapters={allChapters}
        questionCounts={questionCounts}
        freeChapterIds={freeChapterIds}
        purchasedSubjectIds={purchasedSubjectIds}
      />
    </main>
  )
}
