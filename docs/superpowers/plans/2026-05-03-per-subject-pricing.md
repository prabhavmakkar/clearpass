# Per-Subject Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the payment unit from per-chapter (₹999/chapter) to per-subject (₹999/subject), expose one free-preview chapter per paid subject, and add a `TEST99` coupon for production payment-path testing.

**Architecture:** A single new helper `getAccessibleChapterIds(userId)` in `lib/queries.ts` becomes the single source of truth for "can this user see this chapter?" — used by the practice API, assessment API, telegram bot, and select page. The brittle SQL-pattern `getFreeChapterIds()` is replaced with a data-driven `is_free_preview` column on `chapters`. The `purchases.chapter_id` column is renamed to `purchases.subject_id`. Existing test rows are dropped (no real customers).

**Tech Stack:** Next.js 15 App Router · Neon Postgres · Auth.js v5 · Razorpay · grammy (Telegram) · vitest

**Spec:** `docs/superpowers/specs/2026-05-03-per-subject-pricing-design.md`

---

## File Map

**Create:**
- `migrations/2026-05-03-per-subject-pricing.sql` — idempotent schema migration
- `scripts/run-migration.ts` — runner that executes the SQL via the Neon driver

**Modify:**
- `lib/schema.sql` — keep authoritative schema in sync
- `lib/queries.ts` — replace chapter-keyed purchase functions with subject-keyed; add `getAccessibleChapterIds`, `getSubjectForChapter`; rewrite `getFreeChapterIds`
- `lib/__tests__/queries.test.ts` — extend with tests for new functions
- `app/api/payments/create-order/route.ts` — accept `subjectId`
- `app/api/payments/validate-coupon/route.ts` — no logic change; just verify wording stays generic
- `app/api/practice/questions/route.ts` — use `getAccessibleChapterIds`
- `app/api/assessment/questions/route.ts` — use `getAccessibleChapterIds`
- `app/api/telegram/webhook/route.ts` — subject-level lock message; free-preview indicator in chapter keyboard
- `app/select/page.tsx` — pass `purchasedSubjectIds` to TopicSelector
- `components/select/TopicSelector.tsx` — move lock UI + payment panel from chapter to subject; show "Free preview" badge on the single free chapter
- `components/landing/Hero.tsx` — update "Live now" pill copy
- `CLAUDE.md` — update Payments and Content Availability sections; correct `ca-inter-audit` → `ca-final-audit`

---

## Pre-flight (do once before Task 1)

- [ ] **Step 0a: Pull production env vars locally**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
vercel env pull .env.local
```

Expected: `.env.local` updated with `DATABASE_URL`, `RAZORPAY_*`, `AUTH_*`, etc.

- [ ] **Step 0b: Confirm only test rows exist in `purchases`**

```bash
node --input-type=module -e "
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
const rows = await sql\`SELECT id, user_id, chapter_id, status, created_at FROM purchases\`;
console.table(rows);
"
```

Expected: At most 2 rows belonging to Prabhav + partner. If unexpected rows appear, STOP and re-confirm with the user before proceeding.

- [ ] **Step 0c: Check whether FR (`ca-final-fr`) is loaded**

```bash
node --input-type=module -e "
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
const subs = await sql\`SELECT id FROM subjects WHERE id = 'ca-final-fr'\`;
const chs  = await sql\`SELECT count(*)::int AS n FROM chapters WHERE subject_id = 'ca-final-fr'\`;
const qs   = await sql\`SELECT count(*)::int AS n FROM questions q JOIN chapters c ON c.id = q.chapter_id WHERE c.subject_id = 'ca-final-fr'\`;
console.log({ subjectExists: subs.length > 0, chapterCount: chs[0].n, questionCount: qs[0].n });
"
```

Expected: Either `{ subjectExists: true, chapterCount > 0, questionCount > 0 }` (loaded) OR `{ subjectExists: false, chapterCount: 0, questionCount: 0 }` (not loaded).

- If FR is **not** loaded: load it first using the existing admin upload flow at `/admin` with `data/Questions FR/seed-syllabus-fr.csv` and the question CSVs in that folder. Verify by re-running this command. The migration in Task 2 will succeed either way (its `UPDATE` is idempotent), but FR's free-preview chapter (`ca-final-fr/ch01`) won't be marked free until the chapter row exists.

---

## Task 1: Write the migration SQL

**Files:**
- Create: `migrations/2026-05-03-per-subject-pricing.sql`

- [ ] **Step 1: Create the migrations directory and file**

```bash
mkdir -p "/Users/prabhavmakkar/Desktop/AI projects/Clearpass/migrations"
```

- [ ] **Step 2: Write the migration**

Create `migrations/2026-05-03-per-subject-pricing.sql`:

```sql
-- Per-subject pricing migration
-- 2026-05-03
-- Safe to run multiple times.

BEGIN;

-- 1) Add is_free_preview column to chapters (default false).
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN NOT NULL DEFAULT false;

-- 2a) Mark the three Final-subject preview chapters. Other chapters stay false.
--     Idempotent: running again with the same IDs is a no-op.
UPDATE chapters SET is_free_preview = true
  WHERE id IN (
    'ca-final-afm/derivatives/ch09',
    'ca-final-audit/quality-control/ch01',
    'ca-final-fr/framework-presentation/ch01'
  );

-- 2b) ca-inter-audit is a legacy fully-free subject. Mark every chapter in it
--     as a free preview so it stays accessible to all users with no purchase.
UPDATE chapters SET is_free_preview = true WHERE subject_id = 'ca-inter-audit';

-- 3) Drop existing pending/paid purchases (test data only).
DELETE FROM purchases;

-- 4) Rename chapter_id → subject_id on purchases.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='purchases' AND column_name='chapter_id') THEN
    ALTER TABLE purchases RENAME COLUMN chapter_id TO subject_id;
  END IF;
END$$;

-- 5) Index for fast subject ownership lookups.
CREATE INDEX IF NOT EXISTS idx_purchases_user_subject
  ON purchases(user_id, subject_id) WHERE status = 'paid';

-- 6) TEST99 coupon — 99% off, unlimited uses.
INSERT INTO coupons (code, discount_percent, active)
  VALUES ('TEST99', 99, true)
  ON CONFLICT (code) DO NOTHING;

COMMIT;
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
git add migrations/2026-05-03-per-subject-pricing.sql
git commit -m "feat(db): migration for per-subject pricing"
```

---

## Task 2: Run the migration against production DB

**Files:**
- Create: `scripts/run-migration.ts`

- [ ] **Step 1: Create the runner**

```bash
mkdir -p "/Users/prabhavmakkar/Desktop/AI projects/Clearpass/scripts"
```

Create `scripts/run-migration.ts`:

```ts
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sqlPath = process.argv[2]
if (!sqlPath) {
  console.error('Usage: tsx scripts/run-migration.ts <path-to-sql>')
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(dbUrl)
const text = readFileSync(sqlPath, 'utf8')

// Split on semicolons that end a statement (naive but fine for our migration).
// The Neon HTTP driver does NOT support multi-statement strings via tagged template.
const statements = text
  .split(/;\s*$/m)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`Running ${statements.length} statements from ${sqlPath}`)
for (const stmt of statements) {
  console.log('---')
  console.log(stmt.slice(0, 100) + (stmt.length > 100 ? '...' : ''))
  await sql.query(stmt)
}
console.log('---\nMigration complete.')
```

- [ ] **Step 2: Install `dotenv` if missing**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
node --input-type=module -e "import('dotenv').then(()=>console.log('OK')).catch(()=>process.exit(1))" || npm install --save-dev dotenv
```

Expected: `OK` (already installed) or `dotenv` gets installed.

- [ ] **Step 3: Install `tsx` if missing**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx --yes tsx --version
```

Expected: tsx version printed.

- [ ] **Step 4: Backup the `purchases` table**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
node --input-type=module -e "
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
const rows = await sql\`SELECT * FROM purchases\`;
writeFileSync('purchases-backup-' + Date.now() + '.json', JSON.stringify(rows, null, 2));
console.log('Backed up', rows.length, 'rows');
"
```

Expected: A backup JSON file in the working directory.

- [ ] **Step 5: Run the migration**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx tsx scripts/run-migration.ts migrations/2026-05-03-per-subject-pricing.sql
```

Expected output ends with `Migration complete.`

- [ ] **Step 6: Verify the new state**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
node --input-type=module -e "
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
const free = await sql\`SELECT id FROM chapters WHERE is_free_preview = true ORDER BY id\`;
const cols = await sql\`SELECT column_name FROM information_schema.columns WHERE table_name = 'purchases' ORDER BY column_name\`;
const test99 = await sql\`SELECT code, discount_percent, active FROM coupons WHERE code = 'TEST99'\`;
console.log('Free preview chapters:', free.map(r => r.id));
console.log('purchases columns:', cols.map(r => r.column_name));
console.log('TEST99 coupon:', test99[0]);
"
```

Expected:
- Free preview chapters includes `ca-final-afm/derivatives/ch09`, `ca-final-audit/quality-control/ch01`, `ca-final-fr/framework-presentation/ch01`, plus all `ca-inter-audit/...` chapters (legacy fully-free subject).
- `purchases` columns include `subject_id`, NOT `chapter_id`.
- TEST99 coupon: `{ code: 'TEST99', discount_percent: 99, active: true }`.

- [ ] **Step 7: Commit the runner**

```bash
git add scripts/run-migration.ts package.json package-lock.json
git commit -m "chore(scripts): add migration runner using Neon HTTP driver"
```

---

## Task 3: Update `lib/schema.sql` to match new shape

**Files:**
- Modify: `lib/schema.sql`

- [ ] **Step 1: Edit schema.sql — chapters table**

Find the `CREATE TABLE IF NOT EXISTS chapters` block and append `is_free_preview` column:

Replace:
```sql
CREATE TABLE IF NOT EXISTS chapters (
  id          TEXT PRIMARY KEY,
  section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  exam_weight_percent NUMERIC(5,2) NOT NULL DEFAULT 0
);
```

With:
```sql
CREATE TABLE IF NOT EXISTS chapters (
  id          TEXT PRIMARY KEY,
  section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  exam_weight_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false
);
```

- [ ] **Step 2: Edit schema.sql — purchases table**

Replace:
```sql
CREATE TABLE IF NOT EXISTS purchases (
  id                  TEXT PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id          TEXT NOT NULL,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  amount              INTEGER NOT NULL,
  original_amount     INTEGER NOT NULL,
  coupon_code         TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id, status);
```

With:
```sql
CREATE TABLE IF NOT EXISTS purchases (
  id                  TEXT PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id          TEXT NOT NULL,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  amount              INTEGER NOT NULL,
  original_amount     INTEGER NOT NULL,
  coupon_code         TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_purchases_user_subject ON purchases(user_id, subject_id) WHERE status = 'paid';
```

- [ ] **Step 3: Add TEST99 coupon to schema.sql**

Find:
```sql
INSERT INTO coupons (code, discount_percent, active)
  VALUES ('STUDY70', 70, true)
  ON CONFLICT (code) DO NOTHING;
```

Append after it:
```sql
INSERT INTO coupons (code, discount_percent, active)
  VALUES ('TEST99', 99, true)
  ON CONFLICT (code) DO NOTHING;
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
git add lib/schema.sql
git commit -m "chore(schema): sync schema.sql with per-subject pricing migration"
```

---

## Task 4: Add new query functions (TDD)

**Files:**
- Modify: `lib/queries.ts`
- Test: `lib/__tests__/queries.test.ts`

- [ ] **Step 1: Write failing tests for `getUserPurchasedSubjectIds`**

Open `lib/__tests__/queries.test.ts` and add to the imports at the top:

```ts
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
```

Append at the bottom of the file:

```ts
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
    mockSql.mockResolvedValue([{ id: 'ca-final-afm/ch09' }, { id: 'ca-final-audit/ch01' }])
    expect(await getFreeChapterIds()).toEqual(['ca-final-afm/ch09', 'ca-final-audit/ch01'])
  })
})

describe('getAccessibleChapterIds', () => {
  it('returns only free-preview chapters when userId is null', async () => {
    mockSql.mockResolvedValue([{ id: 'ca-final-afm/ch09' }])
    const result = await getAccessibleChapterIds(null)
    expect(result).toEqual(new Set(['ca-final-afm/ch09']))
    expect(mockSql).toHaveBeenCalledTimes(1)
  })

  it('returns free-preview + chapters of owned subjects when userId is set', async () => {
    mockSql.mockResolvedValue([
      { id: 'ca-final-afm/ch09' },
      { id: 'ca-final-afm/ch01' },
      { id: 'ca-final-afm/ch02' },
    ])
    const result = await getAccessibleChapterIds(7)
    expect(result).toEqual(new Set(['ca-final-afm/ch09', 'ca-final-afm/ch01', 'ca-final-afm/ch02']))
  })
})

describe('getSubjectForChapter', () => {
  it('returns subject id and name', async () => {
    mockSql.mockResolvedValue([{ id: 'ca-final-afm', name: 'CA Final — AFM' }])
    expect(await getSubjectForChapter('ca-final-afm/ch01')).toEqual({ id: 'ca-final-afm', name: 'CA Final — AFM' })
  })

  it('returns null when chapter does not exist', async () => {
    mockSql.mockResolvedValue([])
    expect(await getSubjectForChapter('ghost')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npm test -- queries
```

Expected: FAIL with errors like `getUserPurchasedSubjectIds is not exported` (or "is not a function").

- [ ] **Step 3: Implement the new functions in `lib/queries.ts`**

Find the `// ── Purchases & Coupons ─────────────────────────────────────────────` section. Replace the entire block from that header through the end of `getFreeChapterIds()` with:

```ts
// ── Purchases & Coupons ─────────────────────────────────────────────

export async function getUserPurchasedSubjectIds(userId: number): Promise<string[]> {
  const sql = getDb()
  const rows = await sql`SELECT subject_id FROM purchases WHERE user_id = ${userId} AND status = 'paid'`
  return rows.map(r => r.subject_id as string)
}

export async function hasUserPurchasedSubject(userId: number, subjectId: string): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`SELECT 1 FROM purchases WHERE user_id = ${userId} AND subject_id = ${subjectId} AND status = 'paid' LIMIT 1`
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

// Single source of truth for "can this user see this chapter?"
// - userId === null: only free-preview chapters
// - userId === number: free-preview chapters + every chapter of every subject they own
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
    JOIN purchases p ON p.subject_id = c.subject_id
    WHERE p.user_id = ${userId} AND p.status = 'paid'`
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

This deletes `getUserPurchasedChapterIds`, `hasUserPurchasedChapter`, and the old `chapterId`-based `createPurchase`. Callers will be updated in later tasks.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npm test -- queries
```

Expected: All tests in `queries.test.ts` PASS. (Other tests will run too — they should still pass.)

- [ ] **Step 5: Run the typechecker — expect failures in callsites**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx tsc --noEmit
```

Expected: Errors in `app/api/payments/create-order/route.ts`, `app/api/practice/questions/route.ts`, `app/api/assessment/questions/route.ts`, `app/api/telegram/webhook/route.ts`, `app/select/page.tsx`. These will be fixed in Tasks 5–9. Do NOT commit yet.

---

## Task 5: Update `/api/payments/create-order` (subjectId)

**Files:**
- Modify: `app/api/payments/create-order/route.ts`

- [ ] **Step 1: Replace the route file**

Open `app/api/payments/create-order/route.ts` and replace its entire contents with:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'
import {
  getSubjects,
  hasUserPurchasedSubject,
  getCoupon,
  createPurchase,
} from '@/lib/queries'

const BASE_PRICE_PAISE = 99900 // ₹999

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { subjectId, couponCode } = await req.json()
  if (!subjectId || typeof subjectId !== 'string') {
    return NextResponse.json({ error: 'subjectId required' }, { status: 400 })
  }

  const subjects = await getSubjects()
  const subject = subjects.find(s => s.id === subjectId)
  if (!subject) {
    return NextResponse.json({ error: 'Unknown subject' }, { status: 400 })
  }

  const alreadyPurchased = await hasUserPurchasedSubject(Number(session.user.id), subjectId)
  if (alreadyPurchased) {
    return NextResponse.json({ error: 'Already purchased' }, { status: 409 })
  }

  let amount = BASE_PRICE_PAISE
  let validCoupon: string | null = null

  if (couponCode) {
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
      notes: { subject_id: subjectId, subject_name: subject.name },
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
    userId: Number(session.user.id),
    subjectId,
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
    subjectName: subject.name,
  })
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx tsc --noEmit 2>&1 | grep -E "create-order|payments/create"
```

Expected: No errors in this file. (Errors elsewhere are still fine — fixed in next tasks.)

---

## Task 6: Update `/api/practice/questions` to use `getAccessibleChapterIds`

**Files:**
- Modify: `app/api/practice/questions/route.ts`

- [ ] **Step 1: Replace the route file**

Open `app/api/practice/questions/route.ts` and replace its entire contents with:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getQuestionsForChapters, getAccessibleChapterIds, getSubjectForChapter } from '@/lib/queries'
import type { ClientQuestion } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chapterId = searchParams.get('chapter')
  if (!chapterId) return NextResponse.json({ error: 'chapter param required' }, { status: 400 })

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  try {
    const questions = await getQuestionsForChapters([chapterId])
    if (questions.length === 0) return NextResponse.json({ error: 'No questions for this chapter' }, { status: 404 })

    const clientQuestions: ClientQuestion[] = questions.map(
      ({ correctIndex, explanation, ...rest }) => rest
    )

    const answerKey = Object.fromEntries(questions.map(q => [q.id, { correctIndex: q.correctIndex, explanation: q.explanation }]))

    return NextResponse.json({ questions: clientQuestions, answerKey })
  } catch (err) {
    console.error('[/api/practice/questions]', err)
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx tsc --noEmit 2>&1 | grep -E "practice/questions"
```

Expected: No errors in this file.

---

## Task 7: Update `/api/assessment/questions` to use `getAccessibleChapterIds`

**Files:**
- Modify: `app/api/assessment/questions/route.ts`

- [ ] **Step 1: Edit the imports**

Find:
```ts
import { getQuestionsForChapters, getChaptersByIds, getFreeChapterIds, getUserPurchasedChapterIds } from '@/lib/queries'
```

Replace with:
```ts
import { getQuestionsForChapters, getChaptersByIds, getAccessibleChapterIds, getSubjectForChapter } from '@/lib/queries'
```

- [ ] **Step 2: Replace the access check**

Find:
```ts
  const [freeIds, purchasedIds] = await Promise.all([
    getFreeChapterIds(),
    getUserPurchasedChapterIds(Number(session.user.id)),
  ])
  const accessibleSet = new Set([...freeIds, ...purchasedIds])
  const blocked = chapterIds.filter(id => !accessibleSet.has(id))
  if (blocked.length > 0) {
    return NextResponse.json({ error: 'Some chapters require purchase' }, { status: 403 })
  }
```

Replace with:
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

- [ ] **Step 3: Typecheck**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx tsc --noEmit 2>&1 | grep -E "assessment/questions"
```

Expected: No errors in this file.

---

## Task 8: Update Telegram webhook (subject-level lock + free-preview indicator)

**Files:**
- Modify: `app/api/telegram/webhook/route.ts`

- [ ] **Step 1: Edit imports**

Find:
```ts
import {
  getUserByTelegramId,
  createTelegramLinkCode,
  getSubjects,
  getSections,
  getChapters,
  getQuestionsForChapters,
  getQuestionsByIds,
  getAttemptsByUser,
  getFreeChapterIds,
  getUserPurchasedChapterIds,
} from '@/lib/queries'
```

Replace with:
```ts
import {
  getUserByTelegramId,
  createTelegramLinkCode,
  getSubjects,
  getSections,
  getChapters,
  getQuestionsForChapters,
  getQuestionsByIds,
  getAttemptsByUser,
  getFreeChapterIds,
  getAccessibleChapterIds,
  getSubjectForChapter,
} from '@/lib/queries'
```

- [ ] **Step 2: Add free-preview indicator to chapter keyboard**

Find the `bot.callbackQuery(/^sec:(.+)$/` block. Replace:

```ts
    const kb = new InlineKeyboard()
    for (const c of chapters) {
      kb.text(c.name, `ch:${c.id}`).row()
    }
```

With:
```ts
    const freeIds = new Set(await getFreeChapterIds())
    const kb = new InlineKeyboard()
    for (const c of chapters) {
      const label = freeIds.has(c.id) ? `🆓 ${c.name}` : c.name
      kb.text(label, `ch:${c.id}`).row()
    }
```

- [ ] **Step 3: Replace the `ch:` callback gating**

Find:
```ts
  bot.callbackQuery(/^ch:(.+)$/, async (ctx) => {
    const chapterId = ctx.match![1]

    const user = await getUserByTelegramId(ctx.from!.id)
    if (!user) {
      await ctx.answerCallbackQuery({ text: 'Please link your account first. Send /start' })
      return
    }

    const freeIds = await getFreeChapterIds()
    if (!freeIds.includes(chapterId)) {
      const purchased = await getUserPurchasedChapterIds(user.id)
      if (!purchased.includes(chapterId)) {
        await ctx.answerCallbackQuery()
        await ctx.editMessageText(
          '🔒 *This chapter requires purchase*\n\n' +
          '💰 Unlock for ~₹999~ just *₹299*\n' +
          '🎟 Use coupon code: `STUDY70` (70% off!)\n\n' +
          '💡 _Free access: Derivatives & Valuation (CA Finals) and Audit (CA Inter) — try these to get started!_\n\n' +
          '👉 Visit clearpass.snpventures.in/select to unlock.',
          { parse_mode: 'Markdown' }
        )
        return
      }
    }
```

Replace with:
```ts
  bot.callbackQuery(/^ch:(.+)$/, async (ctx) => {
    const chapterId = ctx.match![1]

    const user = await getUserByTelegramId(ctx.from!.id)
    if (!user) {
      await ctx.answerCallbackQuery({ text: 'Please link your account first. Send /start' })
      return
    }

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

- [ ] **Step 4: Typecheck**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx tsc --noEmit 2>&1 | grep -E "telegram"
```

Expected: No errors in this file.

---

## Task 9: Update `app/select/page.tsx`

**Files:**
- Modify: `app/select/page.tsx`

- [ ] **Step 1: Replace the file**

Open `app/select/page.tsx` and replace its entire contents with:

```ts
import { auth } from '@/lib/auth'
import { getSubjects, getSections, getChapters, getQuestionCountsByChapter, getFreeChapterIds, getUserPurchasedSubjectIds } from '@/lib/queries'
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

  const [allChapters, questionCounts, freeChapterIds, purchasedSubjectIds] = await Promise.all([
    allSectionIds.length > 0 ? getChapters(allSectionIds) : Promise.resolve([]),
    getQuestionCountsByChapter(),
    getFreeChapterIds(),
    session?.user?.id ? getUserPurchasedSubjectIds(Number(session.user.id)) : Promise.resolve([]),
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
        purchasedSubjectIds={purchasedSubjectIds}
      />
    </main>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx tsc --noEmit 2>&1 | grep -E "select/page"
```

Expected: One error about the unknown prop `purchasedSubjectIds` — `TopicSelector` still expects `purchasedChapterIds`. Fixed in Task 10.

---

## Task 10: Update `TopicSelector` to subject-level locking

**Files:**
- Modify: `components/select/TopicSelector.tsx`

This is the largest UI change. Replace the file in full.

- [ ] **Step 1: Replace the file**

Open `components/select/TopicSelector.tsx` and replace its entire contents with:

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
  purchasedSubjectIds: string[]
}

type ExamLevel = 'inter' | 'finals'

function getExamLevel(subjectId: string): ExamLevel {
  if (subjectId.startsWith('ca-inter')) return 'inter'
  return 'finals'
}

export function TopicSelector({ subjects, sections, chapters, questionCounts, freeChapterIds, purchasedSubjectIds }: Props) {
  const router = useRouter()
  const [examLevel, setExamLevel] = useState<ExamLevel>(() => {
    const hasInter = subjects.some(s => getExamLevel(s.id) === 'inter')
    return hasInter ? 'inter' : 'finals'
  })
  const [openSubject, setOpenSubject] = useState<string | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [unlockingSubject, setUnlockingSubject] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountPercent?: number; finalAmount?: number; error?: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const freeSet = useMemo(() => new Set(freeChapterIds), [freeChapterIds])
  const ownedSubjects = useMemo(() => new Set(purchasedSubjectIds), [purchasedSubjectIds])

  const filteredSubjects = useMemo(
    () => subjects.filter(s => getExamLevel(s.id) === examLevel),
    [subjects, examLevel]
  )

  // Per-subject derived state
  const subjectStats = useMemo(() => {
    const stats: Record<string, {
      totalQuestions: number
      chaptersWithContent: number
      totalChapters: number
      hasPaidChapters: boolean
      owned: boolean
    }> = {}
    for (const subject of subjects) {
      const subChapters = chapters.filter(c => c.subjectId === subject.id)
      const withContent = subChapters.filter(c => (questionCounts[c.id] ?? 0) > 0)
      const totalQ = subChapters.reduce((sum, c) => sum + (questionCounts[c.id] ?? 0), 0)
      const hasPaidChapters = subChapters.some(c => !freeSet.has(c.id) && (questionCounts[c.id] ?? 0) > 0)
      stats[subject.id] = {
        totalQuestions: totalQ,
        chaptersWithContent: withContent.length,
        totalChapters: subChapters.length,
        hasPaidChapters,
        owned: ownedSubjects.has(subject.id),
      }
    }
    return stats
  }, [subjects, chapters, questionCounts, freeSet, ownedSubjects])

  function isChapterAccessible(chId: string, subjectId: string): boolean {
    return freeSet.has(chId) || ownedSubjects.has(subjectId)
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

  async function handleUnlockSubject(subjectId: string) {
    setPaymentLoading(true)
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          couponCode: couponResult?.valid ? couponCode.trim() : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to create order')
        return
      }

      const { orderId, amount, purchaseId, subjectName } = await res.json()

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: 'INR',
        name: 'ClearPass',
        description: subjectName ?? 'Subject Unlock',
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
            setUnlockingSubject(null)
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
  const modalSubjectOwned = openSubject ? ownedSubjects.has(openSubject) : false
  const modalSubjectStats = openSubject ? subjectStats[openSubject] : null

  const hasSelection = selectedChapters.size > 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-2 text-2xl font-black sm:text-3xl">Choose Your Exam</h1>
      <p className="mb-6 text-sm text-gray-500">Select your exam level, then pick a subject to explore chapters.</p>

      {/* Exam Level Tabs */}
      <div className="mb-8 flex rounded-xl border border-gray-200 p-1">
        <button
          onClick={() => setExamLevel('inter')}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
            examLevel === 'inter'
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          CA Intermediate
        </button>
        <button
          onClick={() => setExamLevel('finals')}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
            examLevel === 'finals'
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          CA Finals
        </button>
      </div>

      {/* Subject Cards */}
      {filteredSubjects.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">No subjects available for this exam level yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSubjects.map(subject => {
            const stats = subjectStats[subject.id]
            const showLock = stats.hasPaidChapters && !stats.owned
            return (
              <button
                key={subject.id}
                onClick={() => setOpenSubject(subject.id)}
                className="group w-full rounded-xl border border-gray-200 p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-black">
                      {subject.name.replace(/^CA (Intermediate|Final) — /, '')}
                    </h3>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {stats.totalQuestions} questions · {stats.chaptersWithContent}/{stats.totalChapters} chapters active
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {stats.owned && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Unlocked</span>
                    )}
                    {!stats.owned && !stats.hasPaidChapters && (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">Free</span>
                    )}
                    {showLock && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700">₹999</span>
                    )}
                    <svg className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
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

      {/* Chapter Modal */}
      {openSubject && modalSubject && modalSubjectStats && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpenSubject(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black">{modalSubject.name.replace(/^CA (Intermediate|Final) — /, '')}</h2>
                <p className="mt-0.5 text-xs text-gray-500">{modalChapters.length} chapters</p>
              </div>
              <button
                onClick={() => setOpenSubject(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Subject Unlock Banner — only for paid, not-owned subjects */}
            {modalSubjectStats.hasPaidChapters && !modalSubjectStats.owned && (
              <div className="border-b border-gray-100 bg-amber-50/50 px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-amber-800">
                    Unlock the entire subject for <span className="line-through">&#8377;999</span>{' '}
                    <span className="font-bold text-green-700">&#8377;299</span> with{' '}
                    <span className="rounded bg-black px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">STUDY70</span>
                  </p>
                  <button
                    onClick={() => setUnlockingSubject(unlockingSubject === modalSubject.id ? null : modalSubject.id)}
                    className="shrink-0 rounded-md bg-black px-3 py-1 text-xs font-semibold text-white hover:opacity-80"
                  >
                    Unlock
                  </button>
                </div>
                {unlockingSubject === modalSubject.id && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                    <p className="mb-2 text-xs text-gray-500">
                      Price: <span className="line-through text-gray-400">&#8377;999</span>{' '}
                      {couponResult?.valid ? (
                        <span className="font-bold text-green-700">&#8377;{(couponResult.finalAmount! / 100).toFixed(2)}</span>
                      ) : (
                        <span className="font-bold">&#8377;999</span>
                      )}
                    </p>
                    <div className="mb-2 flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
                        placeholder="Coupon code"
                        className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm uppercase placeholder:normal-case placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                      />
                      <button
                        onClick={validateCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
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
                      onClick={() => handleUnlockSubject(modalSubject.id)}
                      disabled={paymentLoading}
                      className="w-full rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
                    >
                      {paymentLoading ? 'Processing...' : `Pay ₹${couponResult?.valid ? (couponResult.finalAmount! / 100).toFixed(2) : '999'}`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Select All / Deselect */}
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

            {/* Chapter List */}
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
                              <span className="text-[10px] text-gray-400">Subject locked</span>
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
                              {!isFree && modalSubjectStats.owned && (
                                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">Unlocked</span>
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

            {/* Modal Footer */}
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

- [ ] **Step 2: Typecheck the whole project**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Build the project**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npm run build
```

Expected: Build completes successfully.

- [ ] **Step 4: Run the test suite**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit Tasks 5–10 together**

```bash
git add app/api/payments/create-order/route.ts app/api/practice/questions/route.ts app/api/assessment/questions/route.ts app/api/telegram/webhook/route.ts app/select/page.tsx components/select/TopicSelector.tsx lib/queries.ts lib/__tests__/queries.test.ts
git commit -m "feat(payments): switch to per-subject pricing with free-preview chapters"
```

---

## Task 11: Update marketing copy

**Files:**
- Modify: `components/landing/Hero.tsx`

- [ ] **Step 1: Find the current "Live now" pill text**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
grep -n "Live now" components/landing/Hero.tsx
```

Expected: Returns one match around line 24.

- [ ] **Step 2: Update the copy**

In `components/landing/Hero.tsx`, find:
```tsx
          Live now: Derivatives &amp; Valuation (CA Finals) — more chapters dropping soon
```

Replace with:
```tsx
          Live now: AFM, FR &amp; Audit (CA Finals) — try one free chapter per subject
```

- [ ] **Step 3: Build to confirm**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/landing/Hero.tsx
git commit -m "feat(landing): update Live now pill to reflect per-subject pricing"
```

---

## Task 12: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Payments section**

In `CLAUDE.md`, find the `### 6. Payments (Razorpay)` section. Replace the `**Base price**`, `**Free chapters**`, `**Purchasable chapters**`, and `**Frontend flow**` paragraphs with:

```markdown
**Base price**: ₹999 per **subject** (one purchase unlocks every chapter in that subject). Coupons can reduce this:
- `STUDY70` — 70% off → ₹299 (public)
- `TEST99` — 99% off → ₹9.99 (test coupon to exercise the real Razorpay path in production)

**Free preview chapters** (one per paid subject): determined by `chapters.is_free_preview` boolean column. Currently:
- `ca-final-afm/derivatives/ch09` — Introduction to Forwards Futures and Options (AFM)
- `ca-final-audit/quality-control/ch01` — Quality Control — SQC-1 & SA 220 (Audit)
- `ca-final-fr/framework-presentation/ch01` — Introduction to Indian Accounting Standards (FR)
- All `ca-inter-audit/...` chapters (legacy fully-free CA Intermediate subject)

**Paid subjects**: AFM, Audit, FR (CA Finals). The legacy `ca-inter-audit` subject remains fully free.

**API routes:**
- `POST /api/payments/create-order` — accepts `{ subjectId, couponCode? }`, creates Razorpay order, stores pending purchase
- `POST /api/payments/verify` — HMAC-SHA256 signature verification, marks purchase as paid
- `POST /api/payments/validate-coupon` — validates coupon code, returns discount info

**Frontend flow** (`TopicSelector`):
1. User opens a subject card with the lock badge
2. "Unlock" panel appears in the subject modal with coupon input + Pay button
3. Pay → calls create-order with `subjectId` → opens Razorpay checkout → on success calls verify → `router.refresh()`

**Purchase gating** is centralized in `getAccessibleChapterIds(userId)` in `lib/queries.ts`. Used by:
- `GET /api/practice/questions` — checks the requested chapter is accessible
- `GET /api/assessment/questions` — checks all requested chapters are accessible
- Telegram bot `ch:` callback — checks before starting practice
- `TopicSelector` UI — locked subjects can't be selected for assessment
```

- [ ] **Step 2: Update the Content Availability section**

Find:
```markdown
## Content Availability

- **Free**: Derivatives & Valuation (CA Finals) + all Audit chapters (CA Intermediate)
- **Paid** (₹999/chapter, ₹299 with STUDY70 coupon): Foreign Exchange, International Finance, Interest Rate Risk
- **Coming Soon**: Chapters without questions show greyed-out "Coming soon" state in TopicSelector
```

Replace with:
```markdown
## Content Availability

- **Paid subjects** (₹999 per subject, ₹299 with STUDY70 coupon): AFM, Audit, FR — all CA Finals
- **Free preview chapter per paid subject**: AFM derivatives/ch09 (Forwards Futures and Options), Audit quality-control/ch01 (Quality Control), FR framework-presentation/ch01 (Intro to Ind AS)
- **Fully free subject**: `ca-inter-audit` (legacy CA Intermediate Audit) — every chapter accessible without purchase
- **Coming Soon**: Chapters without questions show greyed-out "Coming soon" state in TopicSelector
```

- [ ] **Step 3: Update Subjects & Naming section**

Find:
```markdown
- **CA Intermediate — Audit** (`ca-inter-audit`): Legacy fully-free subject — all chapters flagged `is_free_preview = true`
- **CA Final — Advanced Financial Management** (`ca-final-afm`): Derivatives, Forex, International Finance, Interest Rate Risk
- Subject IDs use prefix convention: `ca-inter-*` = Intermediate, `ca-final-*` = Finals
- The select page auto-categorizes subjects into exam level tabs using this prefix
```

Replace with:
```markdown
- **CA Final — Auditing & Ethics** (`ca-final-audit`): Real questions from CA partner (not AI-generated)
- **CA Final — Advanced Financial Management** (`ca-final-afm`): Derivatives, Forex, International Finance, Interest Rate Risk, Valuation, M&A
- **CA Final — Financial Reporting** (`ca-final-fr`): Ind AS framework, measurement, disclosures, group accounts
- Subject IDs use prefix convention: `ca-inter-*` = Intermediate, `ca-final-*` = Finals
- The select page auto-categorizes subjects into exam level tabs using this prefix
```

- [ ] **Step 4: Update the `purchases` table row in the Database Tables table**

Find:
```markdown
| `purchases` | Payment records (id, user_id, chapter_id, razorpay IDs, amount, coupon, status) |
```

Replace with:
```markdown
| `purchases` | Payment records (id, user_id, subject_id, razorpay IDs, amount, coupon, status) |
```

- [ ] **Step 5: Update the chapters table row to mention `is_free_preview`**

Find:
```markdown
| `chapters` | Chapters within sections |
```

Replace with:
```markdown
| `chapters` | Chapters within sections (with `is_free_preview` flag) |
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for per-subject pricing"
```

---

## Task 13: Manual end-to-end verification on local dev

**Files:** None (manual testing)

The migration in Task 2 already ran against the production DB, but `npm run dev` reads from the same `DATABASE_URL`, so this exercises the new code against real data.

- [ ] **Step 1: Start dev server**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
npm run dev
```

Expected: Server starts at http://localhost:3000.

- [ ] **Step 2: Sign in with a fresh account or your own** (in the browser)

Open http://localhost:3000/sign-in and complete Google OAuth.

- [ ] **Step 3: Verify subject cards on `/select`**

Open http://localhost:3000/select.

Expected:
- AFM, Audit, FR each show a `₹999` lock badge (assuming the user does not own them).
- Subject card click opens the modal showing the unlock banner.

- [ ] **Step 4: Verify free-preview chapter access**

Open the AFM modal. Find chapter `ch09` "Introduction to Forwards Futures and Options". It should have a green `Free preview` badge and be selectable. Click "Practice →" — practice page loads with questions.

- [ ] **Step 5: Verify locked chapter blocks practice**

Open the AFM modal. Find a non-preview chapter, e.g. `ch15` "Foreign Exchange Exposure and Risk Management". It should show greyed text + "Subject locked" label. Confirm you cannot select it for assessment.

Manually hit the locked chapter via URL: open `/practice?chapter=ca-final-afm/ch15`. Expected: page shows an error from the API (network tab shows 403 with `subject_not_purchased`).

- [ ] **Step 6: Buy AFM with TEST99**

In the AFM modal, click "Unlock". Enter `TEST99`, click "Apply" — should show "99% discount applied!" and price `₹9.99`. Click "Pay ₹9.99". Razorpay modal opens. Use Razorpay test card `4111 1111 1111 1111`, any future expiry, any CVV.

Expected after payment:
- Modal closes, `router.refresh()` runs.
- AFM subject card now shows `Unlocked` badge.
- All AFM chapters in modal selectable; non-preview chapters now show `Unlocked` badge.

- [ ] **Step 7: Try buying AFM again**

Reopen AFM modal. The Unlock banner should NOT appear (subject owned). If you somehow trigger create-order with `ca-final-afm`, expect 409.

- [ ] **Step 8: Verify Audit & FR are still locked**

Open Audit modal: only `ch01` is selectable + has Free preview badge. Other chapters say "Subject locked". Same for FR.

- [ ] **Step 9: Cross-subject assessment is blocked**

Use browser devtools to manually request `/api/assessment/questions?chapters=ca-final-afm/ch01,ca-final-audit/ch02`. Expected: 403 with `subject_not_purchased` and `subjectName: "CA Final — Auditing & Ethics"`.

- [ ] **Step 10: Telegram smoke test (if your local can receive webhooks)**

If you have a tunnel (ngrok) or are testing on production after deploy: send `/practice` to @ClearpassCAbot, drill into AFM → Forex section → ch15. Expect the new locked-subject message naming "CA Final — Advanced Financial Management".

If no tunnel: defer this check to Task 14 (production smoke test).

- [ ] **Step 11: Stop dev server (Ctrl+C)**

---

## Task 14: Deploy to production

**Files:** None (deployment)

- [ ] **Step 1: Push and deploy**

```bash
cd "/Users/prabhavmakkar/Desktop/AI projects/Clearpass"
git push origin dev
vercel --prod
```

Expected: Vercel builds, then deploys. Watch for build errors. The migration already ran against the same DB in Task 2, so no DB step is needed at deploy time.

- [ ] **Step 2: Production smoke test — web**

Open https://clearpass.snpventures.in in an incognito window. Sign in. Repeat Steps 3–9 from Task 13 against production.

- [ ] **Step 3: Production smoke test — Telegram**

Open @ClearpassCAbot in Telegram. Send `/practice` → AFM (or whichever subject is locked for the test account) → drill into a section → tap a non-preview chapter. Expect the new locked-subject message naming the subject.

Then tap the free-preview chapter (🆓 prefix in the keyboard). Expect questions to load.

- [ ] **Step 4: If anything is broken, rollback**

```bash
# Roll back the deploy via Vercel dashboard (Deployments → previous → Promote to Production).
# Then reverse the column rename if needed:
node --input-type=module -e "
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
await sql\`ALTER TABLE purchases RENAME COLUMN subject_id TO chapter_id\`;
console.log('rolled back');
"
```

The `is_free_preview` column is harmless under old code (column ignored by old queries).

- [ ] **Step 5: Mark plan as done**

Once smoke tests pass on production, this plan is complete.

---

## Self-Review Notes

- **Spec coverage:**
  - Schema changes (§5 of spec) → Tasks 1, 2, 3
  - Code changes (§6) → Tasks 4–10 cover every callsite listed
  - Telegram bot specifics (§6.5) → Task 8
  - TEST99 coupon (§7) → Task 1 (migration), Task 3 (schema.sql), tested in Task 13 step 6
  - Testing strategy (§8) → unit tests in Task 4; manual E2E in Task 13; production smoke in Task 14
  - Rollout (§9) → pre-flight steps + Task 14
- **No placeholders:** Every step has either explicit code, exact commands, or expected output.
- **Type/name consistency:**
  - `getAccessibleChapterIds(userId: number | null) → Set<string>` is consistent across queries.ts (Task 4), practice route (Task 6), assessment route (Task 7), telegram webhook (Task 8).
  - `purchasedSubjectIds` prop name consistent in select/page.tsx (Task 9) and TopicSelector (Task 10).
  - `subjectId` field name consistent in `createPurchase` signature (Task 4) and create-order route (Task 5).
