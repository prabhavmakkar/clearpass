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
    <div className="flex items-center gap-3">
      {session.user?.image && (
        <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
      )}
      <span className="hidden text-sm font-medium sm:inline">{session.user?.name?.split(' ')[0]}</span>
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-gray-400"
      >
        Sign out
      </button>
    </div>
  )
}
