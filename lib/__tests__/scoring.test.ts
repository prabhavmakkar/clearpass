import { describe, it, expect } from 'vitest'
import { calculateNodeScores, calculateOverallScore } from '../scoring'
import { QUESTION_BANK } from '../questionBank'

// Use first 2 questions from audit-ch01 for isolated tests
const ch01qs = QUESTION_BANK.filter(q => q.nodeId === 'audit-ch01').slice(0, 2)

describe('calculateNodeScores', () => {
  it('all correct → 100% strong', () => {
    const answers = ch01qs.map(q => q.correctIndex)
    const scores = calculateNodeScores(ch01qs, answers)
    const score = scores.find(s => s.nodeId === 'audit-ch01')!
    expect(score.percentage).toBe(100)
    expect(score.tier).toBe('strong')
  })

  it('all incorrect → 0% weak', () => {
    const answers = ch01qs.map(q => (q.correctIndex + 1) % 4)
    const scores = calculateNodeScores(ch01qs, answers)
    const score = scores.find(s => s.nodeId === 'audit-ch01')!
    expect(score.percentage).toBe(0)
    expect(score.tier).toBe('weak')
  })

  it('50% → moderate tier', () => {
    const answers = [ch01qs[0].correctIndex, (ch01qs[1].correctIndex + 1) % 4]
    const scores = calculateNodeScores(ch01qs, answers)
    const score = scores.find(s => s.nodeId === 'audit-ch01')!
    expect(score.percentage).toBe(50)
    expect(score.tier).toBe('moderate')
  })

  it('tier boundary: exactly 70% → strong', () => {
    // Need 7/10 correct — create mock data
    const mockQs = Array.from({ length: 10 }, (_, i) => ({ ...ch01qs[0], id: `mock-${i}` }))
    const answers = mockQs.map((q, i) => i < 7 ? q.correctIndex : (q.correctIndex + 1) % 4)
    const scores = calculateNodeScores(mockQs, answers)
    const score = scores.find(s => s.nodeId === 'audit-ch01')!
    expect(score.percentage).toBe(70)
    expect(score.tier).toBe('strong')
  })

  it('sorts results weak → strong', () => {
    const allQs = QUESTION_BANK.slice(0, 4) // 2 questions each for ch01 and ch02
    // Answer all ch01 wrong, all ch02 correct
    const answers = allQs.map((q, i) => i < 2 ? (q.correctIndex + 1) % 4 : q.correctIndex)
    const scores = calculateNodeScores(allQs, answers)
    expect(scores[0].tier).toBe('weak')
    expect(scores[scores.length - 1].tier).not.toBe('weak')
  })
})

describe('calculateOverallScore', () => {
  it('3/4 correct = 75%', () => {
    const qs = QUESTION_BANK.slice(0, 4)
    const answers = qs.map((q, i) => i === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex)
    expect(calculateOverallScore(qs, answers)).toBe(75)
  })

  it('0/0 questions = 0%', () => {
    expect(calculateOverallScore([], [])).toBe(0)
  })
})
