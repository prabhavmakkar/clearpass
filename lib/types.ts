// ── Knowledge Graph (from Neon) ────────────────────────────────────────

export interface Subject {
  id: string
  name: string
}

export interface Section {
  id: string
  subjectId: string
  name: string
  sortOrder: number
  examWeightPercent: number
}

export interface Chapter {
  id: string
  sectionId: string
  subjectId: string
  name: string
  sortOrder: number
  examWeightPercent: number
}

// ── Question ──────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionSource = 'bank' | 'ai-generated'
export type CorrectOption = 'A' | 'B' | 'C' | 'D'

export interface Question {
  id: string
  chapterId: string
  stem: string
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  explanation: string
  difficulty: Difficulty
  source: QuestionSource
  icaiReference?: string
}

// Client-safe version (answer key stripped)
export type ClientQuestion = Omit<Question, 'correctIndex' | 'explanation'>

// ── Adaptive Engine ───────────────────────────────────────────────────

export interface AdaptiveState {
  theta: number
  answeredIds: string[]
  consecutiveCorrect: number
  consecutiveWrong: number
  questionsAnswered: number
}

// ── Scoring ───────────────────────────────────────────────────────────

export type Tier = 'strong' | 'moderate' | 'weak'

export interface ChapterScore {
  chapterId: string
  chapterName: string
  sectionId: string
  correct: number
  total: number
  percentage: number
  tier: Tier
}

export interface SectionScore {
  sectionId: string
  sectionName: string
  correct: number
  total: number
  percentage: number
  tier: Tier
  chapterIds: string[]
}

export interface ReadinessScore {
  score: number               // 0–100, exam-weight-adjusted
  tier: Tier
  label: string               // "Likely to clear" | "Borderline" | "Needs work"
}

// ── Assessment Session (sessionStorage) ────────────────────────────────

export interface AssessmentSession {
  sessionId: string
  sessionToken: string
  subjectId: string
  scope: { sectionIds: string[]; chapterIds: string[] }
  questions: ClientQuestion[]
  answers: (number | null)[]
  startedAt: string
  submittedAt?: string
}

// ── Assessment Report ─────────────────────────────────────────────────

export interface StudyDay {
  day: number
  focus: string
  tasks: string[]
  estimatedHours: number
}

export interface StudyPlan {
  weekSummary: string
  days: StudyDay[]
  priorityChapters: string[]
}

export interface AssessmentReport {
  sessionId: string
  readinessScore: ReadinessScore
  overallScore: number
  correctCount: number
  totalCount: number
  chapterScores: ChapterScore[]
  sectionScores: SectionScore[]
  weaknessAnalysis: string
  studyPlan: StudyPlan
  generatedAt: string
}
