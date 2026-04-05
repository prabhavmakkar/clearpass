import { ResultsShell } from '@/components/results/ResultsShell'

export default function ResultsPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="text-base font-black">ClearPass</span>
          <a href="/test" className="text-xs text-gray-500 underline underline-offset-2">New Test</a>
        </div>
      </nav>
      <ResultsShell />
    </main>
  )
}
