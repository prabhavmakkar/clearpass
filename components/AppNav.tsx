'use client'

import { AuthButton } from './AuthButton'

export function AppNav({ label }: { label?: string }) {
  return (
    <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <a href="/" className="text-base font-black">ClearPass</a>
          {label && <span className="text-xs text-gray-500">{label}</span>}
        </div>
        <div className="flex items-center gap-3">
          <a href="/select" className="text-xs font-medium text-gray-500 hover:text-gray-900">Tests</a>
          <a href="/history" className="text-xs font-medium text-gray-500 hover:text-gray-900">History</a>
          <AuthButton />
        </div>
      </div>
    </nav>
  )
}
