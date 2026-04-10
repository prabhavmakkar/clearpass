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
  const lines = text.trim().split(/\r?\n/)
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
