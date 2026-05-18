import type { StudyPlan } from '@/lib/types'

interface Props { studyPlan: StudyPlan }

export function StudyPlanCard({ studyPlan }: Props) {
  const totalHours = studyPlan.days.reduce((sum, d) => sum + d.estimatedHours, 0)
  const avg = (totalHours / studyPlan.days.length).toFixed(1)

  return (
    <div className="card p-6 md:p-7 mb-6">
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {studyPlan.days.map(day => (
          <div
            key={day.day}
            className="rounded-xl p-4 border"
            style={{ borderColor: 'var(--color-line)', background: 'var(--color-paper)' }}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Day {day.day}
            </div>
            <div className="font-semibold text-sm mt-1 leading-snug">{day.focus}</div>
            <ul className="space-y-1 mt-3">
              {day.tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-[var(--color-ink-soft)] leading-snug">
                  <span
                    className="mt-1 h-1 w-1 shrink-0 rounded-full"
                    style={{ background: 'var(--color-accent)' }}
                  />
                  {task}
                </li>
              ))}
            </ul>
            <div className="font-mono text-[11px] text-[var(--color-muted)] mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-line-soft)' }}>
              {day.estimatedHours}h
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
