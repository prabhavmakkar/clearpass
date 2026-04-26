'use client'
import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Subject, Section, Chapter } from '@/lib/types'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

interface Props {
  subjects: Subject[]
  sections: Section[]
  chapters: Chapter[]
  questionCounts: Record<string, number>
  freeChapterIds: string[]
  purchasedChapterIds: string[]
}

export function TopicSelector({ subjects, sections, chapters, questionCounts, freeChapterIds, purchasedChapterIds }: Props) {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id ?? '')
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [unlockingChapter, setUnlockingChapter] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountPercent?: number; finalAmount?: number; error?: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const filteredSections = sections.filter(s => s.subjectId === selectedSubject)

  const freeSet = useMemo(() => new Set(freeChapterIds), [freeChapterIds])
  const purchasedSet = useMemo(() => new Set(purchasedChapterIds), [purchasedChapterIds])

  function isChapterAccessible(chId: string): boolean {
    return freeSet.has(chId) || purchasedSet.has(chId)
  }

  function isPurchasable(chId: string): boolean {
    return !freeSet.has(chId) && !purchasedSet.has(chId) && (questionCounts[chId] ?? 0) > 0
  }

  const sectionHasQuestions = useMemo(() => {
    const result: Record<string, boolean> = {}
    for (const section of sections) {
      const sectionChapters = chapters.filter(c => c.sectionId === section.id)
      result[section.id] = sectionChapters.some(ch => (questionCounts[ch.id] ?? 0) > 0)
    }
    return result
  }, [sections, chapters, questionCounts])

  function toggleSection(id: string) {
    if (!sectionHasQuestions[id]) return
    setSelectedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setSelectedChapters(prevCh => {
          const nextCh = new Set(prevCh)
          chapters.filter(c => c.sectionId === id).forEach(c => nextCh.delete(c.id))
          return nextCh
        })
      } else {
        next.add(id)
        setSelectedChapters(prevCh => {
          const nextCh = new Set(prevCh)
          chapters.filter(c => c.sectionId === id && isChapterAccessible(c.id)).forEach(c => {
            if ((questionCounts[c.id] ?? 0) > 0) nextCh.add(c.id)
          })
          return nextCh
        })
      }
      return next
    })
  }

  function toggleChapter(id: string) {
    if ((questionCounts[id] ?? 0) === 0) return
    if (!isChapterAccessible(id)) return
    setSelectedChapters(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function goToAssessment() {
    const params = new URLSearchParams({
      subject: selectedSubject,
      sections: [...selectedSections].join(','),
      chapters: [...selectedChapters].join(','),
    })
    router.push(`/assessment?${params}`)
  }

  function goToPractice(chapterId: string) {
    router.push(`/practice?chapter=${chapterId}`)
  }

  const validateCoupon = useCallback(async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await fetch('/api/payments/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      })
      const data = await res.json()
      setCouponResult(data)
    } catch {
      setCouponResult({ valid: false, error: 'Failed to validate' })
    } finally {
      setCouponLoading(false)
    }
  }, [couponCode])

  async function handleUnlock(chapterId: string) {
    setPaymentLoading(true)
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          couponCode: couponResult?.valid ? couponCode.trim() : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to create order')
        return
      }

      const { orderId, amount, purchaseId } = await res.json()

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: 'INR',
        name: 'ClearPass',
        description: 'Chapter Unlock',
        order_id: orderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              purchaseId,
            }),
          })
          if (verifyRes.ok) {
            setUnlockingChapter(null)
            setCouponCode('')
            setCouponResult(null)
            router.refresh()
          } else {
            alert('Payment verification failed. Contact support if amount was deducted.')
          }
        },
        theme: { color: '#000000' },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const hasSelection = selectedChapters.size > 0

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-black">Choose Your Scope</h1>
      <p className="mb-4 text-sm text-gray-500">Select sections and chapters, then take an assessment or practice.</p>
      <div className="mb-8 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4">
        <p className="text-sm font-semibold text-amber-900">Derivatives &amp; Valuation is free</p>
        <p className="mt-1.5 text-xs text-amber-700">
          Other chapters can be unlocked for <span className="text-gray-400 line-through">&#8377;999</span>{' '}
          <span className="text-lg font-black text-green-700">&#8377;299</span>{' '}
          with code{' '}
          <span className="inline-block rounded-md bg-black px-2.5 py-1 font-mono text-sm font-bold tracking-widest text-white">STUDY70</span>
        </p>
      </div>

      {subjects.length > 1 && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold">Subject</label>
          <select
            value={selectedSubject}
            onChange={e => { setSelectedSubject(e.target.value); setSelectedSections(new Set()); setSelectedChapters(new Set()) }}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm"
          >
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      <div className="mb-8 space-y-4">
        {filteredSections.map(section => {
          const hasQuestions = sectionHasQuestions[section.id]
          const sectionChapters = chapters.filter(c => c.sectionId === section.id)
          const allAccessible = sectionChapters.every(c => (questionCounts[c.id] ?? 0) === 0 || isChapterAccessible(c.id))
          const canSelectSection = hasQuestions && allAccessible

          return (
            <div
              key={section.id}
              className={`rounded-xl border p-4 transition-shadow ${
                hasQuestions
                  ? 'border-gray-200 shadow-md hover:shadow-lg'
                  : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              <label className={`flex items-center gap-3 ${canSelectSection ? 'cursor-pointer' : hasQuestions ? 'cursor-default' : 'cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  checked={selectedSections.has(section.id)}
                  onChange={() => canSelectSection && toggleSection(section.id)}
                  disabled={!canSelectSection}
                  className="h-4 w-4 rounded border-gray-300 disabled:opacity-40"
                />
                <span className={`text-sm font-bold ${!hasQuestions ? 'text-gray-400' : ''}`}>{section.name}</span>
                <span className="ml-auto text-xs text-gray-400">{section.examWeightPercent}% weight</span>
              </label>

              {!hasQuestions && (
                <p className="mt-2 ml-7 text-xs text-gray-400">
                  Coming soon — stay tuned for new chapters.
                </p>
              )}

              {hasQuestions && (
                <div className="mt-3 ml-7 space-y-2">
                  {sectionChapters.map(ch => {
                    const chHasQuestions = (questionCounts[ch.id] ?? 0) > 0
                    const accessible = isChapterAccessible(ch.id)
                    const purchasable = isPurchasable(ch.id)

                    if (!chHasQuestions) {
                      return (
                        <div key={ch.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{ch.name}</span>
                          <span className="text-xs text-gray-300">Coming soon</span>
                        </div>
                      )
                    }

                    if (purchasable) {
                      return (
                        <div key={ch.id}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span className="text-sm text-gray-500">{ch.name}</span>
                            </div>
                            <button
                              onClick={() => setUnlockingChapter(unlockingChapter === ch.id ? null : ch.id)}
                              className="rounded-md bg-black px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-80"
                            >
                              Unlock
                            </button>
                          </div>

                          {unlockingChapter === ch.id && (
                            <div className="mt-3 ml-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                              <p className="mb-1 text-sm font-semibold">Unlock: {ch.name}</p>
                              <p className="mb-3 text-xs text-gray-500">
                                Price: <span className="line-through text-gray-400">&#8377;999</span>{' '}
                                {couponResult?.valid ? (
                                  <span className="font-bold text-green-700">&#8377;{(couponResult.finalAmount! / 100).toFixed(0)}</span>
                                ) : (
                                  <span className="font-bold">&#8377;999</span>
                                )}
                              </p>

                              <div className="mb-3 flex gap-2">
                                <input
                                  type="text"
                                  value={couponCode}
                                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
                                  placeholder="Coupon code"
                                  className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm uppercase placeholder:normal-case placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                                />
                                <button
                                  onClick={validateCoupon}
                                  disabled={couponLoading || !couponCode.trim()}
                                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-100 disabled:opacity-50"
                                >
                                  {couponLoading ? '...' : 'Apply'}
                                </button>
                              </div>

                              {couponResult && (
                                <p className={`mb-3 text-xs ${couponResult.valid ? 'text-green-700' : 'text-red-600'}`}>
                                  {couponResult.valid
                                    ? `${couponResult.discountPercent}% discount applied!`
                                    : couponResult.error}
                                </p>
                              )}

                              <button
                                onClick={() => handleUnlock(ch.id)}
                                disabled={paymentLoading}
                                className="w-full rounded-md bg-black px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                              >
                                {paymentLoading ? 'Processing...' : `Pay ₹${couponResult?.valid ? (couponResult.finalAmount! / 100).toFixed(0) : '999'}`}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div key={ch.id} className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedChapters.has(ch.id)}
                            onChange={() => toggleChapter(ch.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{ch.name}</span>
                          {freeSet.has(ch.id) && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Free</span>
                          )}
                          {purchasedSet.has(ch.id) && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">Unlocked</span>
                          )}
                        </label>
                        <button
                          onClick={() => goToPractice(ch.id)}
                          className="text-xs text-gray-400 underline underline-offset-2 hover:text-black"
                        >
                          Practice →
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasSelection && (
        <button
          onClick={goToAssessment}
          className="w-full rounded-xl bg-black px-8 py-4 text-sm font-bold text-white transition-opacity hover:opacity-80"
        >
          Take Readiness Assessment ({selectedChapters.size} chapter{selectedChapters.size !== 1 ? 's' : ''}) →
        </button>
      )}
    </div>
  )
}
