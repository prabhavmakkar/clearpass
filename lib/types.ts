// ── Knowledge Graph ───────────────────────────────────────────────────

export interface KnowledgeNode {
  id: string                 // e.g. "audit-ch04"
  title: string              // ICAI chapter title
  category: 'foundation' | 'risk' | 'procedures' | 'reporting' | 'specialised'
  examWeightPercent: number  // ICAI mark allocation estimate (12 nodes sum to 100)
  icaiChapter: number        // 1–12
}

// ── Question ──────────────────────────────────────────────────────────

export type QuestionSource = 'bank' | 'ai-generated'

export interface Question {
  id: string                                   // "bank-ch01-001" or "ai-ch01-a3f2"
  nodeId: string                               // → KnowledgeNode.id
  stem: string
  options: [string, string, string, string]    // exactly 4
  correctIndex: 0 | 1 | 2 | 3
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
  source: QuestionSource
  icaiReference?: string                       // "SA 200, Para 3"
}

// Question as sent to the client (answer key stripped)
export type ClientQuestion = Omit<Question, 'correctIndex' | 'explanation'>

// ── Test Session (sessionStorage) ─────────────────────────────────────

export interface TestSession {
  sessionId: string
  sessionToken: string          // HMAC-signed token — carries correct answers server-side
  topic: string
  questions: ClientQuestion[]
  answers: (number | null)[]   // index-aligned; null = unanswered
  startedAt: string
  submittedAt?: string
}

// ── Scoring ───────────────────────────────────────────────────────────

export type Tier = 'strong' | 'moderate' | 'weak'
// strong ≥ 70%  |  moderate 40–69%  |  weak < 40%

export interface NodeScore {
  nodeId: string
  nodeTitle: string
  correct: number
  total: number
  percentage: number
  tier: Tier
}

// ── Report (returned by /api/report) ─────────────────────────────────

export interface StudyDay {
  day: number           // 1–7
  focus: string
  tasks: string[]       // 2–4 bullet strings
  estimatedHours: number
}

export interface StudyPlan {
  weekSummary: string
  days: StudyDay[]      // always 7
  priorityNodes: string[]
}

export interface TestReport {
  sessionId: string
  overallScore: number       // 0–100 percentage
  correctCount: number
  totalCount: number
  nodeScores: NodeScore[]    // sorted weak → strong
  weaknessAnalysis: string   // Gemini prose
  studyPlan: StudyPlan
  generatedAt: string
}
