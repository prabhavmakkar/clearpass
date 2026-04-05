import type { KnowledgeNode, Question } from './types'
// Stub — replaced in Task 5
export async function generateQuestionsForNode(_node: KnowledgeNode, _count: number): Promise<Question[]> {
  return []
}
export async function generateReport(): Promise<never> {
  throw new Error('Not implemented')
}
