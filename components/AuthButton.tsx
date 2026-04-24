'use client'

import { useSession, signOut } from 'next-auth/react'

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />

  if (!session) {
    return (
      <a
        href="/sign-in"
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold transition-colors hover:border-gray-400"
      >
        Sign in
      </a>
    )
  }

  return (
    <a href="/profile" className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 transition-colors hover:border-gray-400">
      {session.user?.image && (
        <img src={session.user.image} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
      )}
      <span className="text-xs font-medium">{session.user?.name?.split(' ')[0]}</span>
    </a>
  )
}
