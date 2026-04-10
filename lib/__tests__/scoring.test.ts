import { describe, it, expect } from 'vitest'
import { calculateChapterScores, getSectionScores, calculateReadinessScore, calculateOverallScore } from '../scoring'
import type { Chapter, Section, ChapterScore } from '../types'

const chapters: Chapter[] = [
  { id: 'ch1', sectionId: 'sec1', subjectId: 's', name: 'Chapter 1', sortOrder: 1, examWeightPercent: 30 },
  { id: 'ch2', sectionId: 'sec1', subjectId: 's', name: 'Chapter 2', sortOrder: 2, examWeightPercent: 20 },
  { id: 'ch3', sectionId: 'sec2', subjectId: 's', name: 'Chapter 3', sortOrder: 3, examWeightPercent: 50 },
]

const sections: Section[] = [
  { id: 'sec1', subjectId: 's', name: 'Section 1', sortOrder: 1, examWeightPercent: 50 },
  { id: 'sec2', subjectId: 's', name: 'Section 2', sortOrder: 2, examWeightPercent: 50 },
]

const questions = [
  { chapterId: 'ch1', correctIndex: 0 },
  { chapterId: 'ch1', correctIndex: 1 },
  { chapterId: 'ch2', correctIndex: 2 },
  { chapterId: 'ch3', correctIndex: 0 },
  { chapterId: 'ch3', correctIndex: 1 },
]

describe('calculateChapterScores', () => {
  it('computes correct percentages', () => {
    const answers = [0, 0, 2, 0, 0] // ch1: 1/2, ch2: 1/1, ch3: 1/2
    const scores = calculateChapterScores(questions, answers, chapters)
    expect(scores.find(s => s.chapterId === 'ch2')!.percentage).toBe(100)
  })

  it('sorts weak → strong', () => {
    // ch1: 0/2 weak, ch2: 1/1 strong, ch3: 0/2 weak
    const answers = [3, 3, 2, 3, 3]
    const scores = calculateChapterScores(questions, answers, chapters)
    expect(scores[0].tier).toBe('weak')
    expect(scores[scores.length - 1].tier).toBe('strong')
  })
})

describe('getSectionScores', () => {
  it('returns all sections even if some have no questions', () => {
    const chapterScores: ChapterScore[] = [
      { chapterId: 'ch1', chapterName: 'Ch1', sectionId: 'sec1', correct: 1, total: 2, percentage: 50, tier: 'moderate' },
    ]
    const result = getSectionScores(chapterScores, sections)
    expect(result).toHaveLength(2)
    const sec2 = result.find(s => s.sectionId === 'sec2')!
    expect(sec2.total).toBe(0)
    expect(sec2.tier).toBe('weak')
  })
})

describe('calculateReadinessScore', () => {
  it('all strong → tier strong, score >= 70', () => {
    const chapterScores: ChapterScore[] = chapters.map(c => ({
      chapterId: c.id, chapterName: c.name, sectionId: c.sectionId,
      correct: 2, total: 2, percentage: 100, tier: 'strong',
    }))
    const result = calculateReadinessScore(chapterScores, chapters)
    expect(result.score).toBe(100)
    expect(result.tier).toBe('strong')
  })

  it('all weak → tier weak, label contains "Needs"', () => {
    const chapterScores: ChapterScore[] = chapters.map(c => ({
      chapterId: c.id, chapterName: c.name, sectionId: c.sectionId,
      correct: 0, total: 2, percentage: 0, tier: 'weak',
    }))
    const result = calculateReadinessScore(chapterScores, chapters)
    expect(result.tier).toBe('weak')
    expect(result.label).toMatch(/needs/i)
  })
})

describe('calculateOverallScore', () => {
  it('computes correct/total/percentage', () => {
    const result = calculateOverallScore(questions, [0, 0, 2, 0, 0])
    expect(result.correct).toBe(3)
    expect(result.total).toBe(5)
    expect(result.percentage).toBe(60)
  })
})
