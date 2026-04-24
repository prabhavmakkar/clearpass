import { AppNav } from '@/components/AppNav'
import { ProfileCard } from '@/components/profile/ProfileCard'

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-white">
      <AppNav label="Profile" />
      <ProfileCard />
    </main>
  )
}
