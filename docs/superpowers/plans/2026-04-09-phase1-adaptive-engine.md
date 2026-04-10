# ClearPass Phase 1 — Data-Driven Knowledge Graph, Readiness Assessment & Adaptive Practice

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded question bank with a Neon Postgres knowledge graph (Subject → Section → Chapter), add CSV-based admin content management, and build two distinct student-facing features: Readiness Assessment (diagnostic test with gap analysis) and Adaptive Practice (theta-based drilling on a single chapter).

**Architecture:** All content (subjects, sections, chapters, questions) lives in Neon Postgres and is managed by a CA partner via CSV upload in `/admin`. Students pick their scope on a `/select` page, then enter either `/assessment` (weighted diagnostic covering selected sections/chapters, produces a gap analysis report) or `/practice` (adaptive MCQ loop on a single chapter, no report). The adaptive engine is a set of pure functions (`lib/adaptiveEngine.ts`) used only in Practice mode. Assessment mode uses weighted random sampling. Both share the same question bank in Postgres. Session integrity uses HMAC-signed tokens (existing pattern) — no session table needed.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, Framer Motion, Neon Postgres (`@neondatabase/serverless`), Vitest, Gemini 2.5 Flash

---

## Environment Variables

All three must be set in `.env.local` (for local dev) AND in Vercel env (`vercel env add ...`) for production:

| Var | Purpose | Required by |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection string | `lib/db.ts` (all query routes) |
| `GEMINI_API_KEY` | Gemini 2.5 Flash API key (also used as HMAC secret for session tokens) | `lib/gemini.ts`, `lib/sessionToken.ts` |
| `ADMIN_PASSWORD` | Gate for admin CSV upload routes | `app/api/admin/upload-*` routes |

---

## Database Schema

```sql
-- Neon Postgres

CREATE TABLE subjects (
  id          TEXT PRIMARY KEY,          -- 'ca-inter-audit'
  name        TEXT NOT NULL              -- 'CA Intermediate — Auditing & Assurance'
);

CREATE TABLE sections (
  id          TEXT PRIMARY KEY,          -- 'ca-inter-audit/sa-standards'
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,             -- 'Standards on Auditing'
  sort_order  INT NOT NULL DEFAULT 0,
  exam_weight_percent NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE chapters (
  id          TEXT PRIMARY KEY,          -- 'ca-inter-audit/sa-standards/ch04'
  section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,             -- 'Risk Assessment and Internal Control'
  sort_order  INT NOT NULL DEFAULT 0,
  exam_weight_percent NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE questions (
  id          TEXT PRIMARY KEY,          -- 'bank-ch04-001' or 'ai-ch04-xxxx'
  chapter_id  TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  stem        TEXT NOT NULL,
  option_a    TEXT NOT NULL,
  option_b    TEXT NOT NULL,
  option_c    TEXT NOT NULL,
  option_d    TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL DEFAULT '',
  icai_reference TEXT,
  source      TEXT NOT NULL DEFAULT 'bank' CHECK (source IN ('bank', 'ai-generated')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_chapter ON questions(chapter_id);
CREATE INDEX idx_questions_difficulty ON questions(chapter_id, difficulty);
CREATE INDEX idx_chapters_section ON chapters(section_id);
CREATE INDEX idx_sections_subject ON sections(subject_id);
```

---

## File Map

### New files
- `lib/db.ts` — Neon serverless client (`@neondatabase/serverless` pool)
- `lib/schema.sql` — the SQL above (reference, run manually or via migration)
- `lib/queries.ts` — all Postgres queries (subjects, sections, chapters, questions)
- `lib/__tests__/queries.test.ts` — unit tests for query functions (mocked DB)
- `lib/csvParser.ts` — parse + validate syllabus.csv and questions.csv
- `lib/__tests__/csvParser.test.ts` — CSV parsing tests
- `lib/adaptiveEngine.ts` — pure functions: `updateTheta`, `selectNext`, `shouldStop`
- `lib/__tests__/adaptiveEngine.test.ts` — adaptive engine tests
- `app/select/page.tsx` — topic selection page (subject → section → chapter picker)
- `components/select/TopicSelector.tsx` — client component for the picker UI
- `app/assessment/page.tsx` — readiness assessment test page
- `components/assessment/AssessmentShell.tsx` — assessment test shell (weighted sampling, fixed 20 questions)
- `app/assessment/results/page.tsx` — assessment results page
- `components/assessment/AssessmentResults.tsx` — results shell for assessment
- `components/results/SectionBreakdown.tsx` — section-level gap analysis bars
- `app/practice/page.tsx` — adaptive practice page
- `components/practice/PracticeShell.tsx` — adaptive practice shell (theta-based, no fixed end)
- `app/admin/page.tsx` — admin dashboard with CSV upload
- `components/admin/AdminShell.tsx` — admin client component (upload forms, content preview)
- `app/api/admin/upload-syllabus/route.ts` — POST: parse syllabus CSV → insert subjects/sections/chapters
- `app/api/admin/upload-questions/route.ts` — POST: parse questions CSV → insert questions
- `app/api/assessment/questions/route.ts` — GET: weighted random sample for assessment scope
- `app/api/assessment/report/route.ts` — POST: score + Gemini gap analysis for assessment
- `app/api/practice/questions/route.ts` — GET: all questions for a chapter (adaptive pool)

### Modified files
- `lib/types.ts` — replace hardcoded KnowledgeNode with DB-aligned types, add AdaptiveState, ChapterScore, SectionScore, ReadinessScore
- `lib/scoring.ts` — rewrite around `ChapterScore`; add `calculateReadinessScore()`, `getSectionScores()`
- `lib/__tests__/scoring.test.ts` — tests for new scoring functions
- `lib/gemini.ts` — delete `generateQuestionsForNode` (dead); rewrite `generateReport()` to take `ChapterScore[]`; rename prompt's `priorityNodes` → `priorityChapters`
- `lib/sessionToken.ts` — rename `SessionQuestion.nodeId` → `chapterId` (HMAC logic unchanged)
- `components/landing/Hero.tsx` — add "Take Free Diagnostic" and "Practice MCQs" CTAs
- `components/landing/Features.tsx` — update feature cards with links to both features
- `components/landing/Nav.tsx` — add nav links for Assessment and Practice
- `app/page.tsx` — no changes (landing page composition stays)
- `components/test/QuestionCard.tsx` — no changes (reused in both features)
- `components/test/ProgressBar.tsx` — no changes (reused)
- `components/results/ScoreOverview.tsx` — add readinessScore prop with tier label
- `components/results/NodeBreakdown.tsx` — switch prop type from `NodeScore[]` → `ChapterScore[]` (component name preserved)
- `components/results/WeaknessAnalysis.tsx` — no changes (reused)
- `components/results/StudyPlanCard.tsx` — no changes (reused)

### Deleted files (replaced by Neon)
- `lib/knowledgeGraph.ts` — hardcoded nodes → now in Postgres
- `lib/questionBank.ts` — hardcoded questions → now in Postgres
- `lib/testEngine.ts` — replaced by `lib/queries.ts` + route-level assembly
- `lib/__tests__/testEngine.test.ts` — replaced by new query tests
- `lib/__tests__/questionBank.test.ts` — no longer needed
- `app/test/page.tsx` — replaced by `/assessment` and `/practice`
- `components/test/TestShell.tsx` — replaced by AssessmentShell + PracticeShell
- `components/test/SubmitButton.tsx` — inlined into AssessmentShell (assessment-specific logic)
- `app/api/questions/route.ts` — replaced by `/api/assessment/questions` and `/api/practice/questions`
- `app/api/report/route.ts` — replaced by `/api/assessment/report`
- `app/results/page.tsx` — replaced by `/assessment/results`
- `components/results/ResultsShell.tsx` — replaced by AssessmentResults

### CSV Formats (for admin uploads)

**syllabus.csv:**
```csv
subject_id,subject_name,section_id,section_name,section_weight,chapter_id,chapter_name,chapter_weight,sort_order
ca-inter-audit,CA Intermediate — Auditing & Assurance,sa-standards,Standards on Auditing,45,ch04,Risk Assessment and Internal Control,12,4
```

**questions.csv:**
```csv
chapter_id,difficulty,stem,option_a,option_b,option_c,option_d,correct_option,explanation,icai_reference
ca-inter-audit/sa-standards/ch04,medium,"Which of the following...",Option A,Option B,Option C,Option D,B,"Explanation here",SA 315 Para 5
```

---

## Task 1: Install Neon + set up database client

**Files:**
- Create: `lib/db.ts`
- Create: `lib/schema.sql`

- [ ] **Step 1: Install @neondatabase/serverless**

  Run: `cd /Users/prabhavmakkar/Desktop/AI\ projects/Clearpass && npm install @neondatabase/serverless`

- [ ] **Step 2: Create `lib/db.ts`**

  ```typescript
  import { neon } from '@neondatabase/serverless'

  export function getDb() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('DATABASE_URL not set')
    return neon(databaseUrl)
  }
  ```

- [ ] **Step 3: Create `lib/schema.sql`**

  Copy the full SQL schema from the "Database Schema" section above into this file. This is a reference file — the engineer runs it manually against Neon via the Neon console or `psql`.

- [ ] **Step 4: Create the Neon database**

  1. Go to Vercel Dashboard → Storage → Create → Neon Postgres
  2. Name: `clearpass-db`, Region: closest to users (ap-south-1 for India)
  3. Copy the `DATABASE_URL` connection string
  4. Run: `vercel env add DATABASE_URL` and paste the value for all environments
  5. Also add to `.env.local`: `DATABASE_URL=postgres://...`
  6. Generate an admin password (any strong string) and add it in BOTH places:
     - Run: `vercel env add ADMIN_PASSWORD` and paste it for all environments
     - Add to `.env.local`: `ADMIN_PASSWORD=<your-chosen-password>`
  7. Verify `GEMINI_API_KEY` is already set in Vercel env (from earlier work) — run `vercel env ls` to confirm. If not, add it.

- [ ] **Step 5: Run the schema**

  Open Neon console SQL editor (or use `psql $DATABASE_URL`) and paste + run the contents of `lib/schema.sql`.

- [ ] **Step 6: Commit**

  ```bash
  git add lib/db.ts lib/schema.sql package.json package-lock.json
  git commit -m "feat: add Neon serverless client and database schema"
  ```

---

## Task 2: Types overhaul

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/sessionToken.ts` (rename `nodeId` field → `chapterId`)

- [ ] **Step 1: Rewrite `lib/types.ts`**

  Replace the entire file:
  ```typescript
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
  ```

- [ ] **Step 2: Update `lib/sessionToken.ts` — rename `nodeId` → `chapterId`**

  In `lib/sessionToken.ts`, update the `SessionQuestion` interface:
  ```typescript
  export interface SessionQuestion {
    id: string
    chapterId: string   // was: nodeId
    correctIndex: number
  }
  ```
  No other changes needed — HMAC signing/verification logic stays the same. Sessions are ephemeral, so renaming is safe (no persisted tokens to migrate).

- [ ] **Step 3: Run type check**

  Run: `npx tsc --noEmit`
  Expected: Errors in files that import old types (knowledgeGraph, questionBank, testEngine, etc.) — these will be deleted in later tasks. Confirm no errors in `lib/types.ts` or `lib/sessionToken.ts` themselves.

- [ ] **Step 4: Commit**

  ```bash
  git add lib/types.ts lib/sessionToken.ts
  git commit -m "feat: overhaul types for Neon-backed knowledge graph; rename SessionQuestion.nodeId → chapterId"
  ```

---

## Task 3: Database query layer

**Files:**
- Create: `lib/queries.ts`
- Create: `lib/__tests__/queries.test.ts`

- [ ] **Step 1: Write failing tests**

  Create `lib/__tests__/queries.test.ts`:
  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  // Mock the db module before importing queries
  const mockSql = vi.fn()
  vi.mock('../db', () => ({ getDb: () => mockSql }))

  import {
    getSubjects,
    getSections,
    getChapters,
    getChaptersByIds,
    getQuestionsForChapters,
    insertSubject,
    insertSection,
    insertChapter,
    insertQuestion,
  } from '../queries'

  beforeEach(() => { mockSql.mockReset() })

  describe('getSubjects', () => {
    it('queries subjects table and returns rows', async () => {
      mockSql.mockResolvedValue([{ id: 's1', name: 'Audit' }])
      const result = await getSubjects()
      expect(result).toEqual([{ id: 's1', name: 'Audit' }])
      expect(mockSql).toHaveBeenCalledTimes(1)
    })
  })

  describe('getSections', () => {
    it('filters by subject_id', async () => {
      mockSql.mockResolvedValue([{ id: 'sec1', subject_id: 's1', name: 'SA', sort_order: 1, exam_weight_percent: 45 }])
      const result = await getSections('s1')
      expect(result).toHaveLength(1)
      expect(result[0].subjectId).toBe('s1')
    })
  })

  describe('getChapters', () => {
    it('filters by section_ids', async () => {
      mockSql.mockResolvedValue([
        { id: 'ch1', section_id: 'sec1', subject_id: 's1', name: 'Ch 1', sort_order: 1, exam_weight_percent: 12 },
      ])
      const result = await getChapters(['sec1'])
      expect(result).toHaveLength(1)
      expect(result[0].sectionId).toBe('sec1')
    })

    it('short-circuits on empty array (no SQL call)', async () => {
      const result = await getChapters([])
      expect(result).toEqual([])
      expect(mockSql).not.toHaveBeenCalled()
    })
  })

  describe('getChaptersByIds', () => {
    it('filters by chapter ids', async () => {
      mockSql.mockResolvedValue([
        { id: 'ch1', section_id: 'sec1', subject_id: 's1', name: 'Ch 1', sort_order: 1, exam_weight_percent: 12 },
      ])
      const result = await getChaptersByIds(['ch1'])
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('ch1')
    })

    it('short-circuits on empty array', async () => {
      const result = await getChaptersByIds([])
      expect(result).toEqual([])
      expect(mockSql).not.toHaveBeenCalled()
    })
  })

  describe('getQuestionsForChapters', () => {
    it('returns questions mapped to Question type', async () => {
      mockSql.mockResolvedValue([{
        id: 'q1', chapter_id: 'ch1', difficulty: 'easy', stem: 'Q?',
        option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D',
        correct_option: 'B', explanation: 'Because', icai_reference: null, source: 'bank',
      }])
      const result = await getQuestionsForChapters(['ch1'])
      expect(result).toHaveLength(1)
      expect(result[0].correctIndex).toBe(1) // B → index 1
      expect(result[0].options).toEqual(['A', 'B', 'C', 'D'])
    })

    it('short-circuits on empty array', async () => {
      const result = await getQuestionsForChapters([])
      expect(result).toEqual([])
      expect(mockSql).not.toHaveBeenCalled()
    })
  })

  describe('insertSubject', () => {
    it('calls sql with correct params', async () => {
      mockSql.mockResolvedValue([])
      await insertSubject('s1', 'Audit')
      expect(mockSql).toHaveBeenCalledTimes(1)
    })
  })
  ```

- [ ] **Step 2: Run — expect FAIL**

  Run: `npm test -- lib/__tests__/queries.test.ts`
  Expected: FAIL — cannot find module `../queries`

- [ ] **Step 3: Create `lib/queries.ts`**

  ```typescript
  import { getDb } from './db'
  import type { Subject, Section, Chapter, Question, CorrectOption } from './types'

  const OPTION_INDEX: Record<CorrectOption, 0 | 1 | 2 | 3> = { A: 0, B: 1, C: 2, D: 3 }

  function mapSection(row: Record<string, unknown>): Section {
    return {
      id: row.id as string,
      subjectId: row.subject_id as string,
      name: row.name as string,
      sortOrder: row.sort_order as number,
      examWeightPercent: Number(row.exam_weight_percent),
    }
  }

  function mapChapter(row: Record<string, unknown>): Chapter {
    return {
      id: row.id as string,
      sectionId: row.section_id as string,
      subjectId: row.subject_id as string,
      name: row.name as string,
      sortOrder: row.sort_order as number,
      examWeightPercent: Number(row.exam_weight_percent),
    }
  }

  function mapQuestion(row: Record<string, unknown>): Question {
    return {
      id: row.id as string,
      chapterId: row.chapter_id as string,
      stem: row.stem as string,
      options: [row.option_a as string, row.option_b as string, row.option_c as string, row.option_d as string],
      correctIndex: OPTION_INDEX[row.correct_option as CorrectOption],
      explanation: (row.explanation as string) ?? '',
      difficulty: row.difficulty as Question['difficulty'],
      source: (row.source as Question['source']) ?? 'bank',
      icaiReference: row.icai_reference as string | undefined,
    }
  }

  // ── Reads ─────────────────────────────────────────────────────────────

  export async function getSubjects(): Promise<Subject[]> {
    const sql = getDb()
    const rows = await sql`SELECT id, name FROM subjects ORDER BY name`
    return rows as Subject[]
  }

  export async function getSections(subjectId: string): Promise<Section[]> {
    const sql = getDb()
    const rows = await sql`
      SELECT id, subject_id, name, sort_order, exam_weight_percent
      FROM sections WHERE subject_id = ${subjectId}
      ORDER BY sort_order`
    return rows.map(mapSection)
  }

  export async function getChapters(sectionIds: string[]): Promise<Chapter[]> {
    if (sectionIds.length === 0) return []
    const sql = getDb()
    const rows = await sql`
      SELECT id, section_id, subject_id, name, sort_order, exam_weight_percent
      FROM chapters WHERE section_id = ANY(${sectionIds}::text[])
      ORDER BY sort_order`
    return rows.map(mapChapter)
  }

  export async function getChaptersByIds(chapterIds: string[]): Promise<Chapter[]> {
    if (chapterIds.length === 0) return []
    const sql = getDb()
    const rows = await sql`
      SELECT id, section_id, subject_id, name, sort_order, exam_weight_percent
      FROM chapters WHERE id = ANY(${chapterIds}::text[])
      ORDER BY sort_order`
    return rows.map(mapChapter)
  }

  export async function getQuestionsForChapters(chapterIds: string[]): Promise<Question[]> {
    if (chapterIds.length === 0) return []
    const sql = getDb()
    const rows = await sql`
      SELECT id, chapter_id, difficulty, stem, option_a, option_b, option_c, option_d,
             correct_option, explanation, icai_reference, source
      FROM questions WHERE chapter_id = ANY(${chapterIds}::text[])
      ORDER BY random()`
    return rows.map(mapQuestion)
  }

  // ── Writes (admin) ────────────────────────────────────────────────────

  export async function insertSubject(id: string, name: string): Promise<void> {
    const sql = getDb()
    await sql`INSERT INTO subjects (id, name) VALUES (${id}, ${name})
              ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`
  }

  export async function insertSection(s: Section): Promise<void> {
    const sql = getDb()
    await sql`INSERT INTO sections (id, subject_id, name, sort_order, exam_weight_percent)
              VALUES (${s.id}, ${s.subjectId}, ${s.name}, ${s.sortOrder}, ${s.examWeightPercent})
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                sort_order = EXCLUDED.sort_order,
                exam_weight_percent = EXCLUDED.exam_weight_percent`
  }

  export async function insertChapter(c: Chapter): Promise<void> {
    const sql = getDb()
    await sql`INSERT INTO chapters (id, section_id, subject_id, name, sort_order, exam_weight_percent)
              VALUES (${c.id}, ${c.sectionId}, ${c.subjectId}, ${c.name}, ${c.sortOrder}, ${c.examWeightPercent})
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                sort_order = EXCLUDED.sort_order,
                exam_weight_percent = EXCLUDED.exam_weight_percent`
  }

  export async function insertQuestion(q: {
    id: string; chapterId: string; difficulty: string; stem: string;
    optionA: string; optionB: string; optionC: string; optionD: string;
    correctOption: string; explanation: string; icaiReference?: string; source?: string;
  }): Promise<void> {
    const sql = getDb()
    await sql`INSERT INTO questions (id, chapter_id, difficulty, stem, option_a, option_b, option_c, option_d,
                correct_option, explanation, icai_reference, source)
              VALUES (${q.id}, ${q.chapterId}, ${q.difficulty}, ${q.stem},
                ${q.optionA}, ${q.optionB}, ${q.optionC}, ${q.optionD},
                ${q.correctOption}, ${q.explanation}, ${q.icaiReference ?? null}, ${q.source ?? 'bank'})
              ON CONFLICT (id) DO UPDATE SET
                stem = EXCLUDED.stem, option_a = EXCLUDED.option_a, option_b = EXCLUDED.option_b,
                option_c = EXCLUDED.option_c, option_d = EXCLUDED.option_d,
                correct_option = EXCLUDED.correct_option, explanation = EXCLUDED.explanation,
                icai_reference = EXCLUDED.icai_reference, difficulty = EXCLUDED.difficulty`
  }
  ```

- [ ] **Step 4: Run tests — expect PASS**

  Run: `npm test -- lib/__tests__/queries.test.ts`

- [ ] **Step 5: Commit**

  ```bash
  git add lib/queries.ts lib/__tests__/queries.test.ts
  git commit -m "feat: add Neon query layer for knowledge graph and questions"
  ```

---

## Task 4: CSV parser + tests

**Files:**
- Create: `lib/csvParser.ts`
- Create: `lib/__tests__/csvParser.test.ts`

- [ ] **Step 1: Write failing tests**

  Create `lib/__tests__/csvParser.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest'
  import { parseSyllabusCsv, parseQuestionsCsv } from '../csvParser'

  const SYLLABUS_CSV = `subject_id,subject_name,section_id,section_name,section_weight,chapter_id,chapter_name,chapter_weight,sort_order
ca-inter-audit,CA Intermediate — Auditing,sa-standards,Standards on Auditing,45,ch04,Risk Assessment,12,4
ca-inter-audit,CA Intermediate — Auditing,sa-standards,Standards on Auditing,45,ch05,Fraud,7,5
ca-inter-audit,CA Intermediate — Auditing,company-audit,Company Audit,30,ch10,The Company Audit,9,10`

  const QUESTIONS_CSV = `chapter_id,difficulty,stem,option_a,option_b,option_c,option_d,correct_option,explanation,icai_reference
ca-inter-audit/sa-standards/ch04,medium,"What is risk?",A answer,B answer,C answer,D answer,B,Because B,SA 315`

  describe('parseSyllabusCsv', () => {
    it('extracts subjects, sections, and chapters', () => {
      const result = parseSyllabusCsv(SYLLABUS_CSV)
      expect(result.subjects).toHaveLength(1)
      expect(result.subjects[0].id).toBe('ca-inter-audit')
      expect(result.sections).toHaveLength(2) // sa-standards + company-audit (deduplicated)
      expect(result.chapters).toHaveLength(3)
    })

    it('deduplicates subjects and sections', () => {
      const result = parseSyllabusCsv(SYLLABUS_CSV)
      const subjectIds = result.subjects.map(s => s.id)
      expect(new Set(subjectIds).size).toBe(subjectIds.length)
      const sectionIds = result.sections.map(s => s.id)
      expect(new Set(sectionIds).size).toBe(sectionIds.length)
    })

    it('builds correct composite chapter IDs', () => {
      const result = parseSyllabusCsv(SYLLABUS_CSV)
      expect(result.chapters[0].id).toContain('/')
    })

    it('throws on missing required columns', () => {
      expect(() => parseSyllabusCsv('foo,bar\n1,2')).toThrow()
    })
  })

  describe('parseQuestionsCsv', () => {
    it('parses questions with correct fields', () => {
      const result = parseQuestionsCsv(QUESTIONS_CSV)
      expect(result).toHaveLength(1)
      expect(result[0].correctOption).toBe('B')
      expect(result[0].chapterId).toBe('ca-inter-audit/sa-standards/ch04')
    })

    it('throws on invalid correct_option', () => {
      const bad = QUESTIONS_CSV.replace(',B,', ',E,')
      expect(() => parseQuestionsCsv(bad)).toThrow()
    })
  })
  ```

- [ ] **Step 2: Run — expect FAIL**

  Run: `npm test -- lib/__tests__/csvParser.test.ts`

- [ ] **Step 3: Create `lib/csvParser.ts`**

  ```typescript
  import type { Section, Chapter } from './types'

  interface SyllabusRow {
    subject_id: string; subject_name: string
    section_id: string; section_name: string; section_weight: string
    chapter_id: string; chapter_name: string; chapter_weight: string; sort_order: string
  }

  interface ParsedSyllabus {
    subjects: { id: string; name: string }[]
    sections: Section[]
    chapters: Chapter[]
  }

  interface ParsedQuestion {
    chapterId: string; difficulty: string; stem: string
    optionA: string; optionB: string; optionC: string; optionD: string
    correctOption: string; explanation: string; icaiReference?: string
  }

  function parseCsvRows(text: string): Record<string, string>[] {
    const lines = text.trim().split('\n')
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      // Handle quoted fields with commas
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue }
        if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
        current += char
      }
      values.push(current.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })
      return row
    })
  }

  const REQUIRED_SYLLABUS_COLS = ['subject_id', 'subject_name', 'section_id', 'section_name', 'section_weight', 'chapter_id', 'chapter_name', 'chapter_weight', 'sort_order']
  const REQUIRED_QUESTION_COLS = ['chapter_id', 'difficulty', 'stem', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation']

  export function parseSyllabusCsv(text: string): ParsedSyllabus {
    const rows = parseCsvRows(text)
    const headers = Object.keys(rows[0] ?? {})
    for (const col of REQUIRED_SYLLABUS_COLS) {
      if (!headers.includes(col)) throw new Error(`Missing required column: ${col}`)
    }

    const subjectMap = new Map<string, string>()
    const sectionMap = new Map<string, Section>()
    const chapters: Chapter[] = []

    for (const row of rows as unknown as SyllabusRow[]) {
      subjectMap.set(row.subject_id, row.subject_name)

      const sectionFullId = `${row.subject_id}/${row.section_id}`
      if (!sectionMap.has(sectionFullId)) {
        sectionMap.set(sectionFullId, {
          id: sectionFullId,
          subjectId: row.subject_id,
          name: row.section_name,
          sortOrder: parseInt(row.sort_order) || 0,
          examWeightPercent: parseFloat(row.section_weight) || 0,
        })
      }

      const chapterFullId = `${row.subject_id}/${row.section_id}/${row.chapter_id}`
      chapters.push({
        id: chapterFullId,
        sectionId: sectionFullId,
        subjectId: row.subject_id,
        name: row.chapter_name,
        sortOrder: parseInt(row.sort_order) || 0,
        examWeightPercent: parseFloat(row.chapter_weight) || 0,
      })
    }

    return {
      subjects: [...subjectMap.entries()].map(([id, name]) => ({ id, name })),
      sections: [...sectionMap.values()],
      chapters,
    }
  }

  const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D'])

  export function parseQuestionsCsv(text: string): ParsedQuestion[] {
    const rows = parseCsvRows(text)
    const headers = Object.keys(rows[0] ?? {})
    for (const col of REQUIRED_QUESTION_COLS) {
      if (!headers.includes(col)) throw new Error(`Missing required column: ${col}`)
    }

    return rows.map((row, i) => {
      const correctOption = row.correct_option?.toUpperCase()
      if (!VALID_OPTIONS.has(correctOption)) {
        throw new Error(`Row ${i + 2}: invalid correct_option "${row.correct_option}" — must be A, B, C, or D`)
      }
      return {
        chapterId: row.chapter_id,
        difficulty: row.difficulty,
        stem: row.stem,
        optionA: row.option_a,
        optionB: row.option_b,
        optionC: row.option_c,
        optionD: row.option_d,
        correctOption,
        explanation: row.explanation ?? '',
        icaiReference: row.icai_reference || undefined,
      }
    })
  }
  ```

- [ ] **Step 4: Run tests — expect PASS**

  Run: `npm test -- lib/__tests__/csvParser.test.ts`

- [ ] **Step 5: Commit**

  ```bash
  git add lib/csvParser.ts lib/__tests__/csvParser.test.ts
  git commit -m "feat: CSV parser for syllabus and question bank uploads"
  ```

---

## Task 5: Admin API routes (CSV upload → Neon)

**Files:**
- Create: `app/api/admin/upload-syllabus/route.ts`
- Create: `app/api/admin/upload-questions/route.ts`

- [ ] **Step 1: Create syllabus upload route**

  Create `app/api/admin/upload-syllabus/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server'
  import { parseSyllabusCsv } from '@/lib/csvParser'
  import { insertSubject, insertSection, insertChapter } from '@/lib/queries'

  export async function POST(request: Request) {
    const authHeader = request.headers.get('x-admin-password')
    if (authHeader !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

      const text = await file.text()
      const { subjects, sections, chapters } = parseSyllabusCsv(text)

      for (const s of subjects) await insertSubject(s.id, s.name)
      for (const s of sections) await insertSection(s)
      for (const c of chapters) await insertChapter(c)

      return NextResponse.json({
        message: 'Syllabus uploaded',
        counts: { subjects: subjects.length, sections: sections.length, chapters: chapters.length },
      })
    } catch (err) {
      console.error('[admin/upload-syllabus]', err)
      const message = err instanceof Error ? err.message : 'Upload failed'
      return NextResponse.json({ error: message }, { status: 422 })
    }
  }
  ```

- [ ] **Step 2: Create questions upload route**

  Create `app/api/admin/upload-questions/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server'
  import { parseQuestionsCsv } from '@/lib/csvParser'
  import { insertQuestion } from '@/lib/queries'
  import { nanoid } from 'nanoid'

  export async function POST(request: Request) {
    const authHeader = request.headers.get('x-admin-password')
    if (authHeader !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

      const text = await file.text()
      const questions = parseQuestionsCsv(text)

      let inserted = 0
      for (const q of questions) {
        await insertQuestion({
          id: `bank-${nanoid(8)}`,
          chapterId: q.chapterId,
          difficulty: q.difficulty,
          stem: q.stem,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          explanation: q.explanation,
          icaiReference: q.icaiReference,
          source: 'bank',
        })
        inserted++
      }

      return NextResponse.json({ message: 'Questions uploaded', count: inserted })
    } catch (err) {
      console.error('[admin/upload-questions]', err)
      const message = err instanceof Error ? err.message : 'Upload failed'
      return NextResponse.json({ error: message }, { status: 422 })
    }
  }
  ```

- [ ] **Step 3: Build check**

  Run: `npm run build`
  Expected: may have errors from old files still referencing deleted types — that's expected, these files are deleted in Task 11. Confirm the two new routes compile cleanly in isolation.

- [ ] **Step 4: Commit**

  ```bash
  git add app/api/admin/
  git commit -m "feat: admin API routes for syllabus and question CSV uploads"
  ```

---

## Task 6: Admin dashboard UI

**Files:**
- Create: `app/admin/page.tsx` (replace existing if present)
- Create: `components/admin/AdminShell.tsx`

- [ ] **Step 1: Create AdminShell client component**

  Create `components/admin/AdminShell.tsx`:
  ```typescript
  'use client'
  import { useState } from 'react'

  export function AdminShell() {
    const [password, setPassword] = useState('')
    const [authed, setAuthed] = useState(false)
    const [status, setStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleUpload(endpoint: string, file: File) {
      setLoading(true)
      setStatus(null)
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'x-admin-password': password },
          body: form,
        })
        const data = await res.json()
        setStatus(res.ok ? `Success: ${JSON.stringify(data)}` : `Error: ${data.error}`)
      } catch {
        setStatus('Network error')
      } finally {
        setLoading(false)
      }
    }

    if (!authed) {
      return (
        <div className="mx-auto max-w-md px-6 py-20">
          <h1 className="mb-6 text-2xl font-black">Admin</h1>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
          />
          <button
            onClick={() => { if (password) setAuthed(true) }}
            className="w-full rounded-lg bg-black px-6 py-3 text-sm font-bold text-white"
          >
            Enter
          </button>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-8 text-2xl font-black">Content Manager</h1>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold">Upload Syllabus (CSV)</h2>
          <p className="mb-3 text-sm text-gray-500">
            Columns: subject_id, subject_name, section_id, section_name, section_weight,
            chapter_id, chapter_name, chapter_weight, sort_order
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleUpload('/api/admin/upload-syllabus', file)
            }}
            className="text-sm"
          />
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-bold">Upload Questions (CSV)</h2>
          <p className="mb-3 text-sm text-gray-500">
            Columns: chapter_id, difficulty, stem, option_a, option_b, option_c, option_d,
            correct_option, explanation, icai_reference
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleUpload('/api/admin/upload-questions', file)
            }}
            className="text-sm"
          />
        </section>

        {loading && <p className="text-sm text-gray-500">Uploading...</p>}
        {status && (
          <div className={`rounded-lg p-4 text-sm ${status.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {status}
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Create admin page**

  Create (or replace) `app/admin/page.tsx`:
  ```typescript
  import { AdminShell } from '@/components/admin/AdminShell'

  export default function AdminPage() {
    return (
      <main className="min-h-screen bg-white">
        <AdminShell />
      </main>
    )
  }
  ```

- [ ] **Step 3: Build check**

  Run: `npm run build`

- [ ] **Step 4: Commit**

  ```bash
  git add app/admin/page.tsx components/admin/AdminShell.tsx
  git commit -m "feat: admin dashboard with CSV upload for syllabus and questions"
  ```

---

## Task 7: Adaptive engine (pure functions)

**Files:**
- Create: `lib/adaptiveEngine.ts`
- Create: `lib/__tests__/adaptiveEngine.test.ts`

- [ ] **Step 1: Write failing tests**

  Create `lib/__tests__/adaptiveEngine.test.ts`:
  ```typescript
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
  ```

- [ ] **Step 2: Run — expect FAIL**

  Run: `npm test -- lib/__tests__/adaptiveEngine.test.ts`

- [ ] **Step 3: Create `lib/adaptiveEngine.ts`**

  ```typescript
  import type { AdaptiveState, Question } from './types'

  const STEPS = { easy: 0.3, medium: 0.5, hard: 0.8 } as const
  const MIN_QUESTIONS = 10
  const STREAK_STOP = 4

  export function updateTheta(
    state: AdaptiveState,
    difficulty: Question['difficulty'],
    wasCorrect: boolean
  ): AdaptiveState {
    const delta = STEPS[difficulty] * (wasCorrect ? 1 : -1)
    return {
      ...state,
      theta: Math.max(-2, Math.min(2, state.theta + delta)),
      consecutiveCorrect: wasCorrect ? state.consecutiveCorrect + 1 : 0,
      consecutiveWrong: wasCorrect ? 0 : state.consecutiveWrong + 1,
      questionsAnswered: state.questionsAnswered + 1,
    }
  }

  // Generic so it works with both full `Question` and client-safe `ClientQuestion`
  // (PracticeShell passes ClientQuestion — no correctIndex is needed here)
  export function selectNext<Q extends { id: string; difficulty: Question['difficulty'] }>(
    pool: Q[],
    state: AdaptiveState
  ): Q | null {
    const remaining = pool.filter(q => !state.answeredIds.includes(q.id))
    if (remaining.length === 0) return null

    const target: Question['difficulty'] =
      state.theta > 0.5 ? 'hard' : state.theta < -0.5 ? 'easy' : 'medium'

    const order: Question['difficulty'][] =
      target === 'hard' ? ['hard', 'medium', 'easy']
      : target === 'easy' ? ['easy', 'medium', 'hard']
      : ['medium', 'easy', 'hard']

    for (const diff of order) {
      const candidates = remaining.filter(q => q.difficulty === diff)
      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)]
      }
    }
    return remaining[0]
  }

  export function shouldStop(state: AdaptiveState, poolSize: number): boolean {
    if (state.questionsAnswered >= poolSize) return true
    if (state.questionsAnswered < MIN_QUESTIONS) return false
    if (state.consecutiveCorrect >= STREAK_STOP && state.theta >= 0.8) return true
    if (state.consecutiveWrong >= STREAK_STOP && state.theta <= -0.8) return true
    return false
  }
  ```

- [ ] **Step 4: Run tests — all PASS**

  Run: `npm test -- lib/__tests__/adaptiveEngine.test.ts`

- [ ] **Step 5: Commit**

  ```bash
  git add lib/adaptiveEngine.ts lib/__tests__/adaptiveEngine.test.ts
  git commit -m "feat: adaptive engine pure functions (updateTheta, selectNext, shouldStop)"
  ```

---

## Task 8: Scoring functions (readiness + section breakdown)

**Files:**
- Modify: `lib/scoring.ts`
- Modify: `lib/__tests__/scoring.test.ts`

- [ ] **Step 1: Rewrite `lib/scoring.ts`**

  Replace the entire file:
  ```typescript
  import type { ChapterScore, SectionScore, ReadinessScore, Tier, Section, Chapter } from './types'

  function getTier(percentage: number): Tier {
    if (percentage >= 70) return 'strong'
    if (percentage >= 40) return 'moderate'
    return 'weak'
  }

  interface Scorable { chapterId: string; correctIndex: number }

  export function calculateChapterScores(
    questions: Scorable[],
    answers: (number | null)[],
    chapters: Chapter[]
  ): ChapterScore[] {
    const chapterMap = Object.fromEntries(chapters.map(c => [c.id, c]))
    const tally = new Map<string, { correct: number; total: number }>()

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const entry = tally.get(q.chapterId) ?? { correct: 0, total: 0 }
      entry.total++
      if (answers[i] === q.correctIndex) entry.correct++
      tally.set(q.chapterId, entry)
    }

    const scores: ChapterScore[] = []
    for (const [chapterId, { correct, total }] of tally.entries()) {
      const ch = chapterMap[chapterId]
      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
      scores.push({
        chapterId,
        chapterName: ch?.name ?? chapterId,
        sectionId: ch?.sectionId ?? '',
        correct, total, percentage,
        tier: getTier(percentage),
      })
    }

    const order: Record<Tier, number> = { weak: 0, moderate: 1, strong: 2 }
    return scores.sort((a, b) => order[a.tier] - order[b.tier])
  }

  export function getSectionScores(
    chapterScores: ChapterScore[],
    sections: Section[]
  ): SectionScore[] {
    const sectionMap = Object.fromEntries(sections.map(s => [s.id, s]))

    // Always emit all sections that were in scope (even if 0 questions answered)
    const tally = new Map<string, { correct: number; total: number; chapterIds: string[] }>()
    for (const s of sections) {
      tally.set(s.id, { correct: 0, total: 0, chapterIds: [] })
    }

    for (const cs of chapterScores) {
      const entry = tally.get(cs.sectionId)
      if (!entry) continue
      entry.correct += cs.correct
      entry.total += cs.total
      entry.chapterIds.push(cs.chapterId)
    }

    return [...tally.entries()].map(([sectionId, { correct, total, chapterIds }]) => {
      const section = sectionMap[sectionId]
      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0
      return {
        sectionId,
        sectionName: section?.name ?? sectionId,
        correct, total, percentage,
        tier: getTier(percentage),
        chapterIds,
      }
    })
  }

  export function calculateReadinessScore(
    chapterScores: ChapterScore[],
    chapters: Chapter[]
  ): ReadinessScore {
    const chapterMap = Object.fromEntries(chapters.map(c => [c.id, c]))
    let weightedSum = 0
    let totalWeight = 0

    for (const cs of chapterScores) {
      const ch = chapterMap[cs.chapterId]
      const weight = ch?.examWeightPercent ?? 1
      weightedSum += cs.percentage * weight
      totalWeight += weight
    }

    const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
    const tier = getTier(score)
    const label =
      tier === 'strong' ? 'Likely to clear' :
      tier === 'moderate' ? 'Borderline — needs focused prep' :
      'Needs significant work'

    return { score, tier, label }
  }

  export function calculateOverallScore(
    questions: Scorable[],
    answers: (number | null)[]
  ): { correct: number; total: number; percentage: number } {
    const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length
    return {
      correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
    }
  }
  ```

- [ ] **Step 2: Rewrite `lib/__tests__/scoring.test.ts`**

  Replace the entire file:
  ```typescript
  import { describe, it, expect } from 'vitest'
  import { calculateChapterScores, getSectionScores, calculateReadinessScore, calculateOverallScore } from '../scoring'
  import type { Chapter, Section, ChapterScore } from '../types'

  const chapters: Chapter[] = [
    { id: 'ch1', sectionId: 'sec1', subjectId: 's', name: 'Chapter 1', sortOrder: 1, examWeightPercent: 30 },
    { id: 'ch2', sectionId: 'sec1', subjectId: 's', name: 'Chapter 2', sortOrder: 2, examWeightPercent: 20 },
    { id: 'ch3', sectionId: 'sec2', subjectId: 's', name: 'Chapter 3', sortOrder: 3, examWeightPercent: 50 },
  ]

  const sections: Section[] = [
    { id: 'sec1', subjectId: 's', name: 'Section 1', sortOrder: 1, examWeightPercent: 50 },
    { id: 'sec2', subjectId: 's', name: 'Section 2', sortOrder: 2, examWeightPercent: 50 },
  ]

  const questions = [
    { chapterId: 'ch1', correctIndex: 0 },
    { chapterId: 'ch1', correctIndex: 1 },
    { chapterId: 'ch2', correctIndex: 2 },
    { chapterId: 'ch3', correctIndex: 0 },
    { chapterId: 'ch3', correctIndex: 1 },
  ]

  describe('calculateChapterScores', () => {
    it('computes correct percentages', () => {
      const answers = [0, 0, 2, 0, 0] // ch1: 1/2, ch2: 1/1, ch3: 1/2
      const scores = calculateChapterScores(questions, answers, chapters)
      expect(scores.find(s => s.chapterId === 'ch2')!.percentage).toBe(100)
    })

    it('sorts weak → strong', () => {
      const answers = [1, 1, 2, 1, 1] // ch1: 0/2 weak, ch2: 1/1 strong, ch3: 0/2 weak
      const scores = calculateChapterScores(questions, answers, chapters)
      expect(scores[0].tier).toBe('weak')
    })
  })

  describe('getSectionScores', () => {
    it('returns all sections even if some have no questions', () => {
      const chapterScores: ChapterScore[] = [
        { chapterId: 'ch1', chapterName: 'Ch1', sectionId: 'sec1', correct: 1, total: 2, percentage: 50, tier: 'moderate' },
      ]
      const result = getSectionScores(chapterScores, sections)
      expect(result).toHaveLength(2)
      const sec2 = result.find(s => s.sectionId === 'sec2')!
      expect(sec2.total).toBe(0)
      expect(sec2.tier).toBe('weak')
    })
  })

  describe('calculateReadinessScore', () => {
    it('all strong → tier strong, score >= 70', () => {
      const chapterScores: ChapterScore[] = chapters.map(c => ({
        chapterId: c.id, chapterName: c.name, sectionId: c.sectionId,
        correct: 2, total: 2, percentage: 100, tier: 'strong',
      }))
      const result = calculateReadinessScore(chapterScores, chapters)
      expect(result.score).toBe(100)
      expect(result.tier).toBe('strong')
    })

    it('all weak → tier weak, label contains "Needs"', () => {
      const chapterScores: ChapterScore[] = chapters.map(c => ({
        chapterId: c.id, chapterName: c.name, sectionId: c.sectionId,
        correct: 0, total: 2, percentage: 0, tier: 'weak',
      }))
      const result = calculateReadinessScore(chapterScores, chapters)
      expect(result.tier).toBe('weak')
      expect(result.label).toMatch(/needs/i)
    })
  })

  describe('calculateOverallScore', () => {
    it('computes correct/total/percentage', () => {
      const result = calculateOverallScore(questions, [0, 0, 2, 0, 0])
      expect(result.correct).toBe(3)
      expect(result.total).toBe(5)
      expect(result.percentage).toBe(60)
    })
  })
  ```

- [ ] **Step 3: Run tests**

  Run: `npm test -- lib/__tests__/scoring.test.ts`

- [ ] **Step 4: Commit**

  ```bash
  git add lib/scoring.ts lib/__tests__/scoring.test.ts
  git commit -m "feat: scoring with chapter, section, and readiness score functions"
  ```

---

## Task 9: Topic selection page

**Files:**
- Create: `app/select/page.tsx`
- Create: `components/select/TopicSelector.tsx`

- [ ] **Step 1: Create TopicSelector client component**

  Create `components/select/TopicSelector.tsx`:
  ```typescript
  'use client'
  import { useState } from 'react'
  import { useRouter } from 'next/navigation'
  import type { Subject, Section, Chapter } from '@/lib/types'

  interface Props {
    subjects: Subject[]
    sections: Section[]
    chapters: Chapter[]
  }

  export function TopicSelector({ subjects, sections, chapters }: Props) {
    const router = useRouter()
    const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id ?? '')
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())
    const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())

    const filteredSections = sections.filter(s => s.subjectId === selectedSubject)
    const filteredChapters = chapters.filter(c => selectedSections.has(c.sectionId))

    function toggleSection(id: string) {
      setSelectedSections(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          // Also remove chapters under this section
          setSelectedChapters(prevCh => {
            const nextCh = new Set(prevCh)
            chapters.filter(c => c.sectionId === id).forEach(c => nextCh.delete(c.id))
            return nextCh
          })
        } else {
          next.add(id)
          // Auto-select all chapters under this section
          setSelectedChapters(prevCh => {
            const nextCh = new Set(prevCh)
            chapters.filter(c => c.sectionId === id).forEach(c => nextCh.add(c.id))
            return nextCh
          })
        }
        return next
      })
    }

    function toggleChapter(id: string) {
      setSelectedChapters(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
    }

    function goToAssessment() {
      const params = new URLSearchParams({
        subject: selectedSubject,
        sections: [...selectedSections].join(','),
        chapters: [...selectedChapters].join(','),
      })
      router.push(`/assessment?${params}`)
    }

    function goToPractice(chapterId: string) {
      router.push(`/practice?chapter=${chapterId}`)
    }

    const hasSelection = selectedChapters.size > 0

    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-black">Choose Your Scope</h1>
        <p className="mb-8 text-sm text-gray-500">Select sections and chapters, then take an assessment or practice.</p>

        {subjects.length > 1 && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold">Subject</label>
            <select
              value={selectedSubject}
              onChange={e => { setSelectedSubject(e.target.value); setSelectedSections(new Set()); setSelectedChapters(new Set()) }}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="mb-8 space-y-4">
          {filteredSections.map(section => (
            <div key={section.id} className="rounded-xl border border-gray-100 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedSections.has(section.id)}
                  onChange={() => toggleSection(section.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-bold">{section.name}</span>
                <span className="ml-auto text-xs text-gray-400">{section.examWeightPercent}% weight</span>
              </label>

              {selectedSections.has(section.id) && (
                <div className="mt-3 ml-7 space-y-2">
                  {chapters.filter(c => c.sectionId === section.id).map(ch => (
                    <div key={ch.id} className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedChapters.has(ch.id)}
                          onChange={() => toggleChapter(ch.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{ch.name}</span>
                      </label>
                      <button
                        onClick={() => goToPractice(ch.id)}
                        className="text-xs text-gray-400 underline underline-offset-2 hover:text-black"
                      >
                        Practice →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {hasSelection && (
          <button
            onClick={goToAssessment}
            className="w-full rounded-xl bg-black px-8 py-4 text-sm font-bold text-white transition-opacity hover:opacity-80"
          >
            Take Readiness Assessment ({selectedChapters.size} chapter{selectedChapters.size !== 1 ? 's' : ''}) →
          </button>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Create select page (server component)**

  Create `app/select/page.tsx`:
  ```typescript
  import { getSubjects, getSections, getChapters } from '@/lib/queries'
  import { TopicSelector } from '@/components/select/TopicSelector'

  export const dynamic = 'force-dynamic'

  export default async function SelectPage() {
    const subjects = await getSubjects()
    if (subjects.length === 0) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-gray-500">No subjects available. Ask your admin to upload a syllabus.</p>
        </main>
      )
    }

    // Load all sections and chapters for all subjects
    const allSectionIds: string[] = []
    const allSections = []
    for (const s of subjects) {
      const secs = await getSections(s.id)
      allSections.push(...secs)
      allSectionIds.push(...secs.map(sec => sec.id))
    }
    const allChapters = allSectionIds.length > 0 ? await getChapters(allSectionIds) : []

    return (
      <main className="min-h-screen bg-white">
        <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
            <a href="/" className="text-base font-black">ClearPass</a>
          </div>
        </nav>
        <TopicSelector subjects={subjects} sections={allSections} chapters={allChapters} />
      </main>
    )
  }
  ```

- [ ] **Step 3: Build check**

  Run: `npm run build`

- [ ] **Step 4: Commit**

  ```bash
  git add app/select/ components/select/
  git commit -m "feat: topic selection page with subject/section/chapter picker"
  ```

---

## Task 10: Assessment API routes

**Files:**
- Create: `app/api/assessment/questions/route.ts`
- Create: `app/api/assessment/report/route.ts`

- [ ] **Step 1: Create assessment questions route**

  Create `app/api/assessment/questions/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server'
  import { getQuestionsForChapters, getChaptersByIds } from '@/lib/queries'
  import { signSession } from '@/lib/sessionToken'
  import { nanoid } from 'nanoid'
  import type { ClientQuestion, Question, Chapter } from '@/lib/types'

  const ASSESSMENT_TARGET = 20

  // Proportional allocation by `examWeightPercent`, floor-rounded, remainders distributed
  // by descending fractional part. Chapters with no questions contribute 0.
  function allocateSlotsByWeight(
    chapters: Chapter[],
    questionsByChapter: Map<string, Question[]>,
    target: number
  ): Map<string, number> {
    const eligible = chapters.filter(c => (questionsByChapter.get(c.id)?.length ?? 0) > 0)
    if (eligible.length === 0) return new Map()

    const totalWeight = eligible.reduce((sum, c) => sum + (c.examWeightPercent || 1), 0)
    const raw = eligible.map(c => {
      const weight = c.examWeightPercent || 1
      const ideal = (weight / totalWeight) * target
      const available = questionsByChapter.get(c.id)!.length
      return { id: c.id, ideal, available }
    })

    // First pass: floor allocation, capped at available
    const allocation = new Map<string, number>()
    let assigned = 0
    for (const r of raw) {
      const n = Math.min(Math.floor(r.ideal), r.available)
      allocation.set(r.id, n)
      assigned += n
    }

    // Distribute remaining slots by descending fractional part, still capped at availability
    const remaining = target - assigned
    if (remaining > 0) {
      const sorted = [...raw]
        .map(r => ({ ...r, frac: r.ideal - Math.floor(r.ideal), current: allocation.get(r.id)! }))
        .sort((a, b) => b.frac - a.frac)

      let left = remaining
      for (const r of sorted) {
        if (left === 0) break
        if (r.current < r.available) {
          allocation.set(r.id, r.current + 1)
          left--
        }
      }
      // Second sweep: if some chapters hit availability cap, spread leftover to any chapter with room
      if (left > 0) {
        for (const r of sorted) {
          while (left > 0 && (allocation.get(r.id)! < r.available)) {
            allocation.set(r.id, allocation.get(r.id)! + 1)
            left--
          }
        }
      }
    }

    return allocation
  }

  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const chapterIds = searchParams.get('chapters')?.split(',').filter(Boolean) ?? []

    if (chapterIds.length === 0) {
      return NextResponse.json({ error: 'chapters param required' }, { status: 400 })
    }

    try {
      const [allQuestions, chapters] = await Promise.all([
        getQuestionsForChapters(chapterIds),
        getChaptersByIds(chapterIds),
      ])

      if (allQuestions.length === 0) {
        return NextResponse.json({ error: 'No questions found for selected chapters' }, { status: 404 })
      }

      // Group randomised questions by chapter (already ORDER BY random() from query)
      const questionsByChapter = new Map<string, Question[]>()
      for (const q of allQuestions) {
        const arr = questionsByChapter.get(q.chapterId) ?? []
        arr.push(q)
        questionsByChapter.set(q.chapterId, arr)
      }

      // Weighted allocation by examWeightPercent, capped at ASSESSMENT_TARGET
      // (if total available < target, we take all available)
      const effectiveTarget = Math.min(ASSESSMENT_TARGET, allQuestions.length)
      const allocation = allocateSlotsByWeight(chapters, questionsByChapter, effectiveTarget)

      const selected: Question[] = []
      for (const [chapterId, count] of allocation.entries()) {
        const pool = questionsByChapter.get(chapterId) ?? []
        selected.push(...pool.slice(0, count))
      }

      // Final shuffle so the assessment doesn't appear chapter-grouped to the student
      for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[selected[i], selected[j]] = [selected[j], selected[i]]
      }

      const sessionId = nanoid()
      const sessionToken = signSession(
        sessionId,
        selected.map(q => ({ id: q.id, chapterId: q.chapterId, correctIndex: q.correctIndex }))
      )

      const clientQuestions: ClientQuestion[] = selected.map(
        ({ correctIndex: _, explanation: __, ...rest }) => rest
      )

      return NextResponse.json({ sessionId, sessionToken, questions: clientQuestions })
    } catch (err) {
      console.error('[/api/assessment/questions]', err)
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
    }
  }
  ```

- [ ] **Step 2: Create assessment report route**

  Create `app/api/assessment/report/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server'
  import { verifySession } from '@/lib/sessionToken'
  import { calculateChapterScores, getSectionScores, calculateReadinessScore, calculateOverallScore } from '@/lib/scoring'
  import { getChaptersByIds, getSections } from '@/lib/queries'
  import { generateReport } from '@/lib/gemini'
  import type { AssessmentReport, StudyPlan } from '@/lib/types'

  const FALLBACK_PLAN: StudyPlan = {
    weekSummary: 'Focus on your weakest chapters this week.',
    days: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1, focus: 'Revision', tasks: ['Review chapter notes', 'Practice MCQs'], estimatedHours: 2,
    })),
    priorityChapters: [],
  }

  export async function POST(request: Request) {
    let body: { sessionToken: string; answers: (number | null)[] }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!body.sessionToken || !Array.isArray(body.answers)) {
      return NextResponse.json({ error: 'sessionToken and answers required' }, { status: 400 })
    }

    let sessionPayload: { sessionId: string; questions: { id: string; chapterId: string; correctIndex: number }[] }
    try {
      sessionPayload = verifySession(body.sessionToken)
    } catch {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    const { sessionId, questions } = sessionPayload
    if (body.answers.length !== questions.length) {
      return NextResponse.json({ error: 'Answer count mismatch' }, { status: 422 })
    }

    const scorable = questions.map(q => ({ chapterId: q.chapterId, correctIndex: q.correctIndex }))

    // Direct lookup: fetch only the chapters we need, then their sections
    const chapterIds = [...new Set(scorable.map(q => q.chapterId))]
    const relevantChapters = await getChaptersByIds(chapterIds)

    if (relevantChapters.length === 0) {
      return NextResponse.json({ error: 'Chapters not found — content may have been removed' }, { status: 404 })
    }

    // All chapters in a session belong to a single subject (scope picker enforces this)
    const subjectId = relevantChapters[0].subjectId
    const allSections = await getSections(subjectId)
    const sectionIds = new Set(relevantChapters.map(c => c.sectionId))
    const relevantSections = allSections.filter(s => sectionIds.has(s.id))

    const chapterScores = calculateChapterScores(scorable, body.answers, relevantChapters)
    const sectionScores = getSectionScores(chapterScores, relevantSections)
    const readinessScore = calculateReadinessScore(chapterScores, relevantChapters)
    const overall = calculateOverallScore(scorable, body.answers)

    let weaknessAnalysis = ''
    let studyPlan: StudyPlan = {
      ...FALLBACK_PLAN,
      priorityChapters: chapterScores.filter(s => s.tier === 'weak').map(s => s.chapterId),
    }

    try {
      const aiOutput = await generateReport(chapterScores, readinessScore.score)
      weaknessAnalysis = aiOutput.weaknessAnalysis
      studyPlan = aiOutput.studyPlan
    } catch (err) {
      console.error('[assessment/report] Gemini failed:', err)
    }

    const report: AssessmentReport = {
      sessionId,
      readinessScore,
      overallScore: overall.percentage,
      correctCount: overall.correct,
      totalCount: overall.total,
      chapterScores,
      sectionScores,
      weaknessAnalysis,
      studyPlan,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ report })
  }
  ```

- [ ] **Step 3: Build check**

  Run: `npm run build`

- [ ] **Step 4: Commit**

  ```bash
  git add app/api/assessment/
  git commit -m "feat: assessment API routes (questions + report with readiness score)"
  ```

---

## Task 11: Assessment UI (test page + results page)

**Files:**
- Create: `app/assessment/page.tsx`
- Create: `components/assessment/AssessmentShell.tsx`
- Create: `app/assessment/results/page.tsx`
- Create: `components/assessment/AssessmentResults.tsx`
- Create: `components/results/SectionBreakdown.tsx`
- Modify: `components/results/ScoreOverview.tsx`
- Modify: `components/results/NodeBreakdown.tsx` (switch prop type from `NodeScore[]` → `ChapterScore[]`)

- [ ] **Step 1: Create AssessmentShell**

  Create `components/assessment/AssessmentShell.tsx`:
  ```typescript
  'use client'
  import { useState, useEffect } from 'react'
  import { useRouter, useSearchParams } from 'next/navigation'
  import { AnimatePresence } from 'framer-motion'
  import { ProgressBar } from '@/components/test/ProgressBar'
  import { QuestionCard } from '@/components/test/QuestionCard'
  import type { ClientQuestion, AssessmentSession } from '@/lib/types'

  export function AssessmentShell() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [questions, setQuestions] = useState<ClientQuestion[]>([])
    const [sessionId, setSessionId] = useState('')
    const [sessionToken, setSessionToken] = useState('')
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<(number | null)[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [startedAt] = useState(() => new Date().toISOString())

    useEffect(() => {
      const chapters = searchParams.get('chapters')
      if (!chapters) { setError('No chapters selected'); setLoading(false); return }

      fetch(`/api/assessment/questions?chapters=${chapters}`)
        .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
        .then(data => {
          setQuestions(data.questions)
          setSessionId(data.sessionId)
          setSessionToken(data.sessionToken)
          setAnswers(Array(data.questions.length).fill(null))
        })
        .catch(() => setError('Failed to load questions'))
        .finally(() => setLoading(false))
    }, [searchParams])

    function handleSelect(optionIndex: number) {
      setAnswers(prev => { const next = [...prev]; next[currentIndex] = optionIndex; return next })
      if (currentIndex < questions.length - 1) {
        setTimeout(() => setCurrentIndex(i => i + 1), 300)
      }
    }

    function handleSubmit() {
      setIsSubmitting(true)
      const session: AssessmentSession = {
        sessionId, sessionToken,
        subjectId: searchParams.get('subject') ?? '',
        scope: {
          sectionIds: searchParams.get('sections')?.split(',') ?? [],
          chapterIds: searchParams.get('chapters')?.split(',') ?? [],
        },
        questions, answers, startedAt,
        submittedAt: new Date().toISOString(),
      }
      sessionStorage.setItem('clearpass_assessment', JSON.stringify(session))
      router.push('/assessment/results')
    }

    if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>
    if (error) return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-sm text-red-500">{error}</p></div>
    if (questions.length === 0) return null

    const answeredCount = answers.filter(a => a !== null).length
    const allAnswered = answeredCount === questions.length

    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <ProgressBar current={currentIndex + 1} total={questions.length} />
        <AnimatePresence mode="wait">
          <QuestionCard
            key={currentIndex}
            question={questions[currentIndex]}
            questionNumber={currentIndex + 1}
            selectedIndex={answers[currentIndex]}
            onSelect={handleSelect}
          />
        </AnimatePresence>
        <div className="mt-8 flex items-center justify-between">
          <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
            className="text-sm text-gray-500 underline underline-offset-4 disabled:opacity-30">← Previous</button>
          {currentIndex < questions.length - 1 && (
            <button onClick={() => setCurrentIndex(i => i + 1)}
              className="text-sm text-gray-800 underline underline-offset-4">Next →</button>
          )}
        </div>
        {(currentIndex === questions.length - 1 || allAnswered) && (
          <div className="mt-8 text-center">
            <button onClick={handleSubmit} disabled={!allAnswered || isSubmitting}
              className="rounded-xl bg-black px-10 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-40">
              {isSubmitting ? 'Submitting…' : 'Submit Assessment →'}
            </button>
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Create assessment page**

  Create `app/assessment/page.tsx`:
  ```typescript
  import { Suspense } from 'react'
  import { AssessmentShell } from '@/components/assessment/AssessmentShell'

  export default function AssessmentPage() {
    return (
      <main className="min-h-screen bg-white">
        <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
            <a href="/" className="text-base font-black">ClearPass</a>
            <span className="text-xs text-gray-500">Readiness Assessment</span>
          </div>
        </nav>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>}>
          <AssessmentShell />
        </Suspense>
      </main>
    )
  }
  ```

- [ ] **Step 3: Create SectionBreakdown component**

  Create `components/results/SectionBreakdown.tsx`:
  ```typescript
  import type { SectionScore } from '@/lib/types'

  const TIER_STYLES = {
    strong: { bar: 'bg-green-500', badge: 'bg-green-50 text-green-700', label: 'Strong' },
    moderate: { bar: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700', label: 'Moderate' },
    weak: { bar: 'bg-red-400', badge: 'bg-red-50 text-red-700', label: 'Needs work' },
  }

  interface Props { sectionScores: SectionScore[] }

  export function SectionBreakdown({ sectionScores }: Props) {
    return (
      <div className="mb-10">
        <h2 className="mb-1 text-xl font-bold">Gap Analysis by Section</h2>
        <p className="mb-5 text-sm text-gray-500">Weak sections indicate deeper syllabus gaps.</p>
        <div className="flex flex-col gap-4">
          {sectionScores.map(s => {
            const styles = TIER_STYLES[s.tier]
            return (
              <div key={s.sectionId} className="rounded-xl border border-gray-100 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{s.sectionName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${styles.badge}`}>{styles.label}</span>
                </div>
                <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${styles.bar} transition-all duration-700`} style={{ width: `${s.percentage}%` }} />
                </div>
                <p className="text-xs text-gray-400">{s.correct}/{s.total} correct ({s.percentage}%)</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Update ScoreOverview to accept readinessScore**

  Modify `components/results/ScoreOverview.tsx` — add optional `readinessScore` prop:
  ```typescript
  import type { ReadinessScore } from '@/lib/types'

  interface Props {
    overallScore: number
    correctCount: number
    totalCount: number
    readinessScore?: ReadinessScore
  }

  export function ScoreOverview({ overallScore, correctCount, totalCount, readinessScore }: Props) {
    const displayScore = readinessScore?.score ?? overallScore
    const r = 40
    const circumference = 2 * Math.PI * r
    const filled = (displayScore / 100) * circumference
    const color = displayScore >= 70 ? '#16a34a' : displayScore >= 40 ? '#ca8a04' : '#dc2626'
    const bgColor = displayScore >= 70 ? 'bg-green-50' : displayScore >= 40 ? 'bg-yellow-50' : 'bg-red-50'
    const textColor = displayScore >= 70 ? 'text-green-700' : displayScore >= 40 ? 'text-yellow-700' : 'text-red-700'

    return (
      <div className="mb-10 flex flex-col items-center gap-4 text-center">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${filled} ${circumference - filled}`} strokeLinecap="round"
            transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
          <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="800" fill="#000">{displayScore}%</text>
        </svg>
        {readinessScore && (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${bgColor} ${textColor}`}>{readinessScore.label}</span>
        )}
        <p className="text-sm text-gray-500">
          {correctCount} correct out of {totalCount} questions
          {readinessScore && <><br /><span className="text-xs text-gray-400">Weighted by ICAI exam mark allocation</span></>}
        </p>
      </div>
    )
  }
  ```

- [ ] **Step 4b: Update `components/results/NodeBreakdown.tsx` to accept `ChapterScore[]`**

  Replace the entire file contents:
  ```typescript
  import type { ChapterScore } from '@/lib/types'

  const TIER_STYLES = {
    weak:     'bg-red-50 text-red-700 border-red-200',
    moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    strong:   'bg-green-50 text-green-700 border-green-200',
  }

  interface Props { chapterScores: ChapterScore[] }

  export function NodeBreakdown({ chapterScores }: Props) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-black">Chapter Breakdown</h2>
        <div className="space-y-2">
          {chapterScores.map(cs => (
            <div key={cs.chapterId}
              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium">{cs.chapterName}</p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-black transition-all"
                    style={{ width: `${cs.percentage}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="text-sm text-gray-500">{cs.correct}/{cs.total}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[cs.tier]}`}>
                  {cs.tier}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  ```
  Note: The component name stays `NodeBreakdown` (to keep file churn minimal) but its prop interface now uses `chapterScores: ChapterScore[]`. This resolves the `NodeScore` type that no longer exists after Task 2.

- [ ] **Step 5: Create AssessmentResults**

  Create `components/assessment/AssessmentResults.tsx`:
  ```typescript
  'use client'
  import { useEffect, useState } from 'react'
  import { useRouter } from 'next/navigation'
  import { ScoreOverview } from '@/components/results/ScoreOverview'
  import { NodeBreakdown } from '@/components/results/NodeBreakdown'
  import { SectionBreakdown } from '@/components/results/SectionBreakdown'
  import { WeaknessAnalysis } from '@/components/results/WeaknessAnalysis'
  import { StudyPlanCard } from '@/components/results/StudyPlanCard'
  import type { AssessmentSession, AssessmentReport } from '@/lib/types'

  export function AssessmentResults() {
    const router = useRouter()
    const [report, setReport] = useState<AssessmentReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      const raw = sessionStorage.getItem('clearpass_assessment')
      if (!raw) { router.replace('/select'); return }

      let session: AssessmentSession
      try { session = JSON.parse(raw) } catch { router.replace('/select'); return }

      fetch('/api/assessment/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: session.sessionToken, answers: session.answers }),
      })
        .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
        .then(data => setReport(data.report))
        .catch(() => setError('Failed to generate report'))
        .finally(() => setLoading(false))
    }, [router])

    if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /><p className="ml-3 text-sm text-gray-500">Analysing your results…</p></div>
    if (error || !report) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3"><p className="text-sm text-red-500">{error ?? 'Something went wrong'}</p></div>

    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-black">Your Readiness Report</h1>
        <p className="mb-8 text-sm text-gray-500">Based on {report.totalCount} questions across {report.sectionScores.length} sections</p>
        <ScoreOverview overallScore={report.overallScore} correctCount={report.correctCount}
          totalCount={report.totalCount} readinessScore={report.readinessScore} />
        <SectionBreakdown sectionScores={report.sectionScores} />
        <NodeBreakdown chapterScores={report.chapterScores} />
        <WeaknessAnalysis weaknessAnalysis={report.weaknessAnalysis} />
        <StudyPlanCard studyPlan={report.studyPlan} />
        <div className="flex gap-4 justify-center">
          <a href="/select" className="rounded-xl border border-gray-200 px-8 py-3 text-sm font-bold hover:border-gray-400">Change Scope</a>
          <button onClick={() => { sessionStorage.removeItem('clearpass_assessment'); router.push('/select') }}
            className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white hover:opacity-80">Retake →</button>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 6: Create assessment results page**

  Create `app/assessment/results/page.tsx`:
  ```typescript
  import { AssessmentResults } from '@/components/assessment/AssessmentResults'

  export default function AssessmentResultsPage() {
    return (
      <main className="min-h-screen bg-white">
        <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
            <a href="/" className="text-base font-black">ClearPass</a>
            <span className="text-xs text-gray-500">Results</span>
          </div>
        </nav>
        <AssessmentResults />
      </main>
    )
  }
  ```

- [ ] **Step 7: Build check**

  Run: `npm run build`

- [ ] **Step 8: Commit**

  ```bash
  git add app/assessment/ components/assessment/ components/results/SectionBreakdown.tsx components/results/ScoreOverview.tsx components/results/NodeBreakdown.tsx
  git commit -m "feat: assessment test flow with results, section breakdown, and readiness score"
  ```

---

## Task 12: Practice API route + practice UI

**Files:**
- Create: `app/api/practice/questions/route.ts`
- Create: `app/practice/page.tsx`
- Create: `components/practice/PracticeShell.tsx`

- [ ] **Step 1: Create practice questions route**

  Create `app/api/practice/questions/route.ts`:
  ```typescript
  import { NextResponse } from 'next/server'
  import { getQuestionsForChapters } from '@/lib/queries'
  import type { ClientQuestion } from '@/lib/types'

  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get('chapter')
    if (!chapterId) return NextResponse.json({ error: 'chapter param required' }, { status: 400 })

    try {
      const questions = await getQuestionsForChapters([chapterId])
      if (questions.length === 0) return NextResponse.json({ error: 'No questions for this chapter' }, { status: 404 })

      // For practice, send all questions as pool — adaptive engine picks from them client-side
      // Include correctIndex so the client can give instant feedback and track theta accurately
      const clientQuestions: ClientQuestion[] = questions.map(
        ({ correctIndex: _, explanation: __, ...rest }) => rest
      )

      // Also send answer key separately for instant feedback (practice mode only — not assessment)
      const answerKey = Object.fromEntries(questions.map(q => [q.id, { correctIndex: q.correctIndex, explanation: q.explanation }]))

      return NextResponse.json({ questions: clientQuestions, answerKey })
    } catch (err) {
      console.error('[/api/practice/questions]', err)
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
    }
  }
  ```

- [ ] **Step 2: Create PracticeShell**

  Create `components/practice/PracticeShell.tsx`:
  ```typescript
  'use client'
  import { useState, useEffect, useCallback } from 'react'
  import { useSearchParams } from 'next/navigation'
  import { AnimatePresence } from 'framer-motion'
  import { QuestionCard } from '@/components/test/QuestionCard'
  import { updateTheta, selectNext, shouldStop } from '@/lib/adaptiveEngine'
  import type { ClientQuestion, AdaptiveState } from '@/lib/types'

  interface AnswerKey { [questionId: string]: { correctIndex: number; explanation: string } }

  const INITIAL: AdaptiveState = {
    theta: 0, answeredIds: [], consecutiveCorrect: 0, consecutiveWrong: 0, questionsAnswered: 0,
  }

  export function PracticeShell() {
    const searchParams = useSearchParams()
    const [pool, setPool] = useState<ClientQuestion[]>([])
    const [answerKey, setAnswerKey] = useState<AnswerKey>({})
    const [state, setState] = useState<AdaptiveState>(INITIAL)
    const [current, setCurrent] = useState<ClientQuestion | null>(null)
    const [selected, setSelected] = useState<number | null>(null)
    const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ correct: 0, total: 0 })
    const [done, setDone] = useState(false)

    useEffect(() => {
      const chapter = searchParams.get('chapter')
      if (!chapter) return
      fetch(`/api/practice/questions?chapter=${chapter}`)
        .then(r => r.json())
        .then((data: { questions: ClientQuestion[]; answerKey: AnswerKey }) => {
          setPool(data.questions)
          setAnswerKey(data.answerKey)
          // selectNext is generic — accepts any { id, difficulty } shape
          const first = selectNext(data.questions, INITIAL)
          setCurrent(first)
        })
        .finally(() => setLoading(false))
    }, [searchParams])

    const handleSelect = useCallback((optionIndex: number) => {
      if (!current || selected !== null) return
      setSelected(optionIndex)

      const key = answerKey[current.id]
      const wasCorrect = key ? optionIndex === key.correctIndex : false
      setFeedback({ correct: wasCorrect, explanation: key?.explanation ?? '' })
      setStats(prev => ({ correct: prev.correct + (wasCorrect ? 1 : 0), total: prev.total + 1 }))

      // Advance after delay
      setTimeout(() => {
        const nextState = updateTheta(
          { ...state, answeredIds: [...state.answeredIds, current.id] },
          current.difficulty,
          wasCorrect
        )

        if (shouldStop(nextState, pool.length)) {
          setDone(true)
          setState(nextState)
          return
        }

        const next = selectNext(pool, nextState)
        setState(nextState)
        setCurrent(next)
        setSelected(null)
        setFeedback(null)
      }, 1500)
    }, [current, selected, state, pool, answerKey])

    if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>

    if (done || !current) {
      const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      return (
        <div className="mx-auto max-w-2xl px-6 py-12 text-center">
          <h2 className="mb-4 text-2xl font-black">Practice Complete</h2>
          <p className="mb-2 text-4xl font-black">{pct}%</p>
          <p className="mb-6 text-sm text-gray-500">{stats.correct}/{stats.total} correct</p>
          <a href="/select" className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white hover:opacity-80">Back to Topics</a>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-4 flex items-center justify-between text-xs text-gray-400">
          <span>{stats.total} answered · {stats.correct} correct</span>
          <span className="rounded-full border border-gray-100 px-2.5 py-0.5 capitalize">{current.difficulty}</span>
        </div>
        <AnimatePresence mode="wait">
          <QuestionCard key={current.id} question={current} questionNumber={stats.total + 1}
            selectedIndex={selected} onSelect={handleSelect} />
        </AnimatePresence>
        {feedback && (
          <div className={`mt-4 rounded-xl p-4 text-sm ${feedback.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="font-bold">{feedback.correct ? 'Correct!' : 'Incorrect'}</p>
            {feedback.explanation && <p className="mt-1 text-xs opacity-80">{feedback.explanation}</p>}
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 3: Create practice page**

  Create `app/practice/page.tsx`:
  ```typescript
  import { Suspense } from 'react'
  import { PracticeShell } from '@/components/practice/PracticeShell'

  export default function PracticePage() {
    return (
      <main className="min-h-screen bg-white">
        <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
            <a href="/" className="text-base font-black">ClearPass</a>
            <span className="text-xs text-gray-500">Adaptive Practice</span>
          </div>
        </nav>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>}>
          <PracticeShell />
        </Suspense>
      </main>
    )
  }
  ```

- [ ] **Step 4: Build check**

  Run: `npm run build`

- [ ] **Step 5: Commit**

  ```bash
  git add app/practice/ components/practice/ app/api/practice/
  git commit -m "feat: adaptive practice mode with instant feedback and theta tracking"
  ```

---

## Task 13: Landing page updates

**Files:**
- Modify: `components/landing/Hero.tsx`
- Modify: `components/landing/Features.tsx`
- Modify: `components/landing/Nav.tsx`

- [ ] **Step 1: Update Hero with two CTAs**

  In `components/landing/Hero.tsx`, replace the button group:
  ```tsx
  <div className="flex flex-wrap items-center gap-4">
    <a href="/select"
      className="rounded-lg bg-black px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-80">
      Take Free Diagnostic Test →
    </a>
    <button onClick={scrollToWaitlist}
      className="rounded-lg border border-gray-300 px-7 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-500">
      Join the Waitlist
    </button>
  </div>
  ```

- [ ] **Step 2: Update Features with links**

  In `components/landing/Features.tsx`, update the features array and add `href` for each:
  - Feature 01 (Readiness Report): `href: '/select'`
  - Feature 02 (AI Study Plan): no href (generated after assessment)
  - Feature 03 (Adaptive MCQ Practice): `href: '/select'`

- [ ] **Step 3: Update Nav**

  In `components/landing/Nav.tsx`, replace the "Test Yourself" link:
  ```tsx
  <a href="/select"
    className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-400">
    Get Started
  </a>
  ```

- [ ] **Step 4: Build check**

  Run: `npm run build`

- [ ] **Step 5: Commit**

  ```bash
  git add components/landing/Hero.tsx components/landing/Features.tsx components/landing/Nav.tsx
  git commit -m "feat: update landing page CTAs for assessment and practice"
  ```

---

## Task 14: Delete old files + update gemini.ts

**Files:**
- Delete: `lib/knowledgeGraph.ts`, `lib/questionBank.ts`, `lib/testEngine.ts`
- Delete: `lib/__tests__/testEngine.test.ts`, `lib/__tests__/questionBank.test.ts`
- Delete: `app/test/page.tsx`, `app/results/page.tsx`, `app/api/questions/route.ts`, `app/api/report/route.ts`
- Delete: `components/test/TestShell.tsx`, `components/test/SubmitButton.tsx`, `components/results/ResultsShell.tsx`
- Modify: `lib/gemini.ts` (remove `generateQuestionsForNode` entirely; rewrite `generateReport` for `ChapterScore` + `priorityChapters`)

- [ ] **Step 0: Extract seed data BEFORE deletions (prerequisite for Task 15)**

  Task 15 needs the 24 questions currently hardcoded in `lib/questionBank.ts` and the chapter titles in `lib/knowledgeGraph.ts`. Extract them NOW, before `rm` runs in Step 2:

  1. Open `lib/questionBank.ts` and `lib/knowledgeGraph.ts` in your editor.
  2. Create `data/seed-syllabus.csv` with header `subject_id,subject_name,section_id,section_name,section_weight,chapter_id,chapter_name,chapter_weight,sort_order` and one row per chapter in `CA_INTER_AUDIT_NODES`. Group chapters into 3–4 sections (engineer's judgment — e.g. "Standards on Auditing", "Company Audit", "Audit Procedures"). Set `section_weight` so they sum to 100, `chapter_weight` so all chapters sum to 100.
  3. Create `data/seed-questions.csv` with header `chapter_id,difficulty,stem,option_a,option_b,option_c,option_d,correct_option,explanation,icai_reference` and one row per question in `QUESTION_BANK`. Convert `correctIndex` (0–3) → `correct_option` (A–D). The `chapter_id` must match the composite id format `${subject_id}/${section_id}/${chapter_id}` from the syllabus CSV.
  4. Do NOT commit yet — the seed files commit happens in Task 15 Step 10.

- [ ] **Step 1: Rewrite `lib/gemini.ts`**

  Replace the entire file contents:
  ```typescript
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
    const raw = JSON.parse(result.response.text()) as ReportOutput

    // Defensive: ensure priorityChapters exists even if Gemini drops it
    if (!Array.isArray(raw.studyPlan.priorityChapters)) {
      raw.studyPlan.priorityChapters = chapterScores
        .filter(cs => cs.tier === 'weak')
        .map(cs => cs.chapterId)
    }

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
  ```

  **Removals in this rewrite:**
  - `generateQuestionsForNode` — DELETED (dead code; only caller was `testEngine.ts`, which is also deleted below). Phase 2 can re-add AI question generation if needed.
  - `KnowledgeNode` import — gone (type deleted in Task 2).
  - `NodeScore` import — replaced by `ChapterScore`.
  - `priorityNodes` in the prompt JSON — renamed to `priorityChapters` to match the `StudyPlan` type.

- [ ] **Step 2: Delete old files**

  ```bash
  rm lib/knowledgeGraph.ts lib/questionBank.ts lib/testEngine.ts
  rm lib/__tests__/testEngine.test.ts lib/__tests__/questionBank.test.ts
  rm app/test/page.tsx app/results/page.tsx
  rm app/api/questions/route.ts app/api/report/route.ts
  rm components/test/TestShell.tsx components/test/SubmitButton.tsx components/results/ResultsShell.tsx
  ```

- [ ] **Step 3: Grep for leftover references**

  Run: `grep -rn "knowledgeGraph\|questionBank\|testEngine\|KnowledgeNode\|NodeScore\|generateQuestionsForNode\|SessionQuestion.*nodeId" --include="*.ts" --include="*.tsx" .`
  Expected: no matches in `lib/`, `app/`, or `components/`. Any match is a stale import that must be fixed before continuing.

- [ ] **Step 4: Run full test suite**

  Run: `npm test`
  Expected: All new tests pass, no imports pointing to deleted files

- [ ] **Step 5: Build check**

  Run: `npm run build`
  Expected: Clean build with no broken imports

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "chore: remove hardcoded question bank, rewrite gemini.ts for ChapterScore"
  ```

---

## Task 15: Seed data + deploy

- [ ] **Step 1: Verify seed CSVs exist**

  The seed CSVs (`data/seed-syllabus.csv` and `data/seed-questions.csv`) should already be present from Task 14 Step 0. If not, go back to Task 14 Step 0 before deleting — you need `lib/questionBank.ts` and `lib/knowledgeGraph.ts` to reconstruct them.

  Run: `ls -l data/seed-syllabus.csv data/seed-questions.csv`
  Expected: both files exist and are non-empty.

- [ ] **Step 2: Upload seed data via admin (local)**

  Run `npm run dev`, open `http://localhost:3000/admin`, enter the admin password, and upload both CSVs. Verify:
  - [ ] Syllabus upload succeeds (shows subject/section/chapter counts)
  - [ ] Questions upload succeeds (shows question count)

- [ ] **Step 3: Smoke test locally**

  - [ ] `/select` — shows sections + chapters from DB
  - [ ] Select chapters → click "Take Readiness Assessment" → `/assessment` loads questions
  - [ ] Answer all → submit → results page shows readiness score + section + chapter breakdown
  - [ ] Go back → pick one chapter → click "Practice →" → adaptive practice works with instant feedback
  - [ ] `/admin` — CSV uploads work

- [ ] **Step 4: Verify Vercel env vars**

  Run: `vercel env ls`
  Expected: `DATABASE_URL`, `ADMIN_PASSWORD`, `GEMINI_API_KEY` all set for production + preview + development. Add any missing ones with `vercel env add <NAME>`.

- [ ] **Step 5: Run the schema on production Neon**

  Open the Neon console for the production database (the one whose URL is in Vercel's `DATABASE_URL`). Paste and run the contents of `lib/schema.sql`.

- [ ] **Step 6: Run full test suite**

  Run: `npm test`
  Expected: All tests PASS

- [ ] **Step 7: Deploy**

  Run: `npm run deploy:prod`

- [ ] **Step 8: Upload seed data to production**

  Open the deployed admin page at `https://clearpass.snpventures.in/admin`, enter the admin password, and upload both seed CSVs. (Alternative: use `psql $DATABASE_URL -c "\copy ..."` to bulk-import directly.)

- [ ] **Step 9: Smoke test production**

  - [ ] `clearpass.snpventures.in` — landing page loads with updated CTAs
  - [ ] Click "Take Free Diagnostic Test →" → `/select` → pick sections → assessment works
  - [ ] Practice mode works with instant feedback
  - [ ] Admin CSV upload works
  - [ ] Waitlist form still works

- [ ] **Step 10: Commit seed data**

  ```bash
  git add data/
  git commit -m "chore: add seed syllabus and questions CSVs"
  ```

---

## Phase 2 Notes (after traction)

When Phase 2 starts:
1. **Server-side adaptive sessions:** Replace HMAC token with Postgres `sessions` table. Add `/api/session/next` endpoint (POST: `{ sessionId, lastAnswerIndex }` → `{ question, done }`). This gives the server access to `correctIndex` for accurate theta tracking. The `adaptiveEngine.ts` pure functions port directly.
2. **Telegram bot:** Webhook calls the same `/api/session/next` REST endpoint. Shared state automatically via Postgres sessions.
3. **Predicted Exam Score:** Once 200+ students complete assessments and later share their ICAI results, calibrate a linear regression from readiness scores to actual exam scores. Rename "Readiness Score" to "Predicted Score" only after calibration.
4. **Question bank growth:** The admin CSV upload scales to thousands of questions. Add a "Review" status to questions and a simple moderation flow in `/admin`.
5. **IRT calibration:** After 200+ responses per question, compute true IRT item parameters (discrimination, difficulty, guessing) and replace the manual Easy/Medium/Hard tags.
