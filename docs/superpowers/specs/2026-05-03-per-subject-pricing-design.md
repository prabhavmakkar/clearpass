# Per-Subject Pricing — Design Spec

**Date:** 2026-05-03
**Author:** Prabhav (with Claude)
**Status:** Approved, ready for implementation plan

---

## 1. Background

ClearPass currently sells access **per chapter** at ₹999/chapter (₹299 with `STUDY70`). Free content is determined by string-matching SQL: any section whose name contains "Derivatives" plus any chapter whose ID starts with `ca-inter-audit/`.

Two issues motivate the change:

1. **Per-chapter pricing is bad UX.** Students who want to prep a subject have to buy chapters one-by-one. The price-per-value perception is poor when chapters are small.
2. **Free-content rules are brittle.** They live as `ILIKE` patterns inside `getFreeChapterIds()`. Renaming a section silently changes pricing.

Only two paying users exist (Prabhav + CA partner, both for testing). No real customer migration is needed.

## 2. Goals

- Sell access **per subject** at ₹999/subject. One purchase unlocks every chapter in that subject.
- Each paid subject exposes **exactly one chapter as a free preview** so students can sample before buying.
- Replace the brittle SQL-pattern free-content rule with a **data-driven flag** on the `chapters` table.
- Telegram bot enforces the same per-subject gating as the web app — single source of truth in `lib/queries.ts`.
- Add a `TEST99` coupon (99% off → ₹9.99) for end-to-end Razorpay testing in production.

## 3. Non-Goals

- No grandfathering for existing per-chapter purchases (no real customers to migrate).
- No partial-subject or section-level pricing.
- No bundle pricing across multiple subjects.
- No subscription / recurring billing.
- No changes to assessment scoring, study plans, or telegram linking flow.
- No changes to admin upload tooling (CSVs still upload chapter/question rows; admin operator sets `is_free_preview` manually via DB or admin UI later).

## 4. Subjects in scope

| Subject ID | Name | Status | Free preview chapter |
|---|---|---|---|
| `ca-final-afm` | CA Final — Advanced Financial Management | Paid (₹999) | `ca-final-afm/ch09` — Introduction to Forwards Futures and Options |
| `ca-final-audit` | CA Final — Auditing & Ethics | Paid (₹999) | `ca-final-audit/ch01` — Quality Control — SQC-1 & SA 220 |
| `ca-final-fr` | CA Final — Financial Reporting | Paid (₹999) | `ca-final-fr/ch01` — Introduction to Indian Accounting Standards |

Notes:
- AFM preview chapter `ch09` is the first chapter of the Derivatives section, preserving spirit of the previous "Derivatives is free" carve-out without keeping the entire section open.
- The implementation plan must verify FR (`ca-final-fr`) syllabus + questions are loaded into the production DB before this change ships. If not loaded, plan must include the load step.
- Subject IDs above are authoritative. CLAUDE.md's mention of `ca-inter-audit` is outdated and will be corrected as part of this work.

## 5. Schema changes

```sql
-- 1) Free-preview flag on chapters
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS is_free_preview BOOLEAN NOT NULL DEFAULT false;

-- 2) Mark the three preview chapters
UPDATE chapters SET is_free_preview = true
  WHERE id IN ('ca-final-afm/ch09', 'ca-final-audit/ch01', 'ca-final-fr/ch01');

-- 3) Purchases table: switch from chapter to subject
--    Safe to drop existing rows — only test users in the table.
DELETE FROM purchases;
ALTER TABLE purchases RENAME COLUMN chapter_id TO subject_id;

-- 4) Index on (user_id, subject_id) for fast access checks
CREATE INDEX IF NOT EXISTS idx_purchases_user_subject ON purchases(user_id, subject_id) WHERE status = 'paid';

-- 5) Test coupon — 99% off (₹999 → ₹9.99)
INSERT INTO coupons (code, discount_percent, active)
  VALUES ('TEST99', 99, true)
  ON CONFLICT (code) DO NOTHING;
```

`schema.sql` is updated to reflect the new shape so a fresh-database bootstrap matches production.

## 6. Code changes

### 6.1 `lib/queries.ts`

Replace the chapter-centric purchase functions with subject-centric ones:

| Old | New |
|---|---|
| `getUserPurchasedChapterIds(userId): string[]` | `getUserPurchasedSubjectIds(userId): string[]` |
| `hasUserPurchasedChapter(userId, chapterId)` | `hasUserPurchasedSubject(userId, subjectId)` |
| `createPurchase({ chapterId, ... })` | `createPurchase({ subjectId, ... })` |
| `getFreeChapterIds()` — uses `ILIKE` SQL | `getFreeChapterIds()` — `SELECT id FROM chapters WHERE is_free_preview = true` |

New helper for the gate logic (used by every gated route):

```ts
// Returns the set of chapter IDs the user can access right now.
// Includes: every free-preview chapter + every chapter whose subject the user owns.
export async function getAccessibleChapterIds(userId: number | null): Promise<Set<string>>
```

This single function becomes the access-control primitive. Routes call it once and check membership rather than running their own free-vs-paid logic.

### 6.2 `/api/payments/create-order`

- Request body: `{ subjectId, couponCode? }` (was `{ chapterId, couponCode? }`)
- Validation: `subjectId` exists in `subjects` table; subject is not entirely free (must have at least one non-preview chapter with questions); user does not already own subject.
- Receipt note in Razorpay: `"ClearPass — <subject name>"`
- Persists `purchases` row with `subject_id`.

### 6.3 `/api/payments/verify`

No interface change — already keyed by `purchaseId`. Internally just persists the subject-level row paid.

### 6.4 `/api/practice/questions` and `/api/assessment/questions`

Both routes:
1. Resolve the requested chapter(s) → look up `subject_id` and `is_free_preview`.
2. Build accessible-chapter set via `getAccessibleChapterIds(userId)`.
3. If any requested chapter is not in the accessible set → 403 with `{ error: 'subject_not_purchased', subjectId, subjectName }` so UI can show the right CTA.

### 6.5 `app/api/telegram/webhook/route.ts`

The `ch:` callback (line ~211) currently checks per-chapter purchase. Switch to:

```ts
const accessible = await getAccessibleChapterIds(user.id)
if (!accessible.has(chapterId)) {
  // look up subject for this chapter to name it in the message
  const subject = await getSubjectForChapter(chapterId)
  await ctx.editMessageText(
    `🔒 *${subject.name} is locked*\n\n` +
    `💰 Unlock the entire subject for ~₹999~ just *₹299* with coupon \`STUDY70\`\n\n` +
    `💡 _Try the free preview chapter in this subject to get started._\n\n` +
    `👉 Visit clearpass.snpventures.in/select to unlock.`,
    { parse_mode: 'Markdown' }
  )
  return
}
```

Section/chapter listing keyboards stay the same — gating is applied at the moment a chapter is opened. Free preview chapters appear in the keyboard with a `🆓` prefix.

### 6.6 `components/select/TopicSelector.tsx`

UI changes:

- **Subject card** now shows the lock state: "₹999 — Unlock subject" button if the subject is paid and not owned. "Owned" badge if owned. Free-only subjects (none in current data) just show "Free."
- **Inline payment panel** opens at the subject level (was per chapter): coupon input, "Apply", "Pay" → Razorpay modal → `router.refresh()`.
- **Chapter modal** (inside subject):
  - Free-preview chapter: full-color, badge `Free preview`.
  - Other chapters: shown with lock icon if subject not owned; clicking opens "Unlock this subject" CTA instead of selecting.
  - If owned: all chapters selectable as before.
- The free-chapter free-pass + checkbox state machine stays — just sourced from `is_free_preview` instead of name patterns.

### 6.7 `app/select/page.tsx`

Replace `getUserPurchasedChapterIds` with `getUserPurchasedSubjectIds` in the SSR fetch and pass `purchasedSubjectIds` to `TopicSelector` instead of `purchasedChapterIds`.

### 6.8 Marketing copy

- `components/landing/Hero.tsx`: "Live now" pill copy updated to reflect 3 paid subjects.
- `CLAUDE.md`: rewrite the "Payments (Razorpay)" and "Content Availability" sections; correct `ca-inter-audit` → `ca-final-audit` references.

## 7. Coupon catalogue

| Code | Discount | Use case |
|---|---|---|
| `STUDY70` | 70% off → ₹299 | Public discount |
| `TEST99` | 99% off → ₹9.99 | End-to-end Razorpay test in production. Active = true, max_uses = null (unlimited) — restricted by knowledge of the code, not table-level limits. |

`TEST99` is intentionally cheap-not-free: a free coupon would skip Razorpay entirely and not exercise the real payment path. ₹9.99 still goes through Razorpay's order/verify flow.

## 8. Testing strategy

### 8.1 Unit tests (`lib/__tests__`)
- `getAccessibleChapterIds` returns:
  - just the free-preview chapters when `userId` is null
  - free-preview chapters + all chapters of every owned subject for a paying user
  - just the free-preview chapters for a signed-in user with no purchases
- `hasUserPurchasedSubject` and `getUserPurchasedSubjectIds` round-trip correctly through `createPurchase` + `markPurchasePaid`.

### 8.2 API tests
- `POST /api/payments/create-order`:
  - rejects when subject already owned (409)
  - rejects when subjectId doesn't exist (400)
  - applies `STUDY70` → 299 INR; applies `TEST99` → 999 paise (₹9.99)
- `GET /api/practice/questions?chapter=X` (auth required by middleware — preview ≠ no-account):
  - 200 for free preview chapter for any signed-in user
  - 200 for owned subject's chapter
  - 403 with `subject_not_purchased` for unowned paid chapter
- `GET /api/assessment/questions?chapters=A,B`: 403 if any chapter is locked, 200 if all accessible.

### 8.3 Manual end-to-end (Razorpay test mode + production)
1. Fresh user → confirm only free-preview chapters of AFM/Audit/FR are unlocked.
2. Buy AFM with `TEST99` → verify all 20 AFM chapters unlock; Audit + FR remain locked.
3. Buy Audit with `STUDY70` → verify Audit unlocks; AFM still owned; FR still locked.
4. Try buying AFM again → API returns 409.
5. Practice flow: open free-preview chapter as fresh user (no auth) — works. Open paid chapter — paywall.
6. Assessment flow: select multiple chapters spanning owned + unowned subjects → 403 with helpful error message.

### 8.4 Telegram smoke test
- `/practice` → subject → section → free-preview chapter → questions load.
- `/practice` → subject → section → locked chapter → see new "subject is locked" message naming the subject.
- After buying AFM via web → re-trigger telegram → all AFM chapters open in bot.

### 8.5 Pre-deploy verification
- `SELECT count(*) FROM purchases WHERE status = 'paid';` — confirm only test rows before running migration.
- Backup `purchases` table before `DELETE`.

## 9. Rollout

Single migration window since there are no real customers:

1. Run schema migration on Neon (`ALTER`, `UPDATE`, `DELETE`, `CREATE INDEX`, `INSERT coupon`).
2. Verify `SELECT id, is_free_preview FROM chapters WHERE is_free_preview = true` returns the 3 chosen chapters.
3. Deploy code (Vercel — single deploy with all code changes).
4. Smoke test on production: web + telegram flows from §8.3 and §8.4.
5. Update `CLAUDE.md`.

Rollback: revert the deploy commit on Vercel; the new `is_free_preview` column is harmless with old code (column ignored). The `subject_id` column rename is the only DB change that breaks old code — keep the migration's reverse SQL on hand:

```sql
ALTER TABLE purchases RENAME COLUMN subject_id TO chapter_id;
```

## 10. Open questions

None — confirmed with user 2026-05-03.
