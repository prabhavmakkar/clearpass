-- Bundle pricing migration
-- 2026-05-09
-- Deactivates STUDY70. Bundle gating itself is implemented in code, not schema.

BEGIN;

-- Take STUDY70 out of circulation (kept in table for historical reference).
UPDATE coupons SET active = false WHERE code = 'STUDY70';

COMMIT;
