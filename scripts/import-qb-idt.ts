// Validate and (optionally) ingest the IDT (Indirect Tax Laws) syllabus and
// question banks from data/QB IDT/.
//
// IDT is a new subject — the syllabus must be inserted first, then questions.
// The syllabus CSV uses bare integer chapter IDs (1, 2, 3, ...); we normalize
// these to chXX format for consistency with existing subjects (AFM, Audit, FR).
// Question CSVs have inconsistent in-row chapter_id values, so we map by
// filename only.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/import-qb-idt.ts             # dry-run
//   npx tsx --env-file=.env.local scripts/import-qb-idt.ts --ingest    # write to DB

import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import { neon } from '@neondatabase/serverless'

const QB_DIR = resolve(process.cwd(), 'data/QB IDT')
const SYLLABUS_FILE = 'seed-syllabus-ca-final-idt (3).csv'

// Filename → chapter_number (matches sort_order in syllabus). Padded to chXX
// when joining with the DB chapter ID.
const FILE_TO_CHAPTER_NUMBER: Record<string, number> = {
  'supply_under_gst_qbank (1).csv': 1,
  'charge_of_gst_qbank.csv':        2,
  'place_of_supply_qbank.csv':      3,
  'exemptions_qbank.csv':           4,
  'tos_qbank.csv':                  5,
  'value_of_supply_qbank.csv':      6,
  'itc_qbank.csv':                  7,
  'Registration_MCQ_Bank.csv':      8,
  'ecommerce_qbank.csv':            12,
  'returns_qbank (1).csv':          13,
}

const REQUIRED_QUESTION_COLS = ['chapter_id', 'difficulty', 'stem', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation'] as const
const REQUIRED_SYLLABUS_COLS = ['subject_id', 'subject_name', 'section_id', 'section_name', 'section_weight', 'chapter_id', 'chapter_name', 'chapter_weight', 'sort_order'] as const
const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D'])
const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard'])

const padChapter = (n: number) => `ch${String(n).padStart(2, '0')}`

interface SyllabusEntry {
  subjectId: string
  subjectName: string
  sectionId: string         // full path: ca-final-idt/<section_slug>
  sectionName: string
  sectionWeight: number
  sectionSortOrder: number
  chapterId: string         // full path: ca-final-idt/<section_slug>/chXX
  chapterName: string
  chapterWeight: number
  chapterSortOrder: number
}

interface ParsedQuestion {
  rowIndex: number
  difficulty: string
  stem: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctOption: string
  explanation: string
  icaiReference: string
}

interface FileReport {
  file: string
  dbChapterId: string | null
  rowCount: number
  errors: string[]
  rows: ParsedQuestion[]
  skipped: boolean
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += ch; i++; continue
    }
    if (ch === '"') { inQuotes = true; i++; continue }
    if (ch === ',') { row.push(field); field = ''; i++; continue }
    if (ch === '\r') { i++; continue }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += ch; i++
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  if (rows.length === 0) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1)
    .filter(r => r.some(cell => cell.trim().length > 0))
    .map(r => {
      const obj: Record<string, string> = {}
      headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim() })
      return obj
    })
}

function loadSyllabus(): SyllabusEntry[] {
  const text = readFileSync(resolve(QB_DIR, SYLLABUS_FILE), 'utf8')
  const rows = parseCsv(text)
  if (rows.length === 0) throw new Error('Syllabus CSV is empty')

  const headers = Object.keys(rows[0])
  for (const col of REQUIRED_SYLLABUS_COLS) {
    if (!headers.includes(col)) throw new Error(`Syllabus missing column: ${col}`)
  }

  return rows.map(r => {
    const subjectId = r.subject_id
    const sectionSlug = r.section_id
    const chapterNum = parseInt(r.chapter_id, 10)
    if (Number.isNaN(chapterNum)) throw new Error(`Bad chapter_id "${r.chapter_id}" in syllabus`)
    return {
      subjectId,
      subjectName: r.subject_name,
      sectionId: `${subjectId}/${sectionSlug}`,
      sectionName: r.section_name,
      sectionWeight: parseFloat(r.section_weight) || 0,
      sectionSortOrder: parseInt(r.sort_order, 10) || 0,
      chapterId: `${subjectId}/${sectionSlug}/${padChapter(chapterNum)}`,
      chapterName: r.chapter_name,
      chapterWeight: parseFloat(r.chapter_weight) || 0,
      chapterSortOrder: parseInt(r.sort_order, 10) || 0,
    }
  })
}

function validateQuestionFile(filePath: string, fileName: string, dbChapterId: string | null): FileReport {
  const errors: string[] = []
  const rows: ParsedQuestion[] = []

  if (!dbChapterId) {
    return { file: fileName, dbChapterId, rowCount: 0, errors, rows, skipped: true }
  }

  const text = readFileSync(filePath, 'utf8')
  const parsed = parseCsv(text)

  if (parsed.length === 0) {
    errors.push('CSV is empty')
    return { file: fileName, dbChapterId, rowCount: 0, errors, rows, skipped: false }
  }

  const headers = Object.keys(parsed[0])
  for (const col of REQUIRED_QUESTION_COLS) {
    if (!headers.includes(col)) errors.push(`Missing required column: ${col}`)
  }
  if (errors.length > 0) return { file: fileName, dbChapterId, rowCount: parsed.length, errors, rows, skipped: false }

  parsed.forEach((row, idx) => {
    const rowIndex = idx + 2
    const correctOption = row.correct_option?.toUpperCase()
    const difficulty = row.difficulty?.toLowerCase()
    const rowErrors: string[] = []

    if (!VALID_OPTIONS.has(correctOption)) rowErrors.push(`bad correct_option "${row.correct_option}"`)
    if (!VALID_DIFFICULTY.has(difficulty)) rowErrors.push(`bad difficulty "${row.difficulty}"`)
    if (!row.stem?.trim()) rowErrors.push('empty stem')
    for (const opt of ['option_a', 'option_b', 'option_c', 'option_d'] as const) {
      if (!row[opt]?.trim()) rowErrors.push(`empty ${opt}`)
    }
    if (rowErrors.length > 0) {
      errors.push(`row ${rowIndex}: ${rowErrors.join('; ')}`)
      return
    }
    rows.push({
      rowIndex,
      difficulty,
      stem: row.stem,
      optionA: row.option_a,
      optionB: row.option_b,
      optionC: row.option_c,
      optionD: row.option_d,
      correctOption,
      explanation: row.explanation ?? '',
      icaiReference: row.icai_reference ?? '',
    })
  })

  return { file: fileName, dbChapterId, rowCount: parsed.length, errors, rows, skipped: false }
}

function stableQuestionId(chapterId: string, stem: string): string {
  const hash = createHash('sha256').update(`${chapterId}\n${stem}`).digest('hex').slice(0, 12)
  return `bank-${hash}`
}

async function main() {
  const ingest = process.argv.includes('--ingest')

  // 1) Load and validate syllabus
  console.log('\n=== IDT Syllabus ===\n')
  const syllabus = loadSyllabus()
  const subjects = new Map<string, string>()
  const sections = new Map<string, { id: string; subjectId: string; name: string; sortOrder: number; weight: number }>()
  const chapters: { id: string; sectionId: string; subjectId: string; name: string; sortOrder: number; weight: number }[] = []

  for (const e of syllabus) {
    subjects.set(e.subjectId, e.subjectName)
    if (!sections.has(e.sectionId)) {
      sections.set(e.sectionId, {
        id: e.sectionId,
        subjectId: e.subjectId,
        name: e.sectionName,
        sortOrder: e.sectionSortOrder,
        weight: e.sectionWeight,
      })
    }
    chapters.push({
      id: e.chapterId,
      sectionId: e.sectionId,
      subjectId: e.subjectId,
      name: e.chapterName,
      sortOrder: e.chapterSortOrder,
      weight: e.chapterWeight,
    })
  }

  console.log(`✓ Subjects: ${subjects.size} (${[...subjects.keys()].join(', ')})`)
  console.log(`✓ Sections: ${sections.size}`)
  console.log(`✓ Chapters: ${chapters.length}`)

  // Build the chapter-number → DB chapter ID lookup so question files can be mapped.
  const chapterNumToDbId = new Map<number, string>()
  for (const ch of chapters) {
    const m = ch.id.match(/\/ch(\d{2})$/)
    if (m) chapterNumToDbId.set(parseInt(m[1], 10), ch.id)
  }

  // 2) Validate question files
  console.log('\n=== IDT Question Files ===\n')
  const allFiles = readdirSync(QB_DIR).filter(f => f.endsWith('.csv') && f !== SYLLABUS_FILE).sort()
  const reports = allFiles.map(f => {
    const chNum = FILE_TO_CHAPTER_NUMBER[f]
    const dbChapterId = chNum !== undefined ? chapterNumToDbId.get(chNum) ?? null : null
    return validateQuestionFile(resolve(QB_DIR, f), f, dbChapterId)
  })

  let totalRows = 0
  let totalValidRows = 0
  let totalErrors = 0

  for (const r of reports) {
    const status = r.skipped ? '⊘' : r.errors.length === 0 ? '✓' : '✗'
    console.log(`${status} ${r.file}`)
    console.log(`    → DB chapter: ${r.dbChapterId ?? '(unmapped — skipped)'}`)
    console.log(`    rows parsed: ${r.rowCount}, valid: ${r.rows.length}, errors: ${r.errors.length}`)
    if (r.errors.length > 0) {
      r.errors.slice(0, 5).forEach(e => console.log(`    ! ${e}`))
      if (r.errors.length > 5) console.log(`    ! …and ${r.errors.length - 5} more`)
    }
    totalRows += r.rowCount
    totalValidRows += r.rows.length
    totalErrors += r.errors.length
  }

  console.log(`\nTotals: ${totalValidRows} valid rows, ${totalErrors} errors, across ${reports.filter(r => r.dbChapterId).length} mapped files (${reports.filter(r => !r.dbChapterId).length} unmapped).`)

  if (!ingest) {
    console.log('\nDry run complete. Re-run with --ingest to write to DB.')
    return
  }

  if (totalErrors > 0) {
    console.error('\nRefusing to ingest while validation errors exist. Fix the CSVs and retry.')
    process.exit(1)
  }

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1) }
  const sql = neon(dbUrl)

  // 3) Insert syllabus (idempotent UPSERTs).
  console.log('\nIngesting syllabus…')
  for (const [id, name] of subjects) {
    await sql`INSERT INTO subjects (id, name) VALUES (${id}, ${name})
              ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`
  }
  for (const s of sections.values()) {
    await sql`INSERT INTO sections (id, subject_id, name, sort_order, exam_weight_percent)
              VALUES (${s.id}, ${s.subjectId}, ${s.name}, ${s.sortOrder}, ${s.weight})
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                sort_order = EXCLUDED.sort_order,
                exam_weight_percent = EXCLUDED.exam_weight_percent`
  }
  for (const c of chapters) {
    await sql`INSERT INTO chapters (id, section_id, subject_id, name, sort_order, exam_weight_percent)
              VALUES (${c.id}, ${c.sectionId}, ${c.subjectId}, ${c.name}, ${c.sortOrder}, ${c.weight})
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                sort_order = EXCLUDED.sort_order,
                exam_weight_percent = EXCLUDED.exam_weight_percent`
  }
  console.log(`✓ Syllabus inserted: 1 subject, ${sections.size} sections, ${chapters.length} chapters`)

  // 4) Insert questions.
  console.log('\nIngesting questions…')
  let inserted = 0
  let conflicts = 0
  for (const report of reports) {
    if (!report.dbChapterId) continue
    for (const row of report.rows) {
      const id = stableQuestionId(report.dbChapterId, row.stem)
      const result = await sql`
        INSERT INTO questions (id, chapter_id, difficulty, stem, option_a, option_b, option_c, option_d, correct_option, explanation, icai_reference, source)
        VALUES (${id}, ${report.dbChapterId}, ${row.difficulty}, ${row.stem}, ${row.optionA}, ${row.optionB}, ${row.optionC}, ${row.optionD}, ${row.correctOption}, ${row.explanation}, ${row.icaiReference || null}, 'bank')
        ON CONFLICT (id) DO NOTHING
        RETURNING id`
      if (result.length > 0) inserted++
      else conflicts++
    }
  }
  console.log(`\nDone. Inserted: ${inserted}. Already-existed (skipped): ${conflicts}.`)
}

main().catch(err => { console.error(err); process.exit(1) })
