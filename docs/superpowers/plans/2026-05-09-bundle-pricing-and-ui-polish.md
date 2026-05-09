# Bundle Pricing + UI Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace per-subject purchases with a single ₹299 "CA Finals" bundle, default the select page to the Finals tab, strip discount theatre from the UI, hide chapter counts, and add a "Coming soon" DT card.

**Architecture:** Reuse the existing `purchases` table — paid rows simply use a synthetic `subject_id = 'ca-final-bundle'`. The single source of truth `getAccessibleChapterIds(userId)` is updated to check for that bundle and unlock every `ca-final-*` chapter when present. No schema changes, no user migration (test data only). Telegram bot inherits the new gating automatically because it uses the same primitive.

**Tech Stack:** Next.js 15 · Neon Postgres · Razorpay · grammy · vitest

---

## Locked decisions (from brainstorm 2026-05-09)

| Question | Answer |
|---|---|
| Bundle scope | `ca-final-*` subjects only (AFM, Audit, FR, IDT). `ca-inter-audit` stays fully free. |
| Bundle implementation | Synthetic `purchases.subject_id = 'ca-final-bundle'` |
| Unlock CTA placement | **Option A** — single persistent banner above subject cards (only on the Finals tab, only when not owned) |
| Coupons | Deactivate `STUDY70`; keep `TEST99` for testing |
| User migration | None — no paying customers |
| Default exam level | Finals (was: Inter if any inter subjects exist) |
| DT card | Hardcoded UI-only entry; click opens "coming soon" modal; not in DB |

---

## File map

**Modify:**
- `lib/queries.ts` — add `userOwnsCaFinalBundle(userId)` helper; rewrite `getAccessibleChapterIds` to use the bundle; remove the now-unused `getUserPurchasedSubjectIds`/`hasUserPurchasedSubject`
- `lib/__tests__/queries.test.ts` — update tests to match the new bundle logic
- `app/api/payments/create-order/route.ts` — drop `subjectId` body param; hardcode bundle id + ₹299 base price; reject if bundle already owned
- `app/api/payments/validate-coupon/route.ts` — change base price to ₹299
- `app/api/practice/questions/route.ts` — error response: subject context becomes "CA Finals bundle" when locked
- `app/api/assessment/questions/route.ts` — same subject-context update
- `app/api/telegram/webhook/route.ts` — lock message says "Unlock all CA Finals for ₹299"; remove STUDY70 mention
- `app/select/page.tsx` — pass `ownsBundle: boolean` to TopicSelector instead of `purchasedSubjectIds`
- `components/select/TopicSelector.tsx` — default to Finals; remove discount strike-through; add bundle banner; remove chapter-count line; add hardcoded DT "Coming soon" card; rebuild unlock flow around the bundle
- `components/landing/Hero.tsx` — pill copy reflects bundle pricing
- `CLAUDE.md` — update Payments section + Content Availability + Subjects rows

**Create:**
- `migrations/2026-05-09-bundle-pricing.sql` — deactivates `STUDY70`. Idempotent.

**Run** (one-off, scripted):
- `npx tsx --env-file=.env.local scripts/run-migration.ts migrations/2026-05-09-bundle-pricing.sql`

---

## Pre-flight

- [ ] **Step 1: Verify clean tree on dev**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
git checkout dev && git status --short
```

Expected: empty status (clean).

- [ ] **Step 2: Confirm zero paid rows in `purchases`**

```bash
node --env-file=.env.local --input-type=module -e "
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const paid = await sql\`SELECT count(*)::int AS n FROM purchases WHERE status = 'paid'\`;
console.log('paid rows:', paid[0].n);
"
```

Expected: 0. If non-zero, STOP and verify those are test purchases before proceeding.

---

## Task 1: STUDY70 deactivation migration

**Files:**
- Create: `migrations/2026-05-09-bundle-pricing.sql`

- [ ] **Step 1: Write the migration**

Create `migrations/2026-05-09-bundle-pricing.sql`:

```sql
-- Bundle pricing migration
-- 2026-05-09
-- Deactivates STUDY70. Bundle gating itself is implemented in code, not schema.

BEGIN;

-- Take STUDY70 out of circulation (kept in table for historical reference).
UPDATE coupons SET active = false WHERE code = 'STUDY70';

COMMIT;
```

- [ ] **Step 2: Run it**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx tsx --env-file=.env.local scripts/run-migration.ts migrations/2026-05-09-bundle-pricing.sql
```

Expected: `Migration complete.`

- [ ] **Step 3: Verify**

```bash
node --env-file=.env.local --input-type=module -e "
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
console.table(await sql\`SELECT code, active FROM coupons ORDER BY code\`);
"
```

Expected: `STUDY70 active=false`, `TEST99 active=true`.

- [ ] **Step 4: Commit**

```bash
git add migrations/2026-05-09-bundle-pricing.sql
git commit -m "feat(db): deactivate STUDY70 ahead of bundle pricing rollout"
```

---

## Task 2: Query layer — bundle gating (TDD)

**Files:**
- Modify: `lib/queries.ts`
- Modify: `lib/__tests__/queries.test.ts`

The new primitive: `userOwnsCaFinalBundle(userId): Promise<boolean>` — checks for any paid row with `subject_id = 'ca-final-bundle'`. Then `getAccessibleChapterIds` becomes: free preview chapters ∪ (all `ca-final-*` chapters if user owns bundle).

The old `getUserPurchasedSubjectIds` and `hasUserPurchasedSubject` become dead code under the bundle model — remove them.

- [ ] **Step 1: Update tests in `lib/__tests__/queries.test.ts`**

Replace the existing import from `'../queries'`:

```ts
import {
  getSubjects,
  getSections,
  getChapters,
  getChaptersByIds,
  getQuestionsForChapters,
  insertSubject,
  userOwnsCaFinalBundle,
  getAccessibleChapterIds,
  getFreeChapterIds,
  getSubjectForChapter,
} from '../queries'
```

DELETE the existing `describe('getUserPurchasedSubjectIds', ...)` and `describe('hasUserPurchasedSubject', ...)` blocks.

ADD the following:

```ts
describe('userOwnsCaFinalBundle', () => {
  it('returns true when a paid bundle row exists', async () => {
    mockSql.mockResolvedValue([{ '?column?': 1 }])
    expect(await userOwnsCaFinalBundle(7)).toBe(true)
  })

  it('returns false when no paid bundle row exists', async () => {
    mockSql.mockResolvedValue([])
    expect(await userOwnsCaFinalBundle(7)).toBe(false)
  })
})
```

REPLACE the `describe('getAccessibleChapterIds', ...)` block with:

```ts
describe('getAccessibleChapterIds', () => {
  it('returns only free-preview chapters when userId is null', async () => {
    mockSql.mockResolvedValue([{ id: 'ca-final-afm/derivatives/ch09' }])
    const result = await getAccessibleChapterIds(null)
    expect(result).toEqual(new Set(['ca-final-afm/derivatives/ch09']))
    expect(mockSql).toHaveBeenCalledTimes(1)
  })

  it('returns free-preview + every ca-final-* chapter when bundle is owned', async () => {
    mockSql.mockResolvedValue([
      { id: 'ca-final-afm/derivatives/ch09' },
      { id: 'ca-final-afm/strategy-risk-capbudget/ch01' },
      { id: 'ca-final-fr/framework-presentation/ch01' },
    ])
    const result = await getAccessibleChapterIds(7)
    expect(result).toEqual(new Set([
      'ca-final-afm/derivatives/ch09',
      'ca-final-afm/strategy-risk-capbudget/ch01',
      'ca-final-fr/framework-presentation/ch01',
    ]))
  })
})
```

- [ ] **Step 2: Run tests — must FAIL**

```bash
npm test -- queries
```

Expected: failures referencing `userOwnsCaFinalBundle is not defined` (or similar) plus failures in the existing call sites.

- [ ] **Step 3: Update `lib/queries.ts`**

Inside the `// ── Purchases & Coupons ─` section, REPLACE the entire block from `getUserPurchasedSubjectIds` through `getAccessibleChapterIds` (keeping the rest — `createPurchase`, `markPurchasePaid`, `getCoupon`, `incrementCouponUsage`, `getFreeChapterIds`, `getSubjectForChapter` — untouched) with:

```ts
// Per-subject ownership functions are gone — pricing is now bundle-based.
// Use userOwnsCaFinalBundle as the single ownership predicate.

export const CA_FINAL_BUNDLE_SUBJECT_ID = 'ca-final-bundle'

export async function userOwnsCaFinalBundle(userId: number): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`SELECT 1 FROM purchases
    WHERE user_id = ${userId}
      AND subject_id = ${CA_FINAL_BUNDLE_SUBJECT_ID}
      AND status = 'paid'
    LIMIT 1`
  return rows.length > 0
}

export async function createPurchase(p: {
  id: string; userId: number; subjectId: string; razorpayOrderId: string;
  amount: number; originalAmount: number; couponCode: string | null;
}): Promise<void> {
  const sql = getDb()
  await sql`INSERT INTO purchases (id, user_id, subject_id, razorpay_order_id, amount, original_amount, coupon_code, status)
    VALUES (${p.id}, ${p.userId}, ${p.subjectId}, ${p.razorpayOrderId}, ${p.amount}, ${p.originalAmount}, ${p.couponCode}, 'pending')`
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
  const rows = await sql`SELECT id FROM chapters WHERE is_free_preview = true`
  return rows.map(r => r.id as string)
}

// Free-preview chapters ∪ all ca-final-* chapters (if user owns the bundle).
// userId === null only sees free-preview chapters.
export async function getAccessibleChapterIds(userId: number | null): Promise<Set<string>> {
  const sql = getDb()
  if (userId === null) {
    const rows = await sql`SELECT id FROM chapters WHERE is_free_preview = true`
    return new Set(rows.map(r => r.id as string))
  }
  const rows = await sql`
    SELECT id FROM chapters WHERE is_free_preview = true
    UNION
    SELECT c.id FROM chapters c
    WHERE c.subject_id LIKE 'ca-final-%'
      AND EXISTS (
        SELECT 1 FROM purchases p
        WHERE p.user_id = ${userId}
          AND p.subject_id = ${CA_FINAL_BUNDLE_SUBJECT_ID}
          AND p.status = 'paid'
      )`
  return new Set(rows.map(r => r.id as string))
}

export async function getSubjectForChapter(chapterId: string): Promise<{ id: string; name: string } | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT s.id, s.name FROM subjects s
    JOIN chapters c ON c.subject_id = s.id
    WHERE c.id = ${chapterId} LIMIT 1`
  if (rows.length === 0) return null
  return { id: rows[0].id as string, name: rows[0].name as string }
}
```

- [ ] **Step 4: Run tests — must PASS**

```bash
npm test -- queries
```

Expected: all queries.test.ts cases green. Other tests untouched.

- [ ] **Step 5: Confirm tsc errors limited to expected callers**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected errors only in: `app/api/payments/create-order/route.ts`, `app/api/payments/verify/route.ts` (if it imports the deleted helpers — check), `app/select/page.tsx`, `components/select/TopicSelector.tsx`. Anything else is a problem.

- [ ] **Step 6: Commit**

```bash
git add lib/queries.ts lib/__tests__/queries.test.ts
git commit -m "refactor(queries): bundle ownership via userOwnsCaFinalBundle helper

Drops getUserPurchasedSubjectIds/hasUserPurchasedSubject. Bundle access
is now expressed by a single helper plus a rewritten getAccessibleChapterIds
that grants every ca-final-* chapter when the user owns ca-final-bundle.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: create-order accepts no subjectId; bundle is hardcoded

**Files:**
- Modify: `app/api/payments/create-order/route.ts`
- Modify: `app/api/payments/validate-coupon/route.ts`

- [ ] **Step 1: Replace `app/api/payments/create-order/route.ts` entirely**

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'
import {
  userOwnsCaFinalBundle,
  getCoupon,
  createPurchase,
  CA_FINAL_BUNDLE_SUBJECT_ID,
} from '@/lib/queries'

const BASE_PRICE_PAISE = 29900 // ₹299
const BUNDLE_NAME = 'ClearPass — CA Finals Bundle'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Body may include couponCode; subjectId is ignored (bundle is the only product).
  const body = await req.json().catch(() => ({}))
  const couponCode: unknown = body.couponCode

  const userId = Number(session.user.id)
  const alreadyOwned = await userOwnsCaFinalBundle(userId)
  if (alreadyOwned) {
    return NextResponse.json({ error: 'Already purchased' }, { status: 409 })
  }

  let amount = BASE_PRICE_PAISE
  let validCoupon: string | null = null

  if (typeof couponCode === 'string' && couponCode.trim()) {
    const coupon = await getCoupon(couponCode)
    if (!coupon || !coupon.active) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 })
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 })
    }
    amount = Math.round(BASE_PRICE_PAISE * (1 - coupon.discountPercent / 100))
    if (amount < 100) amount = 100
    validCoupon = coupon.code
  }

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
  }

  const receipt = `cp_${nanoid(12)}`
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt,
      notes: { bundle: 'ca-final', name: BUNDLE_NAME },
    }),
  })

  if (!rzpRes.ok) {
    const err = await rzpRes.text()
    console.error('[create-order] Razorpay error:', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const order = await rzpRes.json()
  const purchaseId = nanoid(12)

  await createPurchase({
    id: purchaseId,
    userId,
    subjectId: CA_FINAL_BUNDLE_SUBJECT_ID,
    razorpayOrderId: order.id,
    amount,
    originalAmount: BASE_PRICE_PAISE,
    couponCode: validCoupon,
  })

  return NextResponse.json({
    orderId: order.id,
    amount,
    originalAmount: BASE_PRICE_PAISE,
    currency: 'INR',
    purchaseId,
    bundleName: BUNDLE_NAME,
  })
}
```

- [ ] **Step 2: Update `app/api/payments/validate-coupon/route.ts`**

Find the line `const BASE_PRICE_PAISE = 99900` and change it to `const BASE_PRICE_PAISE = 29900`.

- [ ] **Step 3: Typecheck both files**

```bash
npx tsc --noEmit 2>&1 | grep -E "create-order|validate-coupon"
```

Expected: no output.

---

## Task 4: practice + assessment routes — bundle-aware error context

**Files:**
- Modify: `app/api/practice/questions/route.ts`
- Modify: `app/api/assessment/questions/route.ts`

The 403 currently surfaces a `subject_not_purchased` error with `subjectId`/`subjectName`. Now the locked unit is the bundle, not a subject. Replace the error code with `bundle_not_purchased` and drop the subject fields.

- [ ] **Step 1: Edit `app/api/practice/questions/route.ts`**

Replace the access-check block:

```ts
  const accessible = await getAccessibleChapterIds(Number(session.user.id))
  if (!accessible.has(chapterId)) {
    const subject = await getSubjectForChapter(chapterId)
    return NextResponse.json(
      {
        error: 'subject_not_purchased',
        subjectId: subject?.id ?? null,
        subjectName: subject?.name ?? null,
      },
      { status: 403 }
    )
  }
```

With:

```ts
  const accessible = await getAccessibleChapterIds(Number(session.user.id))
  if (!accessible.has(chapterId)) {
    return NextResponse.json(
      { error: 'bundle_not_purchased' },
      { status: 403 }
    )
  }
```

Also remove `getSubjectForChapter` from the imports if it's no longer referenced elsewhere in this file.

- [ ] **Step 2: Edit `app/api/assessment/questions/route.ts`**

Replace the equivalent block:

```ts
  const accessibleSet = await getAccessibleChapterIds(Number(session.user.id))
  const blocked = chapterIds.filter(id => !accessibleSet.has(id))
  if (blocked.length > 0) {
    const blockedSubject = await getSubjectForChapter(blocked[0])
    return NextResponse.json(
      {
        error: 'subject_not_purchased',
        blockedChapterIds: blocked,
        subjectId: blockedSubject?.id ?? null,
        subjectName: blockedSubject?.name ?? null,
      },
      { status: 403 }
    )
  }
```

With:

```ts
  const accessibleSet = await getAccessibleChapterIds(Number(session.user.id))
  const blocked = chapterIds.filter(id => !accessibleSet.has(id))
  if (blocked.length > 0) {
    return NextResponse.json(
      { error: 'bundle_not_purchased', blockedChapterIds: blocked },
      { status: 403 }
    )
  }
```

Update imports: remove `getSubjectForChapter` from this file.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "practice/questions|assessment/questions"
```

Expected: no output.

---

## Task 5: Telegram bot — bundle copy

**Files:**
- Modify: `app/api/telegram/webhook/route.ts`

- [ ] **Step 1: Replace the locked-chapter message**

Find the `bot.callbackQuery(/^ch:(.+)$/` block. Find this exact block:

```ts
    const accessible = await getAccessibleChapterIds(user.id)
    if (!accessible.has(chapterId)) {
      const subject = await getSubjectForChapter(chapterId)
      const subjectName = subject?.name ?? 'this subject'
      await ctx.answerCallbackQuery()
      await ctx.editMessageText(
        `🔒 *${escapeMarkdown(subjectName)} is locked*\n\n` +
        '💰 Unlock the entire subject for ~₹999~ just *₹299*\n' +
        '🎟 Use coupon code: `STUDY70` (70% off!)\n\n' +
        '💡 _Try the free preview chapter (🆓) in this subject to get started!_\n\n' +
        '👉 Visit clearpass.snpventures.in/select to unlock.',
        { parse_mode: 'Markdown' }
      )
      return
    }
```

Replace with:

```ts
    const accessible = await getAccessibleChapterIds(user.id)
    if (!accessible.has(chapterId)) {
      await ctx.answerCallbackQuery()
      await ctx.editMessageText(
        '🔒 *Locked*\n\n' +
        '💰 Unlock all CA Finals subjects (AFM, FR, Audit, IDT) for *₹299*\n\n' +
        '💡 _Try a free preview chapter (🆓) in any subject to get a feel._\n\n' +
        '👉 Visit clearpass.snpventures.in/select to unlock.',
        { parse_mode: 'Markdown' }
      )
      return
    }
```

If `getSubjectForChapter` is no longer referenced in this file, remove it from the imports.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep telegram
```

Expected: no output.

---

## Task 6: Select page — pass `ownsBundle: boolean` to TopicSelector

**Files:**
- Modify: `app/select/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import { auth } from '@/lib/auth'
import { getSubjects, getSections, getChapters, getQuestionCountsByChapter, getFreeChapterIds, userOwnsCaFinalBundle } from '@/lib/queries'
import { TopicSelector } from '@/components/select/TopicSelector'
import { AppNav } from '@/components/AppNav'

export const dynamic = 'force-dynamic'

export default async function SelectPage() {
  const session = await auth()
  const subjects = await getSubjects()
  if (subjects.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">No subjects available. Ask your admin to upload a syllabus.</p>
      </main>
    )
  }

  const allSectionIds: string[] = []
  const allSections = []
  for (const s of subjects) {
    const secs = await getSections(s.id)
    allSections.push(...secs)
    allSectionIds.push(...secs.map(sec => sec.id))
  }

  const [allChapters, questionCounts, freeChapterIds, ownsBundle] = await Promise.all([
    allSectionIds.length > 0 ? getChapters(allSectionIds) : Promise.resolve([]),
    getQuestionCountsByChapter(),
    getFreeChapterIds(),
    session?.user?.id ? userOwnsCaFinalBundle(Number(session.user.id)) : Promise.resolve(false),
  ])

  return (
    <main className="min-h-screen bg-white">
      <AppNav />
      <TopicSelector
        subjects={subjects}
        sections={allSections}
        chapters={allChapters}
        questionCounts={questionCounts}
        freeChapterIds={freeChapterIds}
        ownsBundle={ownsBundle}
      />
    </main>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "select/page"
```

Expected: ONE error about `ownsBundle` being unrecognized on `TopicSelector` — fixed in next task.

---

## Task 7: TopicSelector — bundle banner, default Finals, hide counts, DT card

**Files:**
- Modify: `components/select/TopicSelector.tsx`

The biggest single change in this plan. Replace the file end-to-end.

- [ ] **Step 1: Replace `components/select/TopicSelector.tsx`**

```tsx
'use client'
import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Subject, Section, Chapter } from '@/lib/types'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

interface Props {
  subjects: Subject[]
  sections: Section[]
  chapters: Chapter[]
  questionCounts: Record<string, number>
  freeChapterIds: string[]
  ownsBundle: boolean
}

type ExamLevel = 'inter' | 'finals'

function getExamLevel(subjectId: string): ExamLevel {
  if (subjectId.startsWith('ca-inter')) return 'inter'
  return 'finals'
}

const COMING_SOON_CARDS: Array<{ id: string; shortName: string; examLevel: ExamLevel }> = [
  { id: 'ca-final-dt-coming-soon', shortName: 'Direct Tax', examLevel: 'finals' },
]

export function TopicSelector({ subjects, sections, chapters, questionCounts, freeChapterIds, ownsBundle }: Props) {
  const router = useRouter()
  const [examLevel, setExamLevel] = useState<ExamLevel>('finals')
  const [openSubject, setOpenSubject] = useState<string | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [showBundleModal, setShowBundleModal] = useState(false)
  const [showComingSoon, setShowComingSoon] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountPercent?: number; finalAmount?: number; error?: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const freeSet = useMemo(() => new Set(freeChapterIds), [freeChapterIds])

  const filteredSubjects = useMemo(
    () => subjects.filter(s => getExamLevel(s.id) === examLevel),
    [subjects, examLevel]
  )

  const filteredComingSoon = useMemo(
    () => COMING_SOON_CARDS.filter(c => c.examLevel === examLevel),
    [examLevel]
  )

  // Lock state per subject. ca-inter-audit (legacy free) and ca-inter* never get a lock.
  function isSubjectAccessible(subjectId: string): boolean {
    if (getExamLevel(subjectId) === 'inter') return true
    return ownsBundle
  }

  function isChapterAccessible(chId: string, subjectId: string): boolean {
    return freeSet.has(chId) || isSubjectAccessible(subjectId)
  }

  function toggleChapter(id: string, subjectId: string) {
    if ((questionCounts[id] ?? 0) === 0) return
    if (!isChapterAccessible(id, subjectId)) return
    setSelectedChapters(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllInSubject(subjectId: string) {
    const subChapters = chapters.filter(c => c.subjectId === subjectId)
    setSelectedChapters(prev => {
      const next = new Set(prev)
      for (const ch of subChapters) {
        if ((questionCounts[ch.id] ?? 0) > 0 && isChapterAccessible(ch.id, subjectId)) {
          next.add(ch.id)
        }
      }
      return next
    })
  }

  function deselectAllInSubject(subjectId: string) {
    const subChapters = chapters.filter(c => c.subjectId === subjectId)
    setSelectedChapters(prev => {
      const next = new Set(prev)
      for (const ch of subChapters) next.delete(ch.id)
      return next
    })
  }

  function goToAssessment() {
    const chapterIds = [...selectedChapters]
    if (chapterIds.length === 0) return
    const subjectId = chapters.find(c => chapterIds.includes(c.id))?.subjectId ?? ''
    const sectionIds = [...new Set(chapters.filter(c => chapterIds.includes(c.id)).map(c => c.sectionId))]
    const params = new URLSearchParams({
      subject: subjectId,
      sections: sectionIds.join(','),
      chapters: chapterIds.join(','),
    })
    router.push(`/assessment?${params}`)
  }

  function goToPractice(chapterId: string) {
    router.push(`/practice?chapter=${chapterId}`)
  }

  const validateCoupon = useCallback(async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await fetch('/api/payments/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      })
      const data = await res.json()
      setCouponResult(data)
    } catch {
      setCouponResult({ valid: false, error: 'Failed to validate' })
    } finally {
      setCouponLoading(false)
    }
  }, [couponCode])

  async function handleUnlockBundle() {
    setPaymentLoading(true)
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponResult?.valid ? couponCode.trim() : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to create order')
        return
      }

      const { orderId, amount, purchaseId, bundleName } = await res.json()

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: 'INR',
        name: 'ClearPass',
        description: bundleName ?? 'CA Finals Bundle',
        order_id: orderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              purchaseId,
            }),
          })
          if (verifyRes.ok) {
            setShowBundleModal(false)
            setCouponCode('')
            setCouponResult(null)
            router.refresh()
          } else {
            alert('Payment verification failed. Contact support if amount was deducted.')
          }
        },
        theme: { color: '#000000' },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const modalSubject = subjects.find(s => s.id === openSubject)
  const modalSections = openSubject ? sections.filter(s => s.subjectId === openSubject) : []
  const modalChapters = openSubject ? chapters.filter(c => c.subjectId === openSubject) : []
  const selectedInModal = modalChapters.filter(c => selectedChapters.has(c.id)).length
  const allAccessibleInModal = openSubject
    ? modalChapters.filter(c => (questionCounts[c.id] ?? 0) > 0 && isChapterAccessible(c.id, openSubject))
    : []
  const allSelected = allAccessibleInModal.length > 0 && allAccessibleInModal.every(c => selectedChapters.has(c.id))
  const modalSubjectAccessible = openSubject ? isSubjectAccessible(openSubject) : false

  const hasSelection = selectedChapters.size > 0
  const showBundleBanner = examLevel === 'finals' && !ownsBundle

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-2 text-2xl font-black sm:text-3xl">Choose Your Exam</h1>
      <p className="mb-6 text-sm text-gray-500">Select your exam level, then pick a subject to explore chapters.</p>

      {/* Exam Level Tabs */}
      <div className="mb-6 flex rounded-xl border border-gray-200 p-1">
        <button
          onClick={() => setExamLevel('finals')}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
            examLevel === 'finals' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          CA Finals
        </button>
        <button
          onClick={() => setExamLevel('inter')}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
            examLevel === 'inter' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          CA Intermediate
        </button>
      </div>

      {/* Bundle Unlock Banner — Finals tab, not yet owned */}
      {showBundleBanner && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-gray-900 bg-gray-900 px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="text-sm font-bold">Unlock all CA Finals subjects</p>
            <p className="mt-0.5 text-xs text-gray-300">AFM, FR, Audit & IDT — full access for ₹299</p>
          </div>
          <button
            onClick={() => setShowBundleModal(true)}
            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100"
          >
            Unlock ₹299
          </button>
        </div>
      )}

      {/* Subject + Coming-soon Cards */}
      {filteredSubjects.length === 0 && filteredComingSoon.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">No subjects available for this exam level yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSubjects.map(subject => {
            const owned = isSubjectAccessible(subject.id)
            const isInter = getExamLevel(subject.id) === 'inter'
            return (
              <button
                key={subject.id}
                onClick={() => setOpenSubject(subject.id)}
                className="group w-full rounded-xl border border-gray-200 p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-black">
                    {subject.name.replace(/^CA (Intermediate|Final) — /, '')}
                  </h3>
                  <div className="flex shrink-0 items-center gap-2">
                    {owned && !isInter && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Unlocked</span>
                    )}
                    {isInter && (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">Free</span>
                    )}
                    {!owned && !isInter && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700">₹299</span>
                    )}
                    <svg className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
          {filteredComingSoon.map(card => (
            <button
              key={card.id}
              onClick={() => setShowComingSoon(card.shortName)}
              className="group w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-left shadow-sm transition-all hover:border-gray-400"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-gray-500">{card.shortName}</h3>
                <span className="rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-semibold text-gray-600">Coming soon</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Floating assessment button */}
      {hasSelection && !openSubject && (
        <div className="fixed bottom-6 left-4 right-4 z-40 mx-auto max-w-2xl sm:left-auto sm:right-auto sm:w-full sm:px-6">
          <button
            onClick={goToAssessment}
            className="w-full rounded-xl bg-black px-8 py-4 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-80"
          >
            Take Readiness Assessment ({selectedChapters.size} chapter{selectedChapters.size !== 1 ? 's' : ''}) →
          </button>
        </div>
      )}

      {/* Coming-soon Modal */}
      {showComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowComingSoon(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-black text-gray-900">{showComingSoon} is coming soon</h2>
            <p className="mb-5 text-sm text-gray-500">We&apos;re putting the finishing touches on this subject. Check back shortly.</p>
            <button
              onClick={() => setShowComingSoon(null)}
              className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:opacity-80"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Bundle Unlock Modal */}
      {showBundleModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setShowBundleModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()} className="relative w-full rounded-t-2xl bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <h2 className="text-lg font-black text-gray-900">Unlock all CA Finals subjects</h2>
            <p className="mt-1 text-sm text-gray-500">AFM, FR, Audit & IDT — every chapter, every question.</p>
            <p className="mt-4 mb-3 text-2xl font-black text-gray-900">
              ₹{couponResult?.valid ? (couponResult.finalAmount! / 100).toFixed(2) : '299'}
            </p>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
                placeholder="Coupon code (optional)"
                className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
              <button
                onClick={validateCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                {couponLoading ? '...' : 'Apply'}
              </button>
            </div>
            {couponResult && (
              <p className={`mb-2 text-xs ${couponResult.valid ? 'text-green-700' : 'text-red-600'}`}>
                {couponResult.valid ? `${couponResult.discountPercent}% discount applied!` : couponResult.error}
              </p>
            )}
            <button
              onClick={handleUnlockBundle}
              disabled={paymentLoading}
              className="mt-2 w-full rounded-lg bg-black px-4 py-3 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
            >
              {paymentLoading ? 'Processing...' : `Pay ₹${couponResult?.valid ? (couponResult.finalAmount! / 100).toFixed(2) : '299'}`}
            </button>
            <button
              onClick={() => setShowBundleModal(false)}
              className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {openSubject && modalSubject && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpenSubject(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-black">{modalSubject.name.replace(/^CA (Intermediate|Final) — /, '')}</h2>
              <button
                onClick={() => setOpenSubject(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Inline bundle CTA inside modal — visible when subject not accessible */}
            {!modalSubjectAccessible && (
              <div className="border-b border-gray-100 bg-gray-900 px-5 py-3 text-white">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs">Unlock all CA Finals for ₹299</p>
                  <button
                    onClick={() => setShowBundleModal(true)}
                    className="shrink-0 rounded-md bg-white px-3 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-100"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            )}

            {allAccessibleInModal.length > 0 && (
              <div className="border-b border-gray-100 px-5 py-2.5">
                <button
                  onClick={() => allSelected ? deselectAllInSubject(openSubject) : selectAllInSubject(openSubject)}
                  className="text-xs font-medium text-gray-500 hover:text-black"
                >
                  {allSelected ? 'Deselect all' : 'Select all available'}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="space-y-1">
                {modalSections.map(section => {
                  const sectionChapters = modalChapters.filter(c => c.sectionId === section.id)
                  return (
                    <div key={section.id}>
                      {modalSections.length > 1 && (
                        <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 first:mt-0">
                          {section.name}
                        </p>
                      )}
                      {sectionChapters.map(ch => {
                        const chHasQuestions = (questionCounts[ch.id] ?? 0) > 0
                        const accessible = isChapterAccessible(ch.id, openSubject)
                        const isFree = freeSet.has(ch.id)

                        if (!chHasQuestions) {
                          return (
                            <div key={ch.id} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                              <span className="text-sm text-gray-300">{ch.name}</span>
                              <span className="text-[10px] text-gray-300">Coming soon</span>
                            </div>
                          )
                        }

                        if (!accessible) {
                          return (
                            <div key={ch.id} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="text-sm text-gray-400">{ch.name}</span>
                              </div>
                              <span className="text-[10px] text-gray-400">Locked</span>
                            </div>
                          )
                        }

                        return (
                          <div key={ch.id} className="flex flex-wrap items-center justify-between gap-1 rounded-lg px-3 py-2.5 hover:bg-gray-50">
                            <label className="flex min-w-0 items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedChapters.has(ch.id)}
                                onChange={() => toggleChapter(ch.id, openSubject)}
                                className="h-4 w-4 shrink-0 rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">{ch.name}</span>
                              {isFree && (
                                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Free preview</span>
                              )}
                            </label>
                            <button
                              onClick={() => goToPractice(ch.id)}
                              className="shrink-0 text-xs text-gray-400 underline underline-offset-2 hover:text-black"
                            >
                              Practice →
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              {selectedInModal > 0 ? (
                <button
                  onClick={goToAssessment}
                  className="w-full rounded-xl bg-black px-6 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-80"
                >
                  Take Assessment ({selectedInModal} chapter{selectedInModal !== 1 ? 's' : ''}) →
                </button>
              ) : (
                <p className="text-center text-xs text-gray-400">Select chapters above to take an assessment</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build + typecheck + tests**

```bash
npx tsc --noEmit && npm test && npm run build 2>&1 | tail -10
```

Expected: tsc empty, all tests pass, build succeeds.

- [ ] **Step 3: Commit Tasks 3-7 together**

```bash
git add app/api/payments/create-order/route.ts \
        app/api/payments/validate-coupon/route.ts \
        app/api/practice/questions/route.ts \
        app/api/assessment/questions/route.ts \
        app/api/telegram/webhook/route.ts \
        app/select/page.tsx \
        components/select/TopicSelector.tsx
git commit -m "feat(payments): bundle pricing — single ₹299 unlocks all CA Finals

- create-order ignores subjectId, hardcodes ca-final-bundle and ₹299
- validate-coupon recalculates discount against ₹299
- practice + assessment 403 returns bundle_not_purchased
- Telegram bot lock message rewritten — no STUDY70, no per-subject framing
- Select page passes ownsBundle: boolean
- TopicSelector: defaults to Finals, hides chapter counts, shows persistent
  bundle banner, hosts the unified unlock modal, adds Direct Tax 'Coming
  soon' card with its own modal

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Hero pill copy

**Files:**
- Modify: `components/landing/Hero.tsx`

- [ ] **Step 1: Update copy**

Find:

```tsx
          Live now: AFM, FR, Audit &amp; IDT (CA Finals) — try one free chapter per subject
```

Replace with:

```tsx
          ₹299 unlocks all CA Finals — AFM, FR, Audit &amp; IDT
```

- [ ] **Step 2: Build + commit**

```bash
npm run build 2>&1 | tail -5
git add components/landing/Hero.tsx
git commit -m "feat(landing): pill copy reflects bundle pricing"
```

---

## Task 9: CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update Payments section**

Find this block (between `### 6. Payments (Razorpay)` and the next `###`):

```markdown
**Base price**: ₹999 per **subject** (one purchase unlocks every chapter in that subject). Coupons can reduce this:
- `STUDY70` — 70% off → ₹299 (public)
- `TEST99` — 99% off → ₹9.99 (test coupon to exercise the real Razorpay path in production)
```

Replace with:

```markdown
**Base price**: **₹299 for the CA Finals bundle** — a single purchase unlocks every chapter across AFM, FR, Audit, and IDT. Stored as `purchases.subject_id = 'ca-final-bundle'`.

Coupons:
- `TEST99` — 99% off → ₹2.99 (test coupon to exercise the real Razorpay path in production)
- `STUDY70` — deactivated (kept in `coupons` table inactive for historical reference)
```

- [ ] **Step 2: Update "Paid subjects" line**

Find:

```markdown
**Paid subjects**: AFM, Audit, FR, IDT (CA Finals). The legacy `ca-inter-audit` subject remains fully free.
```

Replace with:

```markdown
**Paid bundle**: AFM, Audit, FR, IDT (CA Finals) — purchased together. The legacy `ca-inter-audit` subject remains fully free.
```

- [ ] **Step 3: Update create-order line**

Find:

```markdown
- `POST /api/payments/create-order` — accepts `{ subjectId, couponCode? }`, creates Razorpay order, stores pending purchase
```

Replace with:

```markdown
- `POST /api/payments/create-order` — accepts `{ couponCode? }` (no subjectId — bundle is the only product), creates Razorpay order at ₹299, stores pending purchase with `subject_id = 'ca-final-bundle'`
```

- [ ] **Step 4: Update Frontend flow**

Find:

```markdown
**Frontend flow** (`TopicSelector`):
1. User opens a subject card with the lock badge
2. "Unlock" panel appears in the subject modal with coupon input + Pay button
3. Pay → calls create-order with `subjectId` → opens Razorpay checkout → on success calls verify → `router.refresh()`
```

Replace with:

```markdown
**Frontend flow** (`TopicSelector`):
1. Persistent "Unlock all CA Finals for ₹299" banner shown above subject cards (Finals tab, not yet owned)
2. Click → bundle modal with optional coupon input + Pay button
3. Pay → calls create-order → opens Razorpay checkout → on success calls verify → `router.refresh()`
```

- [ ] **Step 5: Update Content Availability**

Find:

```markdown
- **Paid subjects** (₹999 per subject, ₹299 with STUDY70 coupon): AFM, Audit, FR, IDT — all CA Finals
```

Replace with:

```markdown
- **Paid bundle** (₹299, all four CA Finals subjects together): AFM, Audit, FR, IDT
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: bundle pricing in CLAUDE.md"
```

---

## Task 10: Production verification

- [ ] **Step 1: Push + deploy**

```bash
git push origin dev
vercel --prod
```

- [ ] **Step 2: Smoke test on https://clearpass.snpventures.in**

- Sign in fresh → land on /select → Finals tab is selected by default
- Bundle banner visible at top
- Subject cards show no question counts, no chapter-count text
- DT card visible at bottom of Finals list with "Coming soon" pill; clicking opens the coming-soon modal
- Click any subject → modal shows chapters; non-preview ones say "Locked"
- Click Unlock banner → bundle modal shows ₹299
- Apply `TEST99` → ₹2.99
- Pay → Razorpay test card 4111 1111 1111 1111 → success
- Refresh: every subject card shows `Unlocked`, every chapter selectable

- [ ] **Step 3: Telegram smoke test**

- `/practice` → AFM → any section → tap a non-preview chapter (without bundle)
- Expected: "🔒 Locked … Unlock all CA Finals subjects (AFM, FR, Audit, IDT) for ₹299" message
- After web purchase → re-trigger telegram → all chapters across AFM/FR/Audit/IDT open

---

## Self-review notes

- **Spec coverage:** five user-requested changes all map to tasks.
  - Default Finals: Task 7 step 1 (state init line)
  - Remove discount UI: Tasks 3, 5, 7 (removed strike-through + STUDY70 from create-order/coupon UI/Telegram)
  - Bundle pricing: Tasks 1-7
  - Hide chapter counts: Task 7 (subject card markup no longer renders the stats line)
  - DT coming-soon card: Task 7 (`COMING_SOON_CARDS` constant + modal)
- **No placeholders.** Every code step has full code or exact diff.
- **Type/name consistency:**
  - `userOwnsCaFinalBundle(userId)` consistent across queries.ts, select page, tests
  - `ownsBundle: boolean` consistent in select/page.tsx and TopicSelector props
  - `CA_FINAL_BUNDLE_SUBJECT_ID` constant exported from queries.ts and used in create-order
- **No DB schema changes** required. All gating is via code + the existing `is_free_preview`/`purchases` shape.
