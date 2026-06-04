import type { StudyPlan } from '@/lib/types'

interface Props { studyPlan: StudyPlan }

export function StudyPlanCard({ studyPlan }: Props) {
  const totalHours = studyPlan.days.reduce((sum, d) => sum + d.estimatedHours, 0)
  const avg = (totalHours / studyPlan.days.length).toFixed(1)

  return (
    <div className="card p-5 sm:p-6 md:p-7 mb-6">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="eyebrow mb-2">7-day study plan</p>
          <h2 className="font-display text-2xl md:text-3xl leading-tight">
            Drafted by your AI mentor
          </h2>
          {studyPlan.weekSummary && (
            <p className="mt-2 text-sm text-[var(--color-muted)] max-w-xl">{studyPlan.weekSummary}</p>
          )}
        </div>
        <span className="font-mono text-xs text-[var(--color-muted)]">
          {totalHours}h total · ~{avg}h/day
        </span>
      </div>

      {/* ── Mobile: clean vertical list with dividers ──────────────── */}
      <div className="sm:hidden">
        {studyPlan.days.map((day, i) => (
          <div
            key={day.day}
            className={`py-4 ${i === 0 ? 'pt-1' : 'border-t'}`}
            style={i === 0 ? undefined : { borderColor: 'var(--color-line-soft)' }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
                Day {day.day}
              </span>
              <span className="font-mono text-[11px] text-[var(--color-muted)]">{day.estimatedHours}h</span>
            </div>
            <div className="font-semibold text-[15px] mt-0.5 leading-snug">{day.focus}</div>
            <ul className="space-y-1.5 mt-2.5">
              {day.tasks.map((task, t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
                  <span
                    className="mt-[7px] h-1 w-1 shrink-0 rounded-full"
                    style={{ background: 'var(--color-accent)' }}
                  />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Tablet / desktop: comfortable 2–3-up cards ─────────────── */}
      <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {studyPlan.days.map(day => (
          <div
            key={day.day}
            className="rounded-xl p-4 border"
            style={{ borderColor: 'var(--color-line)', background: 'var(--color-paper)' }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                Day {day.day}
              </span>
              <span className="font-mono text-[11px] text-[var(--color-muted)]">{day.estimatedHours}h</span>
            </div>
            <div className="font-semibold text-sm mt-1 leading-snug">{day.focus}</div>
            <ul className="space-y-1.5 mt-3">
              {day.tasks.map((task, t) => (
                <li key={t} className="flex items-start gap-2 text-[12px] text-[var(--color-ink-soft)] leading-snug">
                  <span
                    className="mt-[6px] h-1 w-1 shrink-0 rounded-full"
                    style={{ background: 'var(--color-accent)' }}
                  />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
