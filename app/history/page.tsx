import { AppNav } from '@/components/AppNav'
import { HistoryList } from '@/components/history/HistoryList'

export default function HistoryPage() {
  return (
    <main className="min-h-screen">
      <AppNav label="History" />
      <HistoryList />
    </main>
  )
}
