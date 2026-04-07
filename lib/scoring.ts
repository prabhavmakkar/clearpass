import type { NodeScore, Tier } from './types'
import { CA_INTER_AUDIT_NODES } from './knowledgeGraph'

// Minimal shape needed for scoring — works with both Question and SessionQuestion
interface Scorable {
  nodeId: string
  correctIndex: number
}

function getTier(percentage: number): Tier {
  if (percentage >= 70) return 'strong'
  if (percentage >= 40) return 'moderate'
  return 'weak'
}

export function calculateNodeScores(questions: Scorable[], answers: (number | null)[]): NodeScore[] {
  const tally = new Map<string, { correct: number; total: number }>()

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const entry = tally.get(q.nodeId) ?? { correct: 0, total: 0 }
    entry.total++
    if (answers[i] === q.correctIndex) entry.correct++
    tally.set(q.nodeId, entry)
  }

  const nodeTitle = Object.fromEntries(CA_INTER_AUDIT_NODES.map(n => [n.id, n.title]))

  const scores: NodeScore[] = []
  for (const [nodeId, { correct, total }] of tally.entries()) {
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
    scores.push({ nodeId, nodeTitle: nodeTitle[nodeId] ?? nodeId, correct, total, percentage, tier: getTier(percentage) })
  }

  const order: Record<Tier, number> = { weak: 0, moderate: 1, strong: 2 }
  return scores.sort((a, b) => order[a.tier] - order[b.tier])
}

export function calculateOverallScore(questions: Scorable[], answers: (number | null)[]): number {
  if (questions.length === 0) return 0
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length
  return Math.round((correct / questions.length) * 100)
}
