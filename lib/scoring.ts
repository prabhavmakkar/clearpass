import type { ChapterScore, SectionScore, ReadinessScore, Tier, Section, Chapter } from './types'

function getTier(percentage: number): Tier {
  if (percentage >= 70) return 'strong'
  if (percentage >= 40) return 'moderate'
  return 'weak'
}

interface Scorable { chapterId: string; correctIndex: number }

export function calculateChapterScores(
  questions: Scorable[],
  answers: (number | null)[],
  chapters: Chapter[]
): ChapterScore[] {
  const chapterMap = Object.fromEntries(chapters.map(c => [c.id, c]))
  const tally = new Map<string, { correct: number; total: number }>()

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const entry = tally.get(q.chapterId) ?? { correct: 0, total: 0 }
    entry.total++
    if (answers[i] === q.correctIndex) entry.correct++
    tally.set(q.chapterId, entry)
  }

  const scores: ChapterScore[] = []
  for (const [chapterId, { correct, total }] of tally.entries()) {
    const ch = chapterMap[chapterId]
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
    scores.push({
      chapterId,
      chapterName: ch?.name ?? chapterId,
      sectionId: ch?.sectionId ?? '',
      correct, total, percentage,
      tier: getTier(percentage),
    })
  }

  const order: Record<Tier, number> = { weak: 0, moderate: 1, strong: 2 }
  return scores.sort((a, b) => order[a.tier] - order[b.tier])
}

export function getSectionScores(
  chapterScores: ChapterScore[],
  sections: Section[]
): SectionScore[] {
  const sectionMap = Object.fromEntries(sections.map(s => [s.id, s]))

  // Always emit all sections that were in scope (even if 0 questions answered)
  const tally = new Map<string, { correct: number; total: number; chapterIds: string[] }>()
  for (const s of sections) {
    tally.set(s.id, { correct: 0, total: 0, chapterIds: [] })
  }

  for (const cs of chapterScores) {
    const entry = tally.get(cs.sectionId)
    if (!entry) continue
    entry.correct += cs.correct
    entry.total += cs.total
    entry.chapterIds.push(cs.chapterId)
  }

  return [...tally.entries()].map(([sectionId, { correct, total, chapterIds }]) => {
    const section = sectionMap[sectionId]
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
    return {
      sectionId,
      sectionName: section?.name ?? sectionId,
      correct, total, percentage,
      tier: getTier(percentage),
      chapterIds,
    }
  })
}

export function calculateReadinessScore(
  chapterScores: ChapterScore[],
  chapters: Chapter[]
): ReadinessScore {
  const chapterMap = Object.fromEntries(chapters.map(c => [c.id, c]))
  let weightedSum = 0
  let totalWeight = 0

  for (const cs of chapterScores) {
    const ch = chapterMap[cs.chapterId]
    const weight = ch?.examWeightPercent ?? 1
    weightedSum += cs.percentage * weight
    totalWeight += weight
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
  const tier = getTier(score)
  const label =
    tier === 'strong' ? 'Likely to clear' :
    tier === 'moderate' ? 'Borderline — needs focused prep' :
    'Needs significant work'

  return { score, tier, label }
}

export function calculateOverallScore(
  questions: Scorable[],
  answers: (number | null)[]
): { correct: number; total: number; percentage: number } {
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length
  return {
    correct,
    total: questions.length,
    percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
  }
}
