import { AssessmentResults } from '@/components/assessment/AssessmentResults'

export default function AssessmentResultsPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <a href="/" className="text-base font-black">ClearPass</a>
          <span className="text-xs text-gray-500">Results</span>
        </div>
      </nav>
      <AssessmentResults />
    </main>
  )
}
