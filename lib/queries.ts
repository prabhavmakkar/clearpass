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
    icaiReference: (row.icai_reference as string | null) ?? undefined,
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
