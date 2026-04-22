import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ChapterScore, StudyPlan } from './types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.7,
  },
})

interface ReportOutput {
  weaknessAnalysis: string
  studyPlan: StudyPlan
}

export async function generateReport(
  chapterScores: ChapterScore[],
  readinessScore: number
): Promise<ReportOutput> {
  const scoreLines = chapterScores
    .map(cs => `- ${cs.chapterName} (id: ${cs.chapterId}): ${cs.correct}/${cs.total} (${cs.percentage}%) — ${cs.tier}`)
    .join('\n')

  const prompt = `You are ClearPass, an AI mentor helping CA Intermediate students prepare.

A student just completed a readiness assessment. Results by chapter:

${scoreLines}

Exam-weighted readiness score: ${readinessScore}%

Task 1 — WEAKNESS ANALYSIS (2 paragraphs, ~120 words total):
- Paragraph 1: Identify the 2–3 weakest chapters. Explain why these gaps are risky for the exam.
- Paragraph 2: Specific, actionable advice on how to fix these gaps.
- Tone: honest and direct, like a senior CA mentor. No fluff.

Task 2 — 7-DAY STUDY PLAN prioritising weak chapters:
- Each day: focus topic, 2–4 specific tasks, estimated hours (max 4 per day).
- Days 6–7: revision + mock test across all chapters.
- "priorityChapters" MUST be an array of chapter ids (exactly as provided above), ordered weakest → strongest.

Return JSON only (no markdown, no preamble):
{
  "weaknessAnalysis": "...",
  "studyPlan": {
    "weekSummary": "...",
    "days": [
      { "day": 1, "focus": "...", "tasks": ["...", "..."], "estimatedHours": 3 }
    ],
    "priorityChapters": ["<chapter_id_1>", "<chapter_id_2>"]
  }
}`

  const result = await model.generateContent(prompt)
  let raw: ReportOutput
  try {
    raw = JSON.parse(result.response.text()) as ReportOutput
  } catch {
    throw new Error('Gemini returned invalid JSON')
  }

  if (!Array.isArray(raw.studyPlan.priorityChapters)) {
    raw.studyPlan.priorityChapters = chapterScores
      .filter(cs => cs.tier === 'weak')
      .map(cs => cs.chapterId)
  }

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
