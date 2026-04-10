import { describe, it, expect } from 'vitest'
import { updateTheta, selectNext, shouldStop } from '../adaptiveEngine'
import type { AdaptiveState, Question } from '../types'

const makeState = (overrides: Partial<AdaptiveState> = {}): AdaptiveState => ({
  theta: 0, answeredIds: [], consecutiveCorrect: 0, consecutiveWrong: 0, questionsAnswered: 0,
  ...overrides,
})

const makeQ = (id: string, difficulty: Question['difficulty']): Question => ({
  id, chapterId: 'ch1', stem: 'Q', options: ['A', 'B', 'C', 'D'],
  correctIndex: 0, explanation: 'E', difficulty, source: 'bank',
})

const pool: Question[] = [
  makeQ('e1', 'easy'), makeQ('e2', 'easy'),
  makeQ('m1', 'medium'), makeQ('m2', 'medium'),
  makeQ('h1', 'hard'), makeQ('h2', 'hard'),
]

describe('updateTheta', () => {
  it('correct hard increases theta', () => {
    const s = updateTheta(makeState(), 'hard', true)
    expect(s.theta).toBeGreaterThan(0)
    expect(s.consecutiveCorrect).toBe(1)
    expect(s.consecutiveWrong).toBe(0)
  })

  it('wrong easy decreases theta', () => {
    const s = updateTheta(makeState(), 'easy', false)
    expect(s.theta).toBeLessThan(0)
  })

  it('correct easy has smaller increase than correct hard', () => {
    expect(updateTheta(makeState(), 'hard', true).theta)
      .toBeGreaterThan(updateTheta(makeState(), 'easy', true).theta)
  })

  it('resets streak counters on flip', () => {
    const s = updateTheta(makeState({ consecutiveCorrect: 3 }), 'medium', false)
    expect(s.consecutiveCorrect).toBe(0)
    expect(s.consecutiveWrong).toBe(1)
  })
})

describe('selectNext', () => {
  it('starts with medium', () => {
    expect(selectNext(pool, makeState())!.difficulty).toBe('medium')
  })
  it('selects hard when theta > 0.5', () => {
    expect(selectNext(pool, makeState({ theta: 0.8 }))!.difficulty).toBe('hard')
  })
  it('selects easy when theta < -0.5', () => {
    expect(selectNext(pool, makeState({ theta: -0.8 }))!.difficulty).toBe('easy')
  })
  it('skips answered ids', () => {
    const s = makeState({ answeredIds: ['m1', 'm2'], theta: 0 })
    const q = selectNext(pool, s)
    expect(q).not.toBeNull()
    expect(['easy', 'hard']).toContain(q!.difficulty)
  })
  it('returns null when pool exhausted', () => {
    expect(selectNext(pool, makeState({ answeredIds: pool.map(q => q.id) }))).toBeNull()
  })
})

describe('shouldStop', () => {
  it('stops at max questions', () => {
    expect(shouldStop(makeState({ questionsAnswered: 50 }), 50)).toBe(true)
  })
  it('does not stop below min', () => {
    expect(shouldStop(makeState({ questionsAnswered: 5, consecutiveCorrect: 5 }), 50)).toBe(false)
  })
})
