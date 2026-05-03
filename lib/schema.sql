-- ClearPass Phase 1 — Knowledge Graph + Question Bank (Neon Postgres)

CREATE TABLE IF NOT EXISTS subjects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sections (
  id          TEXT PRIMARY KEY,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  exam_weight_percent NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chapters (
  id          TEXT PRIMARY KEY,
  section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  exam_weight_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS questions (
  id          TEXT PRIMARY KEY,
  chapter_id  TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  stem        TEXT NOT NULL,
  option_a    TEXT NOT NULL,
  option_b    TEXT NOT NULL,
  option_c    TEXT NOT NULL,
  option_d    TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL DEFAULT '',
  icai_reference TEXT,
  source      TEXT NOT NULL DEFAULT 'bank' CHECK (source IN ('bank', 'ai-generated')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(chapter_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_chapters_section ON chapters(section_id);
CREATE INDEX IF NOT EXISTS idx_sections_subject ON sections(subject_id);

-- ── Auth.js (NextAuth v5) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255),
  email       VARCHAR(255),
  "emailVerified" TIMESTAMPTZ,
  image       TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id                  SERIAL PRIMARY KEY,
  "userId"            INTEGER NOT NULL,
  type                VARCHAR(255) NOT NULL,
  provider            VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  id_token            TEXT,
  scope               TEXT,
  session_state       TEXT,
  token_type          TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id              SERIAL PRIMARY KEY,
  "userId"        INTEGER NOT NULL,
  expires         TIMESTAMPTZ NOT NULL,
  "sessionToken"  VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  token      TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ── Result Persistence ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id              TEXT PRIMARY KEY,
  user_id         INTEGER NOT NULL,
  subject_id      TEXT NOT NULL,
  scope           JSONB NOT NULL DEFAULT '{}',
  overall_score   NUMERIC(5,2) NOT NULL,
  readiness_score NUMERIC(5,2) NOT NULL,
  readiness_tier  TEXT NOT NULL,
  correct_count   INTEGER NOT NULL,
  total_count     INTEGER NOT NULL,
  chapter_scores  JSONB NOT NULL DEFAULT '[]',
  section_scores  JSONB NOT NULL DEFAULT '[]',
  question_review JSONB NOT NULL DEFAULT '[]',
  weakness_analysis TEXT NOT NULL DEFAULT '',
  study_plan      JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created ON assessment_attempts(user_id, created_at DESC);

-- ── Telegram Linking ─────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

CREATE TABLE IF NOT EXISTS telegram_link_codes (
  code       TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Feedback ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  attempt_id  TEXT,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Payments ────────────────────────────────────────────────────────

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

CREATE TABLE IF NOT EXISTS coupons (
  code             TEXT PRIMARY KEY,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  max_uses         INTEGER,
  used_count       INTEGER NOT NULL DEFAULT 0,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO coupons (code, discount_percent, active)
  VALUES ('STUDY70', 70, true)
  ON CONFLICT (code) DO NOTHING;

INSERT INTO coupons (code, discount_percent, active)
  VALUES ('TEST99', 99, true)
  ON CONFLICT (code) DO NOTHING;
