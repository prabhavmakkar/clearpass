import type { AdaptiveState, Question } from './types'

const STEPS = { easy: 0.3, medium: 0.5, hard: 0.8 } as const
const MIN_QUESTIONS = 10
const STREAK_STOP = 4

export function updateTheta(
  state: AdaptiveState,
  difficulty: Question['difficulty'],
  wasCorrect: boolean
): AdaptiveState {
  const delta = STEPS[difficulty] * (wasCorrect ? 1 : -1)
  return {
    ...state,
    theta: Math.max(-2, Math.min(2, state.theta + delta)),
    consecutiveCorrect: wasCorrect ? state.consecutiveCorrect + 1 : 0,
    consecutiveWrong: wasCorrect ? 0 : state.consecutiveWrong + 1,
    questionsAnswered: state.questionsAnswered + 1,
  }
}

// Generic so it works with both full `Question` and client-safe `ClientQuestion`
// (PracticeShell passes ClientQuestion — no correctIndex is needed here)
export function selectNext<Q extends { id: string; difficulty: Question['difficulty'] }>(
  pool: Q[],
  state: AdaptiveState
): Q | null {
  const remaining = pool.filter(q => !state.answeredIds.includes(q.id))
  if (remaining.length === 0) return null

  const target: Question['difficulty'] =
    state.theta > 0.5 ? 'hard' : state.theta < -0.5 ? 'easy' : 'medium'

  const order: Question['difficulty'][] =
    target === 'hard' ? ['hard', 'medium', 'easy']
    : target === 'easy' ? ['easy', 'medium', 'hard']
    : ['medium', 'easy', 'hard']

  for (const diff of order) {
    const candidates = remaining.filter(q => q.difficulty === diff)
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)]
    }
  }
  return remaining[0]
}

export function shouldStop(state: AdaptiveState, poolSize: number): boolean {
  if (state.questionsAnswered >= poolSize) return true
  if (state.questionsAnswered < MIN_QUESTIONS) return false
  if (state.consecutiveCorrect >= STREAK_STOP && state.theta >= 0.8) return true
  if (state.consecutiveWrong >= STREAK_STOP && state.theta <= -0.8) return true
  return false
}
