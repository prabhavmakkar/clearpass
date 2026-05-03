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
  getUserPurchasedSubjectIds,
  hasUserPurchasedSubject,
  getAccessibleChapterIds,
  getFreeChapterIds,
  getSubjectForChapter,
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

describe('getUserPurchasedSubjectIds', () => {
  it('returns subject ids for paid rows', async () => {
    mockSql.mockResolvedValue([{ subject_id: 'ca-final-afm' }, { subject_id: 'ca-final-audit' }])
    const result = await getUserPurchasedSubjectIds(7)
    expect(result).toEqual(['ca-final-afm', 'ca-final-audit'])
    expect(mockSql).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when no purchases', async () => {
    mockSql.mockResolvedValue([])
    expect(await getUserPurchasedSubjectIds(7)).toEqual([])
  })
})

describe('hasUserPurchasedSubject', () => {
  it('returns true when a row exists', async () => {
    mockSql.mockResolvedValue([{ '?column?': 1 }])
    expect(await hasUserPurchasedSubject(7, 'ca-final-afm')).toBe(true)
  })

  it('returns false when no row exists', async () => {
    mockSql.mockResolvedValue([])
    expect(await hasUserPurchasedSubject(7, 'ca-final-afm')).toBe(false)
  })
})

describe('getFreeChapterIds', () => {
  it('reads chapters where is_free_preview = true', async () => {
    mockSql.mockResolvedValue([{ id: 'ca-final-afm/derivatives/ch09' }, { id: 'ca-final-audit/quality-control/ch01' }])
    expect(await getFreeChapterIds()).toEqual(['ca-final-afm/derivatives/ch09', 'ca-final-audit/quality-control/ch01'])
  })
})

describe('getAccessibleChapterIds', () => {
  it('returns only free-preview chapters when userId is null', async () => {
    mockSql.mockResolvedValue([{ id: 'ca-final-afm/derivatives/ch09' }])
    const result = await getAccessibleChapterIds(null)
    expect(result).toEqual(new Set(['ca-final-afm/derivatives/ch09']))
    expect(mockSql).toHaveBeenCalledTimes(1)
  })

  it('returns free-preview + chapters of owned subjects when userId is set', async () => {
    mockSql.mockResolvedValue([
      { id: 'ca-final-afm/derivatives/ch09' },
      { id: 'ca-final-afm/strategy-risk-capbudget/ch01' },
      { id: 'ca-final-afm/strategy-risk-capbudget/ch02' },
    ])
    const result = await getAccessibleChapterIds(7)
    expect(result).toEqual(new Set([
      'ca-final-afm/derivatives/ch09',
      'ca-final-afm/strategy-risk-capbudget/ch01',
      'ca-final-afm/strategy-risk-capbudget/ch02',
    ]))
  })
})

describe('getSubjectForChapter', () => {
  it('returns subject id and name', async () => {
    mockSql.mockResolvedValue([{ id: 'ca-final-afm', name: 'CA Final — AFM' }])
    expect(await getSubjectForChapter('ca-final-afm/derivatives/ch01'))
      .toEqual({ id: 'ca-final-afm', name: 'CA Final — AFM' })
  })

  it('returns null when chapter does not exist', async () => {
    mockSql.mockResolvedValue([])
    expect(await getSubjectForChapter('ghost')).toBeNull()
  })
})
