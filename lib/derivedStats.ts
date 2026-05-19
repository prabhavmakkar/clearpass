// Derived gamification stats — pure functions, no DB. Source data is an array
// of assessment attempts (and a bundle-ownership flag). Day boundaries use the
// Asia/Kolkata timezone since the audience is Indian CA students.

export interface StreakStats {
  current: number
  longest: number
  lastActiveDate: string | null   // YYYY-MM-DD in IST, or null if no activity
}

export interface HeatmapDay {
  date: string                    // YYYY-MM-DD in IST
  count: number                   // questions answered that day
}

export interface Badge {
  id: string
  name: string
  emoji: string
  earned: boolean
  description: string
}

export interface RecentDelta {
  latest: number                  // most recent overallScore (%)
  baseline: number                // prior overallScore (%)
  value: number                   // latest − baseline
}

export interface StatsAttempt {
  createdAt: string               // ISO timestamp from DB
  overallScore: number            // 0–100
  totalCount: number              // questions in that attempt
  correctCount: number
  subjectId: string
}

export interface DerivedStats {
  streak: StreakStats
  heatmap: HeatmapDay[]
  totals: {
    testsTaken: number
    questionsAnswered: number
    bestScore: number | null
  }
  recentDelta: RecentDelta | null
  badges: Badge[]
}

// ── helpers ─────────────────────────────────────────────────────────────

const IST_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** YYYY-MM-DD day-key in IST for any ISO timestamp. */
export function toDayKey(iso: string | Date): string {
  return IST_FMT.format(typeof iso === 'string' ? new Date(iso) : iso)
}

/** Step a YYYY-MM-DD day-key one day backwards. */
function prevDay(ymd: string): string {
  // Parse in UTC so DST doesn't drift the math; we only care about calendar days.
  const d = new Date(ymd + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Step forward — used by computeHeatmap. */
function nextDay(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ── streak ──────────────────────────────────────────────────────────────

/**
 * Current streak: count of consecutive days ending today (or yesterday if no
 * activity today yet — students aren't penalised for not having practised today
 * before bedtime). Returns 0 once the gap is ≥ 2 days.
 *
 * Longest streak: maximum consecutive-day run ever observed.
 */
export function computeStreak(isoTimestamps: string[]): StreakStats {
  if (isoTimestamps.length === 0) {
    return { current: 0, longest: 0, lastActiveDate: null }
  }

  const days = new Set(isoTimestamps.map(toDayKey))
  const sorted = Array.from(days).sort()
  const lastActive = sorted[sorted.length - 1]

  // Longest streak
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    if (prevDay(sorted[i]) === sorted[i - 1]) {
      run++
    } else {
      run = 1
    }
    if (run > longest) longest = run
  }

  // Current streak — anchor on today, fall back to yesterday
  const today = toDayKey(new Date())
  const yesterday = prevDay(today)

  let cursor: string
  if (days.has(today)) cursor = today
  else if (days.has(yesterday)) cursor = yesterday
  else return { current: 0, longest, lastActiveDate: lastActive }

  let current = 0
  while (days.has(cursor)) {
    current++
    cursor = prevDay(cursor)
  }

  return { current, longest, lastActiveDate: lastActive }
}

// ── heatmap ─────────────────────────────────────────────────────────────

/**
 * Aggregates total questions-answered per day for the last `days` days
 * (default 84 = 12 weeks). Empty days are included with count 0 so the
 * caller can render a complete grid.
 */
export function computeHeatmap(
  attempts: { createdAt: string; totalCount: number }[],
  days = 84,
): HeatmapDay[] {
  const counts = new Map<string, number>()
  for (const a of attempts) {
    const key = toDayKey(a.createdAt)
    counts.set(key, (counts.get(key) ?? 0) + a.totalCount)
  }

  const today = toDayKey(new Date())
  const out: HeatmapDay[] = []
  // Walk backwards `days - 1` steps to find the earliest day-key, then forward.
  let earliest = today
  for (let i = 0; i < days - 1; i++) earliest = prevDay(earliest)

  let cursor = earliest
  for (let i = 0; i < days; i++) {
    out.push({ date: cursor, count: counts.get(cursor) ?? 0 })
    cursor = nextDay(cursor)
  }
  return out
}

// ── badges ──────────────────────────────────────────────────────────────

export function computeBadges(args: {
  testsTaken: number
  questionsAnswered: number
  ownsBundle: boolean
  longestStreak: number
  bestScore: number | null
}): Badge[] {
  const { testsTaken, questionsAnswered, ownsBundle, longestStreak, bestScore } = args
  const best = bestScore ?? 0
  return [
    { id: 'first-test',    emoji: '🎯', name: 'First test',     earned: testsTaken >= 1,         description: 'Take your first readiness assessment.' },
    { id: 'q-100',         emoji: '💯', name: '100 questions',  earned: questionsAnswered >= 100, description: 'Answer 100 questions across attempts.' },
    { id: 'q-500',         emoji: '📚', name: '500 questions',  earned: questionsAnswered >= 500, description: 'Answer 500 questions across attempts.' },
    { id: 'streak-7',      emoji: '🔥', name: '7-day streak',   earned: longestStreak >= 7,       description: 'Practise on 7 consecutive days.' },
    { id: 'streak-30',     emoji: '🚀', name: '30-day streak',  earned: longestStreak >= 30,      description: 'Practise on 30 consecutive days.' },
    { id: 'bundle-owner',  emoji: '🏆', name: 'Bundle owner',   earned: ownsBundle,               description: 'Unlock the CA Finals bundle.' },
    { id: 'high-scorer',   emoji: '🥇', name: 'High scorer',    earned: best >= 80,               description: 'Score 80% or higher on any assessment.' },
    { id: 'perfect-score', emoji: '👑', name: 'Perfect score',  earned: best >= 100,              description: 'Score 100% on a single assessment.' },
  ]
}

// ── delta ───────────────────────────────────────────────────────────────

/**
 * Compares the most recent attempt to the one before it (most-recent-first
 * input). Returns null if there's only one attempt or none.
 */
export function computeRecentDelta(orderedScoresDescending: number[]): RecentDelta | null {
  if (orderedScoresDescending.length < 2) return null
  const latest = orderedScoresDescending[0]
  const baseline = orderedScoresDescending[1]
  return { latest, baseline, value: Math.round(latest - baseline) }
}

// ── top-level composer ──────────────────────────────────────────────────

export function deriveStats(args: {
  attempts: StatsAttempt[]   // most-recent-first
  ownsBundle: boolean
}): DerivedStats {
  const { attempts, ownsBundle } = args

  const isoTimestamps = attempts.map(a => a.createdAt)
  const streak = computeStreak(isoTimestamps)
  const heatmap = computeHeatmap(attempts, 84)

  const testsTaken = attempts.length
  const questionsAnswered = attempts.reduce((sum, a) => sum + a.totalCount, 0)
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.overallScore)) : null

  const recentDelta = computeRecentDelta(attempts.map(a => a.overallScore))

  const badges = computeBadges({
    testsTaken,
    questionsAnswered,
    ownsBundle,
    longestStreak: streak.longest,
    bestScore,
  })

  return {
    streak,
    heatmap,
    totals: { testsTaken, questionsAnswered, bestScore },
    recentDelta,
    badges,
  }
}
