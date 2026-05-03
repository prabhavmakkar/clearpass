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
