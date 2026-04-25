'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Subject, Section, Chapter } from '@/lib/types'

interface Props {
  subjects: Subject[]
  sections: Section[]
  chapters: Chapter[]
  questionCounts: Record<string, number>
}

export function TopicSelector({ subjects, sections, chapters, questionCounts }: Props) {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id ?? '')
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())

  const filteredSections = sections.filter(s => s.subjectId === selectedSubject)

  const sectionHasQuestions = useMemo(() => {
    const result: Record<string, boolean> = {}
    for (const section of sections) {
      const sectionChapters = chapters.filter(c => c.sectionId === section.id)
      result[section.id] = sectionChapters.some(ch => (questionCounts[ch.id] ?? 0) > 0)
    }
    return result
  }, [sections, chapters, questionCounts])

  function toggleSection(id: string) {
    if (!sectionHasQuestions[id]) return
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
          chapters.filter(c => c.sectionId === id).forEach(c => {
            if ((questionCounts[c.id] ?? 0) > 0) nextCh.add(c.id)
          })
          return nextCh
        })
      }
      return next
    })
  }

  function toggleChapter(id: string) {
    if ((questionCounts[id] ?? 0) === 0) return
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
      <p className="mb-4 text-sm text-gray-500">Select sections and chapters, then take an assessment or practice.</p>
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">Derivatives &amp; Valuation is live now</p>
        <p className="mt-0.5 text-xs text-amber-700">More chapters are being added — we'll notify you when new ones unlock.</p>
      </div>

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
        {filteredSections.map(section => {
          const hasQuestions = sectionHasQuestions[section.id]

          return (
            <div
              key={section.id}
              className={`rounded-xl border p-4 transition-shadow ${
                hasQuestions
                  ? 'border-gray-200 shadow-md hover:shadow-lg'
                  : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              <label className={`flex items-center gap-3 ${hasQuestions ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  checked={selectedSections.has(section.id)}
                  onChange={() => toggleSection(section.id)}
                  disabled={!hasQuestions}
                  className="h-4 w-4 rounded border-gray-300 disabled:opacity-40"
                />
                <span className={`text-sm font-bold ${!hasQuestions ? 'text-gray-400' : ''}`}>{section.name}</span>
                <span className="ml-auto text-xs text-gray-400">{section.examWeightPercent}% weight</span>
              </label>

              {!hasQuestions && (
                <p className="mt-2 ml-7 text-xs text-gray-400">
                  Coming soon — stay tuned for new chapters.
                </p>
              )}

              {hasQuestions && selectedSections.has(section.id) && (
                <div className="mt-3 ml-7 space-y-2">
                  {chapters.filter(c => c.sectionId === section.id).map(ch => {
                    const chHasQuestions = (questionCounts[ch.id] ?? 0) > 0
                    return (
                      <div key={ch.id} className="flex items-center justify-between">
                        <label className={`flex items-center gap-2 ${chHasQuestions ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                          <input
                            type="checkbox"
                            checked={selectedChapters.has(ch.id)}
                            onChange={() => toggleChapter(ch.id)}
                            disabled={!chHasQuestions}
                            className="h-3.5 w-3.5 rounded border-gray-300 disabled:opacity-40"
                          />
                          <span className={`text-sm ${chHasQuestions ? 'text-gray-700' : 'text-gray-400'}`}>{ch.name}</span>
                        </label>
                        {chHasQuestions ? (
                          <button
                            onClick={() => goToPractice(ch.id)}
                            className="text-xs text-gray-400 underline underline-offset-2 hover:text-black"
                          >
                            Practice →
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">Coming soon</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
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
