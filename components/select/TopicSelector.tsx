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

type ExamLevel = 'inter' | 'finals'

function getExamLevel(subjectId: string): ExamLevel {
  if (subjectId.startsWith('ca-inter')) return 'inter'
  return 'finals'
}

export function TopicSelector({ subjects, sections, chapters, questionCounts, freeChapterIds, purchasedChapterIds }: Props) {
  const router = useRouter()
  const [examLevel, setExamLevel] = useState<ExamLevel>(() => {
    const hasInter = subjects.some(s => getExamLevel(s.id) === 'inter')
    return hasInter ? 'inter' : 'finals'
  })
  const [openSubject, setOpenSubject] = useState<string | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [unlockingChapter, setUnlockingChapter] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountPercent?: number; finalAmount?: number; error?: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const freeSet = useMemo(() => new Set(freeChapterIds), [freeChapterIds])
  const purchasedSet = useMemo(() => new Set(purchasedChapterIds), [purchasedChapterIds])

  const filteredSubjects = useMemo(
    () => subjects.filter(s => getExamLevel(s.id) === examLevel),
    [subjects, examLevel]
  )

  const subjectStats = useMemo(() => {
    const stats: Record<string, { totalQuestions: number; chaptersWithContent: number; totalChapters: number; allFree: boolean }> = {}
    for (const subject of subjects) {
      const subChapters = chapters.filter(c => c.subjectId === subject.id)
      const withContent = subChapters.filter(c => (questionCounts[c.id] ?? 0) > 0)
      const totalQ = subChapters.reduce((sum, c) => sum + (questionCounts[c.id] ?? 0), 0)
      const allFree = subChapters.length > 0 && subChapters.every(c => freeSet.has(c.id))
      stats[subject.id] = { totalQuestions: totalQ, chaptersWithContent: withContent.length, totalChapters: subChapters.length, allFree }
    }
    return stats
  }, [subjects, chapters, questionCounts, freeSet])

  function isChapterAccessible(chId: string): boolean {
    return freeSet.has(chId) || purchasedSet.has(chId)
  }

  function isPurchasable(chId: string): boolean {
    return !freeSet.has(chId) && !purchasedSet.has(chId) && (questionCounts[chId] ?? 0) > 0
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

  function selectAllInSubject(subjectId: string) {
    const subChapters = chapters.filter(c => c.subjectId === subjectId)
    setSelectedChapters(prev => {
      const next = new Set(prev)
      for (const ch of subChapters) {
        if ((questionCounts[ch.id] ?? 0) > 0 && isChapterAccessible(ch.id)) {
          next.add(ch.id)
        }
      }
      return next
    })
  }

  function deselectAllInSubject(subjectId: string) {
    const subChapters = chapters.filter(c => c.subjectId === subjectId)
    setSelectedChapters(prev => {
      const next = new Set(prev)
      for (const ch of subChapters) next.delete(ch.id)
      return next
    })
  }

  function goToAssessment() {
    const chapterIds = [...selectedChapters]
    if (chapterIds.length === 0) return
    const subjectId = chapters.find(c => chapterIds.includes(c.id))?.subjectId ?? ''
    const sectionIds = [...new Set(chapters.filter(c => chapterIds.includes(c.id)).map(c => c.sectionId))]
    const params = new URLSearchParams({
      subject: subjectId,
      sections: sectionIds.join(','),
      chapters: chapterIds.join(','),
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

  const modalSubject = subjects.find(s => s.id === openSubject)
  const modalSections = openSubject ? sections.filter(s => s.subjectId === openSubject) : []
  const modalChapters = openSubject ? chapters.filter(c => c.subjectId === openSubject) : []
  const selectedInModal = modalChapters.filter(c => selectedChapters.has(c.id)).length
  const allAccessibleInModal = modalChapters.filter(c => (questionCounts[c.id] ?? 0) > 0 && isChapterAccessible(c.id))
  const allSelected = allAccessibleInModal.length > 0 && allAccessibleInModal.every(c => selectedChapters.has(c.id))

  const hasSelection = selectedChapters.size > 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-2 text-2xl font-black sm:text-3xl">Choose Your Exam</h1>
      <p className="mb-6 text-sm text-gray-500">Select your exam level, then pick a subject to explore chapters.</p>

      {/* Exam Level Tabs */}
      <div className="mb-8 flex rounded-xl border border-gray-200 p-1">
        <button
          onClick={() => setExamLevel('inter')}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
            examLevel === 'inter'
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          CA Intermediate
        </button>
        <button
          onClick={() => setExamLevel('finals')}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
            examLevel === 'finals'
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          CA Finals
        </button>
      </div>

      {/* Subject Cards */}
      {filteredSubjects.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">No subjects available for this exam level yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSubjects.map(subject => {
            const stats = subjectStats[subject.id]
            return (
              <button
                key={subject.id}
                onClick={() => setOpenSubject(subject.id)}
                className="group w-full rounded-xl border border-gray-200 p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-black">
                      {subject.name.replace(/^CA (Intermediate|Final) — /, '')}
                    </h3>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {stats.totalQuestions} questions · {stats.chaptersWithContent}/{stats.totalChapters} chapters active
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {stats.allFree && (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">Free</span>
                    )}
                    <svg className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Floating assessment button */}
      {hasSelection && !openSubject && (
        <div className="fixed bottom-6 left-4 right-4 z-40 mx-auto max-w-2xl sm:left-auto sm:right-auto sm:w-full sm:px-6">
          <button
            onClick={goToAssessment}
            className="w-full rounded-xl bg-black px-8 py-4 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-80"
          >
            Take Readiness Assessment ({selectedChapters.size} chapter{selectedChapters.size !== 1 ? 's' : ''}) →
          </button>
        </div>
      )}

      {/* Chapter Modal */}
      {openSubject && modalSubject && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpenSubject(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black">{modalSubject.name.replace(/^CA (Intermediate|Final) — /, '')}</h2>
                <p className="mt-0.5 text-xs text-gray-500">{modalChapters.length} chapters</p>
              </div>
              <button
                onClick={() => setOpenSubject(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Coupon Banner */}
            <div className="border-b border-gray-100 bg-amber-50/50 px-5 py-3">
              <p className="text-xs text-amber-800">
                Unlock paid chapters for <span className="line-through">&#8377;999</span>{' '}
                <span className="font-bold text-green-700">&#8377;299</span> with{' '}
                <span className="rounded bg-black px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">STUDY70</span>
              </p>
            </div>

            {/* Select All / Deselect */}
            {allAccessibleInModal.length > 0 && (
              <div className="border-b border-gray-100 px-5 py-2.5">
                <button
                  onClick={() => allSelected ? deselectAllInSubject(openSubject) : selectAllInSubject(openSubject)}
                  className="text-xs font-medium text-gray-500 hover:text-black"
                >
                  {allSelected ? 'Deselect all' : 'Select all available'}
                </button>
              </div>
            )}

            {/* Chapter List */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="space-y-1">
                {modalSections.map(section => {
                  const sectionChapters = modalChapters.filter(c => c.sectionId === section.id)
                  return (
                    <div key={section.id}>
                      {modalSections.length > 1 && (
                        <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 first:mt-0">
                          {section.name}
                        </p>
                      )}
                      {sectionChapters.map(ch => {
                        const chHasQuestions = (questionCounts[ch.id] ?? 0) > 0
                        const accessible = isChapterAccessible(ch.id)
                        const purchasable = isPurchasable(ch.id)

                        if (!chHasQuestions) {
                          return (
                            <div key={ch.id} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                              <span className="text-sm text-gray-300">{ch.name}</span>
                              <span className="text-[10px] text-gray-300">Coming soon</span>
                            </div>
                          )
                        }

                        if (purchasable) {
                          return (
                            <div key={ch.id} className="rounded-lg px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                  <span className="text-sm text-gray-500">{ch.name}</span>
                                </div>
                                <button
                                  onClick={() => setUnlockingChapter(unlockingChapter === ch.id ? null : ch.id)}
                                  className="shrink-0 rounded-md bg-black px-3 py-1 text-xs font-semibold text-white hover:opacity-80"
                                >
                                  Unlock
                                </button>
                              </div>

                              {unlockingChapter === ch.id && (
                                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                  <p className="mb-2 text-xs text-gray-500">
                                    Price: <span className="line-through text-gray-400">&#8377;999</span>{' '}
                                    {couponResult?.valid ? (
                                      <span className="font-bold text-green-700">&#8377;{(couponResult.finalAmount! / 100).toFixed(0)}</span>
                                    ) : (
                                      <span className="font-bold">&#8377;999</span>
                                    )}
                                  </p>
                                  <div className="mb-2 flex gap-2">
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
                                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
                                    >
                                      {couponLoading ? '...' : 'Apply'}
                                    </button>
                                  </div>
                                  {couponResult && (
                                    <p className={`mb-2 text-xs ${couponResult.valid ? 'text-green-700' : 'text-red-600'}`}>
                                      {couponResult.valid ? `${couponResult.discountPercent}% discount applied!` : couponResult.error}
                                    </p>
                                  )}
                                  <button
                                    onClick={() => handleUnlock(ch.id)}
                                    disabled={paymentLoading}
                                    className="w-full rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
                                  >
                                    {paymentLoading ? 'Processing...' : `Pay ₹${couponResult?.valid ? (couponResult.finalAmount! / 100).toFixed(0) : '999'}`}
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        }

                        return (
                          <div key={ch.id} className="flex flex-wrap items-center justify-between gap-1 rounded-lg px-3 py-2.5 hover:bg-gray-50">
                            <label className="flex min-w-0 items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedChapters.has(ch.id)}
                                onChange={() => toggleChapter(ch.id)}
                                className="h-4 w-4 shrink-0 rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">{ch.name}</span>
                              {freeSet.has(ch.id) && (
                                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Free</span>
                              )}
                              {purchasedSet.has(ch.id) && (
                                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">Unlocked</span>
                              )}
                            </label>
                            <button
                              onClick={() => goToPractice(ch.id)}
                              className="shrink-0 text-xs text-gray-400 underline underline-offset-2 hover:text-black"
                            >
                              Practice →
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-100 px-5 py-4">
              {selectedInModal > 0 ? (
                <button
                  onClick={goToAssessment}
                  className="w-full rounded-xl bg-black px-6 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-80"
                >
                  Take Assessment ({selectedInModal} chapter{selectedInModal !== 1 ? 's' : ''}) →
                </button>
              ) : (
                <p className="text-center text-xs text-gray-400">Select chapters above to take an assessment</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
