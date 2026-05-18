import { Suspense } from 'react'
import { PracticeShell } from '@/components/practice/PracticeShell'
import { AppNav } from '@/components/AppNav'

export default function PracticePage() {
  return (
    <main className="min-h-screen">
      <AppNav label="Adaptive Practice" />
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-ink)]" /></div>}>
        <PracticeShell />
      </Suspense>
    </main>
  )
}
