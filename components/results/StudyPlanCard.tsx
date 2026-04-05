import type { StudyPlan } from '@/lib/types'

interface Props { studyPlan: StudyPlan }

export function StudyPlanCard({ studyPlan }: Props) {
  return (
    <div className="mb-12">
      <h2 className="mb-2 text-lg font-black">7-Day Study Plan</h2>
      {studyPlan.weekSummary && (
        <p className="mb-4 text-sm text-gray-500">{studyPlan.weekSummary}</p>
      )}
      <div className="space-y-3">
        {studyPlan.days.map(day => (
          <div key={day.day} className="rounded-xl border border-gray-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">Day {day.day} — {day.focus}</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                {day.estimatedHours}h
              </span>
            </div>
            <ul className="space-y-1">
              {day.tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                  {task}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
