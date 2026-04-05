import type { KnowledgeNode, Question } from './types'
import { QUESTION_BANK } from './questionBank'
import { getNodes } from './knowledgeGraph'
import { generateQuestionsForNode } from './gemini'

const TOTAL_TARGET = 22

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function distributeQuestions(nodes: KnowledgeNode[], total: number): Map<string, number> {
  const totalWeight = nodes.reduce((s, n) => s + n.examWeightPercent, 0)
  const allocations = new Map<string, number>()
  let allocated = 0

  for (const node of nodes) {
    const raw = (node.examWeightPercent / totalWeight) * total
    const floor = Math.max(1, Math.floor(raw))
    allocations.set(node.id, floor)
    allocated += floor
  }

  let remainder = total - allocated
  const byFrac = [...nodes]
    .map(n => ({ id: n.id, frac: ((n.examWeightPercent / totalWeight) * total) % 1 }))
    .sort((a, b) => b.frac - a.frac)

  for (let i = 0; i < remainder; i++) {
    const id = byFrac[i % byFrac.length].id
    allocations.set(id, (allocations.get(id) ?? 1) + 1)
  }

  return allocations
}

export function selectQuestionsForNode(
  node: KnowledgeNode,
  bank: Question[],
  targetCount: number
): { questions: Question[]; aiNeeded: number } {
  const bankForNode = bank.filter(q => q.nodeId === node.id)
  if (bankForNode.length >= targetCount) {
    return { questions: shuffle(bankForNode).slice(0, targetCount), aiNeeded: 0 }
  }
  return { questions: bankForNode, aiNeeded: targetCount - bankForNode.length }
}

// Module-scope cache: prevents hammering Gemini on every test load
const assemblyCache = new Map<string, { questions: Question[]; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function assembleTest(topic: string): Promise<Question[]> {
  const cached = assemblyCache.get(topic)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return shuffle(cached.questions)
  }

  const nodes = getNodes(topic)
  if (nodes.length === 0) throw new Error(`Unknown topic: ${topic}`)

  const distribution = distributeQuestions(nodes, TOTAL_TARGET)
  const allQuestions: Question[] = []
  const aiJobs: Array<{ node: KnowledgeNode; count: number }> = []

  for (const node of nodes) {
    const target = distribution.get(node.id) ?? 1
    const { questions, aiNeeded } = selectQuestionsForNode(node, QUESTION_BANK, target)
    allQuestions.push(...questions)
    if (aiNeeded > 0) aiJobs.push({ node, count: aiNeeded })
  }

  if (aiJobs.length > 0) {
    const aiResults = await Promise.all(
      aiJobs.map(({ node, count }) => generateQuestionsForNode(node, count))
    )
    allQuestions.push(...aiResults.flat())
  }

  assemblyCache.set(topic, { questions: allQuestions, ts: Date.now() })
  return shuffle(allQuestions)
}

// Session cache: maps sessionId → full Question[] (with correctIndex) for /api/report to resolve
const sessionCache = new Map<string, Question[]>()

export function cacheSession(sessionId: string, questions: Question[]): void {
  sessionCache.set(sessionId, questions)
  setTimeout(() => sessionCache.delete(sessionId), 30 * 60 * 1000)
}

export function resolveSession(sessionId: string): Question[] | undefined {
  return sessionCache.get(sessionId)
}
