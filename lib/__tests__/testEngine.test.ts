import { describe, it, expect, vi, beforeEach } from 'vitest'
import { distributeQuestions, selectQuestionsForNode, assembleTest } from '../testEngine'
import { CA_INTER_AUDIT_NODES } from '../knowledgeGraph'
import { QUESTION_BANK } from '../questionBank'
import type { Question } from '../types'

// Mock Gemini — tests must never hit the network
vi.mock('../gemini', () => ({
  generateQuestionsForNode: vi.fn(async (node: { id: string; title: string }, count: number): Promise<Question[]> =>
    Array.from({ length: count }, (_, i) => ({
      id: `ai-${node.id}-${i}`,
      nodeId: node.id,
      stem: `AI question ${i} for ${node.title}`,
      options: ['A', 'B', 'C', 'D'] as [string, string, string, string],
      correctIndex: 0 as const,
      explanation: 'AI explanation',
      difficulty: 'medium' as const,
      source: 'ai-generated' as const,
    }))
  ),
}))

const TARGET = 22

describe('distributeQuestions', () => {
  it('sums exactly to totalTarget', () => {
    const dist = distributeQuestions(CA_INTER_AUDIT_NODES, TARGET)
    const total = [...dist.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(TARGET)
  })

  it('gives every node at least 1 question', () => {
    const dist = distributeQuestions(CA_INTER_AUDIT_NODES, TARGET)
    for (const node of CA_INTER_AUDIT_NODES) {
      expect(dist.get(node.id)!).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('selectQuestionsForNode', () => {
  const node = CA_INTER_AUDIT_NODES[0] // audit-ch01

  it('uses bank when sufficient', () => {
    const result = selectQuestionsForNode(node, QUESTION_BANK, 2)
    expect(result.questions).toHaveLength(2)
    expect(result.aiNeeded).toBe(0)
    expect(result.questions.every(q => q.source === 'bank')).toBe(true)
  })

  it('reports aiNeeded when bank is empty', () => {
    const result = selectQuestionsForNode(node, [], 2)
    expect(result.questions).toHaveLength(0)
    expect(result.aiNeeded).toBe(2)
  })

  it('partial bank: uses all bank + reports aiNeeded for remainder', () => {
    const oneQuestion = QUESTION_BANK.filter(q => q.nodeId === node.id).slice(0, 1)
    const result = selectQuestionsForNode(node, oneQuestion, 2)
    expect(result.questions).toHaveLength(1)
    expect(result.aiNeeded).toBe(1)
  })
})

describe('assembleTest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns between 20 and 25 questions', async () => {
    const questions = await assembleTest('ca-inter-audit')
    expect(questions.length).toBeGreaterThanOrEqual(20)
    expect(questions.length).toBeLessThanOrEqual(25)
  })

  it('has no duplicate ids', async () => {
    const questions = await assembleTest('ca-inter-audit')
    const ids = questions.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers all 12 nodes', async () => {
    const questions = await assembleTest('ca-inter-audit')
    const coveredNodes = new Set(questions.map(q => q.nodeId))
    expect(coveredNodes.size).toBe(12)
  })

  it('throws for unknown topic', async () => {
    await expect(assembleTest('unknown-topic')).rejects.toThrow()
  })
})
