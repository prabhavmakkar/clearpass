import { GoogleGenerativeAI } from '@google/generative-ai'
import { nanoid } from 'nanoid'
import type { KnowledgeNode, Question, NodeScore, StudyPlan } from './types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.7,
  },
})

// ── Question Generation ───────────────────────────────────────────────

export async function generateQuestionsForNode(
  node: KnowledgeNode,
  count: number
): Promise<Question[]> {
  const prompt = `You are an expert question setter for the ICAI CA Intermediate Auditing and Assurance paper.
Generate exactly ${count} multiple-choice question(s) for this topic:

Chapter ${node.icaiChapter}: ${node.title}
Course: CA Intermediate, Paper 6 — Auditing and Assurance

Requirements:
- Each question tests a distinct concept within this chapter.
- Exactly 4 options per question (indices 0, 1, 2, 3).
- One correct answer per ICAI study material.
- Include a concise explanation (1–2 sentences) for the correct answer.
- Do NOT include questions outside this chapter scope.
- Reference the relevant SA or Companies Act 2013 section where applicable.
- Mix difficulty: easy, medium, or hard.

Return a JSON array only (no markdown, no preamble):
[
  {
    "stem": "...",
    "options": ["...", "...", "...", "..."],
    "correctIndex": 0,
    "explanation": "...",
    "difficulty": "easy",
    "icaiReference": "SA XXX (optional)"
  }
]`

  const result = await model.generateContent(prompt)
  const raw = JSON.parse(result.response.text()) as Array<{
    stem: string
    options: [string, string, string, string]
    correctIndex: number
    explanation: string
    difficulty: 'easy' | 'medium' | 'hard'
    icaiReference?: string
  }>

  return raw.map((q) => ({
    id: `ai-${node.id}-${nanoid(6)}`,
    nodeId: node.id,
    stem: q.stem,
    options: q.options,
    correctIndex: (Number(q.correctIndex) as 0 | 1 | 2 | 3),
    explanation: q.explanation,
    difficulty: q.difficulty ?? 'medium',
    source: 'ai-generated' as const,
    icaiReference: q.icaiReference,
  }))
}

// ── Report Generation ─────────────────────────────────────────────────

interface ReportOutput {
  weaknessAnalysis: string
  studyPlan: StudyPlan
}

export async function generateReport(
  nodeScores: NodeScore[],
  overallScore: number
): Promise<ReportOutput> {
  const scoreLines = nodeScores
    .map(ns => `- ${ns.nodeTitle}: ${ns.correct}/${ns.total} (${ns.percentage}%) — ${ns.tier}`)
    .join('\n')

  const prompt = `You are ClearPass, an AI mentor helping CA Intermediate students prepare for the Auditing paper.

A student just completed a readiness assessment. Results:

${scoreLines}

Overall score: ${overallScore}%

Task 1 — WEAKNESS ANALYSIS (2 paragraphs, ~120 words total):
- Paragraph 1: Identify the 2–3 weakest areas. Explain why these gaps are risky for the exam.
- Paragraph 2: Specific, actionable advice on how to fix these gaps.
- Tone: honest and direct, like a senior CA mentor. No fluff.

Task 2 — 7-DAY STUDY PLAN prioritising weak chapters:
- Each day: focus topic, 2–4 specific tasks, estimated hours (max 4 per day).
- Days 6–7: revision + mock test across all chapters.

Return JSON only (no markdown):
{
  "weaknessAnalysis": "...",
  "studyPlan": {
    "weekSummary": "...",
    "days": [
      { "day": 1, "focus": "...", "tasks": ["...", "..."], "estimatedHours": 3 }
    ],
    "priorityNodes": ["audit-ch04", "audit-ch01"]
  }
}`

  const result = await model.generateContent(prompt)
  const raw = JSON.parse(result.response.text()) as ReportOutput

  // Ensure exactly 7 days
  while (raw.studyPlan.days.length < 7) {
    const day = raw.studyPlan.days.length + 1
    raw.studyPlan.days.push({
      day,
      focus: 'Revision and Mock Practice',
      tasks: ['Review all chapters', 'Attempt a full mock paper'],
      estimatedHours: 3,
    })
  }
  raw.studyPlan.days = raw.studyPlan.days.slice(0, 7)

  return raw
}
