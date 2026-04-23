-- Auth.js tables + assessment_attempts (run once against Neon)

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
