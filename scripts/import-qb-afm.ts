// Validate and (optionally) ingest the QB AFM question banks from data/QB AFM/.
//
// The CSVs in data/QB AFM/ use a numeric chapter_id (e.g. "1.0", "16.0") that is
// the author's internal numbering — it does NOT match the DB chapter IDs which are
// path-style (e.g. "ca-final-afm/strategy-risk-capbudget/ch01"). This script maps
// each CSV file to its DB chapter via filename, validates every row, and (when
// invoked with --ingest) writes them via insertQuestion.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/import-qb-afm.ts             # dry-run
//   npx tsx --env-file=.env.local scripts/import-qb-afm.ts --ingest    # write to DB

import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import { neon } from '@neondatabase/serverless'

const QB_DIR = resolve(process.cwd(), 'data/QB AFM')

// Filename → DB chapter ID. aq_qbank.csv is intentionally absent — its mapping
// must be confirmed by the user before ingestion.
const FILE_TO_CHAPTER: Record<string, string> = {
  'financial_policy_qbank.csv':   'ca-final-afm/strategy-risk-capbudget/ch01',
  'security_analysis_qbank.csv':  'ca-final-afm/security-portfolio/ch04',
  'security_valuation_qbank.csv': 'ca-final-afm/security-portfolio/ch05',
  'portfolio_mgmt_qbank.csv':     'ca-final-afm/security-portfolio/ch06',
  'securitization_qbank.csv':     'ca-final-afm/security-portfolio/ch07',
  'mutual_funds_qbank.csv':       'ca-final-afm/security-portfolio/ch08',
  'intl_finance_qbank.csv':       'ca-final-afm/forex-intl/ch16',
  'interest_rate_qbank.csv':      'ca-final-afm/forex-intl/ch17',
  'ma_restructuring_qbank.csv':   'ca-final-afm/valuation-ma/ch19',
  'startup_finance_qbank.csv':    'ca-final-afm/startup/ch20',
}

const REQUIRED_COLS = ['chapter_id', 'difficulty', 'stem', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation'] as const
const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D'])
const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard'])

interface ParsedRow {
  rowIndex: number
  chapterIdRaw: string
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
  rows: ParsedRow[]
  skipped: boolean
}

// Minimal RFC-4180 CSV parser: handles quoted fields, embedded commas, escaped quotes ("").
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

function validateFile(filePath: string, fileName: string, dbChapterId: string | null): FileReport {
  const errors: string[] = []
  const rows: ParsedRow[] = []

  if (!dbChapterId) {
    return { file: fileName, dbChapterId, rowCount: 0, errors, rows, skipped: true }
  }

  const text = readFileSync(filePath, 'utf8')
  const parsed = parseCsv(text)

  if (parsed.length === 0) {
    errors.push('CSV is empty')
    return { file: fileName, dbChapterId, rowCount: 0, errors, rows }
  }

  const headers = Object.keys(parsed[0])
  for (const col of REQUIRED_COLS) {
    if (!headers.includes(col)) errors.push(`Missing required column: ${col}`)
  }
  if (errors.length > 0) return { file: fileName, dbChapterId, rowCount: parsed.length, errors, rows, skipped: false }

  parsed.forEach((row, idx) => {
    const rowIndex = idx + 2 // +2 because row 0 = header, and editors are 1-indexed
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
      chapterIdRaw: row.chapter_id,
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

  const files = readdirSync(QB_DIR).filter(f => f.endsWith('.csv')).sort()
  const reports = files.map(f =>
    validateFile(resolve(QB_DIR, f), f, FILE_TO_CHAPTER[f] ?? null)
  )

  console.log(`\n=== QB AFM Validation Report (${ingest ? 'INGEST' : 'DRY RUN'}) ===\n`)

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
    console.log()
  }

  console.log(`Totals: ${totalValidRows} valid rows, ${totalErrors} errors, across ${reports.filter(r => r.dbChapterId).length} mapped files (${reports.filter(r => !r.dbChapterId).length} unmapped).`)

  if (!ingest) {
    console.log('\nDry run complete. Re-run with --ingest to write to DB.')
    return
  }

  if (totalErrors > 0) {
    console.error('\nRefusing to ingest while validation errors exist. Fix the CSVs and retry.')
    process.exit(1)
  }

  // Verify all mapped DB chapters exist before any insert.
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1) }
  const sql = neon(dbUrl)

  const targetChapterIds = [...new Set(reports.filter(r => r.dbChapterId).map(r => r.dbChapterId!))]
  const existingRows = await sql`SELECT id FROM chapters WHERE id = ANY(${targetChapterIds}::text[])`
  const existing = new Set(existingRows.map(r => r.id as string))
  const missing = targetChapterIds.filter(id => !existing.has(id))
  if (missing.length > 0) {
    console.error('Missing DB chapters:', missing)
    process.exit(1)
  }

  console.log('\nIngesting…')
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
