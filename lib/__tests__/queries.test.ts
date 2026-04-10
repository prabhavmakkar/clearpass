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
