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

export async function getQuestionsByIds(questionIds: string[]): Promise<Question[]> {
  if (questionIds.length === 0) return []
  const sql = getDb()
  const rows = await sql`
    SELECT id, chapter_id, difficulty, stem, option_a, option_b, option_c, option_d,
           correct_option, explanation, icai_reference, source
    FROM questions WHERE id = ANY(${questionIds}::text[])`
  return rows.map(mapQuestion)
}

export async function getQuestionCountsByChapter(): Promise<Record<string, number>> {
  const sql = getDb()
  const rows = await sql`SELECT chapter_id, count(*)::int as count FROM questions GROUP BY chapter_id`
  const result: Record<string, number> = {}
  for (const r of rows) result[r.chapter_id as string] = r.count as number
  return result
}

// ── Assessment Attempts ──────────────────────────────────────────────

export interface AttemptRow {
  id: string
  userId: number
  subjectId: string
  scope: Record<string, unknown>
  overallScore: number
  readinessScore: number
  readinessTier: string
  correctCount: number
  totalCount: number
  chapterScores: unknown[]
  sectionScores: unknown[]
  questionReview: unknown[]
  weaknessAnalysis: string
  studyPlan: Record<string, unknown>
  createdAt: string
}

export async function insertAttempt(a: AttemptRow): Promise<void> {
  const sql = getDb()
  await sql`INSERT INTO assessment_attempts
    (id, user_id, subject_id, scope, overall_score, readiness_score, readiness_tier,
     correct_count, total_count, chapter_scores, section_scores, question_review,
     weakness_analysis, study_plan)
    VALUES (${a.id}, ${a.userId}, ${a.subjectId}, ${JSON.stringify(a.scope)},
      ${a.overallScore}, ${a.readinessScore}, ${a.readinessTier},
      ${a.correctCount}, ${a.totalCount}, ${JSON.stringify(a.chapterScores)},
      ${JSON.stringify(a.sectionScores)}, ${JSON.stringify(a.questionReview)},
      ${a.weaknessAnalysis}, ${JSON.stringify(a.studyPlan)})`
}

export async function getAttemptsByUser(userId: number): Promise<{
  id: string; subjectId: string; overallScore: number; readinessScore: number;
  readinessTier: string; correctCount: number; totalCount: number; createdAt: string;
}[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT id, subject_id, overall_score, readiness_score, readiness_tier,
           correct_count, total_count, created_at
    FROM assessment_attempts WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 50`
  return rows.map(r => ({
    id: r.id as string,
    subjectId: r.subject_id as string,
    overallScore: Number(r.overall_score),
    readinessScore: Number(r.readiness_score),
    readinessTier: r.readiness_tier as string,
    correctCount: r.correct_count as number,
    totalCount: r.total_count as number,
    createdAt: (r.created_at as Date).toISOString(),
  }))
}

export async function getAttemptById(id: string, userId: number) {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM assessment_attempts WHERE id = ${id} AND user_id = ${userId}`
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    id: r.id as string,
    userId: r.user_id as number,
    subjectId: r.subject_id as string,
    scope: r.scope as Record<string, unknown>,
    overallScore: Number(r.overall_score),
    readinessScore: Number(r.readiness_score),
    readinessTier: r.readiness_tier as string,
    correctCount: r.correct_count as number,
    totalCount: r.total_count as number,
    chapterScores: r.chapter_scores as unknown[],
    sectionScores: r.section_scores as unknown[],
    questionReview: r.question_review as unknown[],
    weaknessAnalysis: r.weakness_analysis as string,
    studyPlan: r.study_plan as Record<string, unknown>,
    createdAt: (r.created_at as Date).toISOString(),
  }
}

// ── Telegram Linking ─────────────────────────────────────────────────

export async function createTelegramLinkCode(userId: number, code: string): Promise<void> {
  const sql = getDb()
  await sql`INSERT INTO telegram_link_codes (code, user_id, expires_at)
    VALUES (${code}, ${userId}, now() + interval '10 minutes')
    ON CONFLICT (code) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at`
}

export async function consumeTelegramLinkCode(code: string): Promise<number | null> {
  const sql = getDb()
  const rows = await sql`DELETE FROM telegram_link_codes
    WHERE code = ${code} AND expires_at > now()
    RETURNING user_id`
  return rows.length > 0 ? (rows[0].user_id as number) : null
}

export async function linkTelegramId(userId: number, telegramId: number): Promise<void> {
  const sql = getDb()
  await sql`UPDATE users SET telegram_id = ${telegramId} WHERE id = ${userId}`
}

export async function getUserByTelegramId(telegramId: number): Promise<{ id: number; name: string } | null> {
  const sql = getDb()
  const rows = await sql`SELECT id, name FROM users WHERE telegram_id = ${telegramId}`
  return rows.length > 0 ? { id: rows[0].id as number, name: rows[0].name as string } : null
}

// ── Feedback ─────────────────────────────────────────────────────────

export async function insertFeedback(userId: number, attemptId: string | null, rating: number, comment: string | null): Promise<void> {
  const sql = getDb()
  await sql`INSERT INTO feedback (user_id, attempt_id, rating, comment)
    VALUES (${userId}, ${attemptId}, ${rating}, ${comment})`
}

// ── Purchases & Coupons ─────────────────────────────────────────────

export async function getUserPurchasedChapterIds(userId: number): Promise<string[]> {
  const sql = getDb()
  const rows = await sql`SELECT chapter_id FROM purchases WHERE user_id = ${userId} AND status = 'paid'`
  return rows.map(r => r.chapter_id as string)
}

export async function hasUserPurchasedChapter(userId: number, chapterId: string): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`SELECT 1 FROM purchases WHERE user_id = ${userId} AND chapter_id = ${chapterId} AND status = 'paid' LIMIT 1`
  return rows.length > 0
}

export async function createPurchase(p: {
  id: string; userId: number; chapterId: string; razorpayOrderId: string;
  amount: number; originalAmount: number; couponCode: string | null;
}): Promise<void> {
  const sql = getDb()
  await sql`INSERT INTO purchases (id, user_id, chapter_id, razorpay_order_id, amount, original_amount, coupon_code, status)
    VALUES (${p.id}, ${p.userId}, ${p.chapterId}, ${p.razorpayOrderId}, ${p.amount}, ${p.originalAmount}, ${p.couponCode}, 'pending')`
}

export async function markPurchasePaid(purchaseId: string, paymentId: string, signature: string): Promise<void> {
  const sql = getDb()
  await sql`UPDATE purchases SET status = 'paid', razorpay_payment_id = ${paymentId}, razorpay_signature = ${signature}
    WHERE id = ${purchaseId} AND status = 'pending'`
}

export async function getCoupon(code: string): Promise<{ code: string; discountPercent: number; maxUses: number | null; usedCount: number; active: boolean } | null> {
  const sql = getDb()
  const rows = await sql`SELECT code, discount_percent, max_uses, used_count, active FROM coupons WHERE code = ${code.toUpperCase()}`
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    code: r.code as string,
    discountPercent: r.discount_percent as number,
    maxUses: r.max_uses as number | null,
    usedCount: r.used_count as number,
    active: r.active as boolean,
  }
}

export async function incrementCouponUsage(code: string): Promise<void> {
  const sql = getDb()
  await sql`UPDATE coupons SET used_count = used_count + 1 WHERE code = ${code.toUpperCase()}`
}

export async function getFreeChapterIds(): Promise<string[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT c.id FROM chapters c
    JOIN sections s ON s.id = c.section_id
    WHERE s.name ILIKE '%Derivatives%'
       OR c.id LIKE 'ca-inter-audit/%'`
  return rows.map(r => r.id as string)
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
