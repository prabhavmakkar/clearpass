import { AppNav } from '@/components/AppNav'
import { AttemptDetail } from '@/components/history/AttemptDetail'

export default function AttemptPage() {
  return (
    <main className="min-h-screen">
      <AppNav label="Past Attempt" />
      <AttemptDetail />
    </main>
  )
}
