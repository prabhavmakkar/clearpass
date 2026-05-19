'use client'
import { useEffect, useState } from 'react'
import type { DerivedStats } from '@/lib/derivedStats'

interface UseStatsResult {
  stats: DerivedStats | null
  loading: boolean
  error: string | null
}

/**
 * Client hook that fetches /api/me/stats once per mount. Components that
 * use this should gracefully handle `stats === null` (initial / loading /
 * signed-out states all collapse into null).
 */
export function useStats(): UseStatsResult {
  const [stats, setStats] = useState<DerivedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me/stats')
      .then(async r => {
        if (r.status === 401) return null
        if (!r.ok) throw new Error(`stats request failed (${r.status})`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        setStats(data?.stats ?? null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { stats, loading, error }
}
