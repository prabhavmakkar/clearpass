import { Suspense } from 'react'
import { PracticeShell } from '@/components/practice/PracticeShell'
import { AppNav } from '@/components/AppNav'

export default function PracticePage() {
  return (
    <main className="min-h-screen bg-white">
      <AppNav label="Adaptive Practice" />
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" /></div>}>
        <PracticeShell />
      </Suspense>
    </main>
  )
}
