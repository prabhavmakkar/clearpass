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
