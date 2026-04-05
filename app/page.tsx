import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6">
      <h1 className="text-4xl font-black tracking-tight">ClearPass</h1>
      <p className="text-gray-500">CA Prep, Finally Done Right.</p>
      <Link
        href="/test"
        className="rounded-xl bg-black px-8 py-3.5 text-sm font-bold text-white hover:opacity-80"
      >
        Take Readiness Test →
      </Link>
    </main>
  )
}
