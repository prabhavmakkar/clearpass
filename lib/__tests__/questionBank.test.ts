import { describe, it, expect } from 'vitest'
import { QUESTION_BANK } from '../questionBank'
import { CA_INTER_AUDIT_NODES } from '../knowledgeGraph'

const validNodeIds = new Set(CA_INTER_AUDIT_NODES.map(n => n.id))

describe('QUESTION_BANK data integrity', () => {
  it('has at least 2 questions per node', () => {
    for (const node of CA_INTER_AUDIT_NODES) {
      const count = QUESTION_BANK.filter(q => q.nodeId === node.id).length
      expect(count, `node ${node.id} has ${count} questions, expected ≥ 2`).toBeGreaterThanOrEqual(2)
    }
  })

  it('every question has exactly 4 options', () => {
    for (const q of QUESTION_BANK) {
      expect(q.options).toHaveLength(4)
    }
  })

  it('every correctIndex is 0|1|2|3', () => {
    for (const q of QUESTION_BANK) {
      expect([0, 1, 2, 3]).toContain(q.correctIndex)
    }
  })

  it('every nodeId references a valid KnowledgeNode', () => {
    for (const q of QUESTION_BANK) {
      expect(validNodeIds, `unknown nodeId: ${q.nodeId}`).toContain(q.nodeId)
    }
  })

  it('no duplicate ids', () => {
    const ids = QUESTION_BANK.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
