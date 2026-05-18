import { Suspense } from 'react'
import { AssessmentShell } from '@/components/assessment/AssessmentShell'
import { AppNav } from '@/components/AppNav'

export default function AssessmentPage() {
  return (
    <main className="min-h-screen">
      <AppNav label="Readiness Assessment" />
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-ink)]" /></div>}>
        <AssessmentShell />
      </Suspense>
    </main>
  )
}
