import { Suspense } from 'react'
import { AssessmentShell } from '@/components/assessment/AssessmentShell'
import { AppNav } from '@/components/AppNav'

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-white">
      <AppNav label="Readiness Assessment" />
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>}>
        <AssessmentShell />
      </Suspense>
    </main>
  )
}
