import { Suspense } from 'react'
import { AssessmentShell } from '@/components/assessment/AssessmentShell'

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <a href="/" className="text-base font-black">ClearPass</a>
          <span className="text-xs text-gray-500">Readiness Assessment</span>
        </div>
      </nav>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>}>
        <AssessmentShell />
      </Suspense>
    </main>
  )
}
