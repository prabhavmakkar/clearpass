'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Subject, Section, Chapter } from '@/lib/types'

interface Props {
  subjects: Subject[]
  sections: Section[]
  chapters: Chapter[]
}

export function TopicSelector({ subjects, sections, chapters }: Props) {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id ?? '')
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())

  const filteredSections = sections.filter(s => s.subjectId === selectedSubject)

  function toggleSection(id: string) {
    setSelectedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setSelectedChapters(prevCh => {
          const nextCh = new Set(prevCh)
          chapters.filter(c => c.sectionId === id).forEach(c => nextCh.delete(c.id))
          return nextCh
        })
      } else {
        next.add(id)
        setSelectedChapters(prevCh => {
          const nextCh = new Set(prevCh)
          chapters.filter(c => c.sectionId === id).forEach(c => nextCh.add(c.id))
          return nextCh
        })
      }
      return next
    })
  }

  function toggleChapter(id: string) {
    setSelectedChapters(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function goToAssessment() {
    const params = new URLSearchParams({
      subject: selectedSubject,
      sections: [...selectedSections].join(','),
      chapters: [...selectedChapters].join(','),
    })
    router.push(`/assessment?${params}`)
  }

  function goToPractice(chapterId: string) {
    router.push(`/practice?chapter=${chapterId}`)
  }

  const hasSelection = selectedChapters.size > 0

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-black">Choose Your Scope</h1>
      <p className="mb-8 text-sm text-gray-500">Select sections and chapters, then take an assessment or practice.</p>

      {subjects.length > 1 && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold">Subject</label>
          <select
            value={selectedSubject}
            onChange={e => { setSelectedSubject(e.target.value); setSelectedSections(new Set()); setSelectedChapters(new Set()) }}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
          >
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      <div className="mb-8 space-y-4">
        {filteredSections.map(section => (
          <div key={section.id} className="rounded-xl border border-gray-100 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={selectedSections.has(section.id)}
                onChange={() => toggleSection(section.id)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-bold">{section.name}</span>
              <span className="ml-auto text-xs text-gray-400">{section.examWeightPercent}% weight</span>
            </label>

            {selectedSections.has(section.id) && (
              <div className="mt-3 ml-7 space-y-2">
                {chapters.filter(c => c.sectionId === section.id).map(ch => (
                  <div key={ch.id} className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedChapters.has(ch.id)}
                        onChange={() => toggleChapter(ch.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{ch.name}</span>
                    </label>
                    <button
                      onClick={() => goToPractice(ch.id)}
                      className="text-xs text-gray-400 underline underline-offset-2 hover:text-black"
                    >
                      Practice →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {hasSelection && (
        <button
          onClick={goToAssessment}
          className="w-full rounded-xl bg-black px-8 py-4 text-sm font-bold text-white transition-opacity hover:opacity-80"
        >
          Take Readiness Assessment ({selectedChapters.size} chapter{selectedChapters.size !== 1 ? 's' : ''}) →
        </button>
      )}
    </div>
  )
}
