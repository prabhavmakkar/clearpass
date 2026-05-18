import { AppNav } from '@/components/AppNav'
import { ProfileCard } from '@/components/profile/ProfileCard'

export default function ProfilePage() {
  return (
    <main className="min-h-screen">
      <AppNav label="Profile" />
      <ProfileCard />
    </main>
  )
}
