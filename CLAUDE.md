# ClearPass

CA exam preparation platform — diagnostic assessments, practice questions, readiness reports, and study plans for Chartered Accountancy students.

**Production**: https://clearpass.snpventures.in
**Telegram Bot**: @ClearpassCAbot

## Tech Stack

- **Framework**: Next.js 15 (App Router, server components)
- **Database**: Neon Postgres (`@neondatabase/serverless`)
- **Auth**: Auth.js v5 (`next-auth@beta`) with Google OAuth + `@auth/pg-adapter`
- **Payments**: Razorpay (planned — not yet integrated)
- **Telegram Bot**: grammy (webhook mode, not long-polling)
- **Hosting**: Vercel (serverless functions)
- **Styling**: Tailwind CSS
- **Animations**: framer-motion (landing page only)

## Architecture

### Database (`lib/db.ts`)
Uses `neon()` tagged template from `@neondatabase/serverless`. Every query call creates a fresh connection via `getDb()` — this is intentional for serverless (no persistent pool).

### Auth (`lib/auth.ts`)
Auth.js v5 configured as a function (not object) so that `Pool` is created inside each request handler — required for Neon serverless. Uses database session strategy (sessions stored in Postgres, not JWTs).

**Critical env var**: `AUTH_URL=https://clearpass.snpventures.in` — Auth.js uses this to generate OAuth callback URLs. Without it, Vercel's deployment URL is used instead of the custom domain.

### Middleware (`middleware.ts`)
Edge-compatible route protection via cookie check (not Auth.js `auth()` wrapper, which imports Node.js APIs incompatible with Edge runtime). Checks for `authjs.session-token` or `__Secure-authjs.session-token` cookies.

Protected routes: `/select`, `/assessment`, `/practice`, `/history`, `/profile`, `/link-telegram`

### Queries (`lib/queries.ts`)
All database queries in one file. Maps raw Postgres rows to typed objects. Handles: subjects, sections, chapters, questions, assessment attempts, telegram linking, feedback, admin writes.

### Scoring (`lib/scoring.ts`)
Assessment report generation — calculates scores per chapter/section, readiness tiers, weakness analysis.

### Adaptive Engine (`lib/adaptiveEngine.ts`)
Diagnostic and practice content selection using Neon-backed question bank.

## Features

### 1. Syllabus & Question Bank (Admin)
- **Upload syllabus**: `POST /api/admin/upload-syllabus` — CSV with subjects, sections, chapters
- **Upload questions**: `POST /api/admin/upload-questions` — CSV with questions, options, correct answers
- **Admin page**: `/admin` (password-protected via `ADMIN_PASSWORD` env var)

### 2. Assessment Flow
- **Select scope**: `/select` → `TopicSelector` component — pick subject, sections, chapters
- **Take assessment**: `/assessment` → `AssessmentRunner` component — timed MCQ test
- **View results**: `/assessment/results` → `AssessmentResults` component — calls `POST /api/assessment/report`
- Results include: score overview, section/chapter breakdown, weakness analysis, AI study plan, answer review
- Reports are persisted to `assessment_attempts` table for logged-in users

### 3. Practice Mode
- `/practice` — untimed practice with instant feedback per question
- `GET /api/practice/questions?chapter=<id>` — fetches questions for a chapter

### 4. History & Profile
- `/history` — list of past assessment attempts (`GET /api/me/attempts`)
- `/history/[id]` — detailed view of a saved report (`GET /api/me/attempts/[id]`)
- `/profile` — user info, stats (tests taken, best score, total questions), recent attempts, sign out

### 5. Telegram Bot (`app/api/telegram/webhook/route.ts`)
Webhook-based bot using grammy. Lazy-initialized via `getBot()` to avoid build-time env var errors.

**Commands:**
- `/start` — welcome message with command guide + account linking button
- `/practice` — subject → section → chapter selection via inline keyboards
- `/stats` — assessment history summary
- `/stop` — end current practice
- `/help` — command reference

**Flow**: Uses stateless callback data encoding (`ans:questionId:picked:correct:index:correctCount:total`) — no server-side session state needed across serverless invocations.

**Account linking**: Telegram → opens `clearpass.snpventures.in/sign-in` → Google OAuth → `/api/telegram/link` creates link code → `/link-telegram` consumes code and links `telegram_id` to user.

**Empty content**: Sections/chapters without questions show "Stay Tuned!" messages.

### 6. Feedback System
- `FeedbackCard` component shown on results page after assessment completion
- 1-5 star rating + optional comment
- `POST /api/feedback` — stores in `feedback` table
- Shows once per attempt (tracked via localStorage with `attemptId`)
- Dismissible (X button)

### 7. Legal Pages
- `/privacy` — Privacy Policy
- `/terms` — Terms of Service
- `/refund` — Refund Policy (no refunds on digital content)
- Contact: snpventures.com@gmail.com / +91 97243 42494

### 8. Landing Page
- Responsive nav with hamburger menu on mobile (< 768px breakpoint)
- Hero with "Live now: Derivatives & Valuation (CA Finals)" pill badge
- Story, Features, CTA sections
- Global footer with Product/Resources/Legal columns (in `app/layout.tsx`)

## Content Availability

- **Free**: Derivatives & Valuation chapter (CA Finals)
- **Paid** (₹299/chapter, planned): Foreign Exchange, International Finance, Interest Rate Risk
- **Coming Soon**: All other chapters show greyed-out "Coming soon" state in TopicSelector

## Database Tables

| Table | Purpose |
|-------|---------|
| `subjects` | CA exam subjects |
| `sections` | Sections within subjects (with exam weight %) |
| `chapters` | Chapters within sections |
| `questions` | MCQ question bank (stem, 4 options, correct, explanation, difficulty) |
| `users` | Auth.js managed (+ `telegram_id` column) |
| `accounts` | Auth.js OAuth accounts |
| `sessions` | Auth.js database sessions |
| `verification_token` | Auth.js email verification |
| `assessment_attempts` | Saved assessment results (JSONB for scores, reviews, study plans) |
| `telegram_link_codes` | Temporary codes for Telegram account linking (10 min expiry) |
| `feedback` | User ratings and comments (1-5 stars) |
| `purchases` | Payment records (planned — not yet created) |

## Environment Variables

### Required (Production)
| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Server | Neon Postgres connection string |
| `AUTH_URL` | Server | Must be `https://clearpass.snpventures.in` — Auth.js uses this for OAuth callbacks |
| `AUTH_SECRET` | Server | Auth.js session encryption key |
| `AUTH_GOOGLE_ID` | Server | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Server | Google OAuth client secret |
| `TELEGRAM_BOT_TOKEN` | Server | grammy bot token |
| `GEMINI_API_KEY` | Server | Gemini API for AI-powered study plans |
| `ADMIN_PASSWORD` | Server | Admin page access |
| `NEXT_PUBLIC_APP_URL` | Build-time | Public app URL (used by client components) |
| `NEXT_PUBLIC_APPS_SCRIPT_URL` | Build-time | Google Apps Script endpoint |

### Planned
| Variable | Purpose |
|----------|---------|
| `RAZORPAY_KEY_ID` | Razorpay server-side key |
| `RAZORPAY_KEY_SECRET` | Razorpay server-side secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay client-side key (for checkout modal) |

## Key Gotchas

1. **Neon Pool creation**: Must happen inside request handlers, not at module scope — serverless can't keep connections alive.
2. **Auth.js Edge incompatibility**: Don't use `auth()` in middleware — it imports Node.js APIs. Use cookie-based check instead.
3. **Telegram bot lazy init**: `new Bot(token)` at module scope fails during Vercel build (env vars not available). Use `getBot()` pattern with `export const dynamic = 'force-dynamic'`.
4. **`AUTH_URL` is critical**: Without it, Auth.js generates OAuth callbacks pointing to Vercel deployment URLs instead of the custom domain. Set it in Vercel env vars (not just `.env.local`).
5. **`echo` vs `printf` for Vercel env vars**: `echo "value" | vercel env add` adds a trailing newline to the value. Use `printf 'value'` instead.
6. **`NEXT_PUBLIC_` vars are build-time**: Don't use them in server-side API routes for URL generation — use `AUTH_URL` (runtime) instead.

## Commands

```bash
npm run dev          # Local dev server (port 3000)
npm run build        # Production build
vercel --prod        # Deploy to production
vercel env ls        # List Vercel env vars
```

## Git Workflow

- `main` — production branch
- `dev` — development branch (PRs merge here first)
- Vercel auto-deploys from git, but manual `vercel --prod` is also used for immediate deploys
