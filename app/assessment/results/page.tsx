import { AssessmentResults } from '@/components/assessment/AssessmentResults'
import { AppNav } from '@/components/AppNav'

export default function AssessmentResultsPage() {
  return (
    <main className="min-h-screen">
      <AppNav label="Results" />
      <AssessmentResults />
    </main>
  )
}
