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
  ownsBundle: boolean
}

type ExamLevel = 'inter' | 'finals'

function getExamLevel(subjectId: string): ExamLevel {
  if (subjectId.startsWith('ca-inter')) return 'inter'
  return 'finals'
}

const COMING_SOON_CARDS: Array<{ id: string; shortName: string; examLevel: ExamLevel }> = [
  { id: 'ca-final-dt-coming-soon', shortName: 'Direct Tax', examLevel: 'finals' },
]

export function TopicSelector({ subjects, sections, chapters, questionCounts, freeChapterIds, ownsBundle }: Props) {
  const router = useRouter()
  const [examLevel, setExamLevel] = useState<ExamLevel>('finals')
  const [openSubject, setOpenSubject] = useState<string | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [showBundleModal, setShowBundleModal] = useState(false)
  const [showComingSoon, setShowComingSoon] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountPercent?: number; finalAmount?: number; error?: string } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)

  const freeSet = useMemo(() => new Set(freeChapterIds), [freeChapterIds])

  const filteredSubjects = useMemo(
    () => subjects.filter(s => getExamLevel(s.id) === examLevel),
    [subjects, examLevel]
  )

  const filteredComingSoon = useMemo(
    () => COMING_SOON_CARDS.filter(c => c.examLevel === examLevel),
    [examLevel]
  )

  function isSubjectAccessible(subjectId: string): boolean {
    if (getExamLevel(subjectId) === 'inter') return true
    return ownsBundle
  }

  function isChapterAccessible(chId: string, subjectId: string): boolean {
    return freeSet.has(chId) || isSubjectAccessible(subjectId)
  }

  function toggleChapter(id: string, subjectId: string) {
    if ((questionCounts[id] ?? 0) === 0) return
    if (!isChapterAccessible(id, subjectId)) return
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
        if ((questionCounts[ch.id] ?? 0) > 0 && isChapterAccessible(ch.id, subjectId)) {
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

  async function handleUnlockBundle() {
    setPaymentLoading(true)
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponResult?.valid ? couponCode.trim() : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to create order')
        return
      }

      const { orderId, amount, purchaseId, bundleName } = await res.json()

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: 'INR',
        name: 'ClearPass',
        description: bundleName ?? 'CA Finals Bundle',
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
            setShowBundleModal(false)
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
  const allAccessibleInModal = openSubject
    ? modalChapters.filter(c => (questionCounts[c.id] ?? 0) > 0 && isChapterAccessible(c.id, openSubject))
    : []
  const allSelected = allAccessibleInModal.length > 0 && allAccessibleInModal.every(c => selectedChapters.has(c.id))
  const modalSubjectAccessible = openSubject ? isSubjectAccessible(openSubject) : false

  const hasSelection = selectedChapters.size > 0
  const showBundleBanner = examLevel === 'finals' && !ownsBundle

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-2 text-2xl font-black sm:text-3xl">Choose Your Exam</h1>
      <p className="mb-6 text-sm text-gray-500">Select your exam level, then pick a subject to explore chapters.</p>

      <div className="mb-6 flex rounded-xl border border-gray-200 p-1">
        <button
          onClick={() => setExamLevel('finals')}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
            examLevel === 'finals' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          CA Finals
        </button>
        <button
          onClick={() => setExamLevel('inter')}
          className={`flex-1 rounded-lg px-4 py-3 text-sm font-bold transition-all ${
            examLevel === 'inter' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          CA Intermediate
        </button>
      </div>

      {showBundleBanner && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-gray-900 bg-gray-900 px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="text-sm font-bold">Unlock all CA Finals subjects</p>
            <p className="mt-0.5 text-xs text-gray-300">AFM, FR, Audit & IDT — full access for ₹299</p>
          </div>
          <button
            onClick={() => setShowBundleModal(true)}
            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100"
          >
            Unlock ₹299
          </button>
        </div>
      )}

      {filteredSubjects.length === 0 && filteredComingSoon.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">No subjects available for this exam level yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSubjects.map(subject => {
            const owned = isSubjectAccessible(subject.id)
            const isInter = getExamLevel(subject.id) === 'inter'
            return (
              <button
                key={subject.id}
                onClick={() => setOpenSubject(subject.id)}
                className="group w-full rounded-xl border border-gray-200 p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-black">
                    {subject.name.replace(/^CA (Intermediate|Final) — /, '')}
                  </h3>
                  <div className="flex shrink-0 items-center gap-2">
                    {owned && !isInter && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Unlocked</span>
                    )}
                    {isInter && (
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
          {filteredComingSoon.map(card => (
            <button
              key={card.id}
              onClick={() => setShowComingSoon(card.shortName)}
              className="group w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-left shadow-sm transition-all hover:border-gray-400"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-gray-500">{card.shortName}</h3>
                <span className="rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-semibold text-gray-600">Coming soon</span>
              </div>
            </button>
          ))}
        </div>
      )}

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

      {showComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowComingSoon(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-black text-gray-900">{showComingSoon} is coming soon</h2>
            <p className="mb-5 text-sm text-gray-500">We&apos;re putting the finishing touches on this subject. Check back shortly.</p>
            <button
              onClick={() => setShowComingSoon(null)}
              className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:opacity-80"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {showBundleModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setShowBundleModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()} className="relative w-full rounded-t-2xl bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <h2 className="text-lg font-black text-gray-900">Unlock all CA Finals subjects</h2>
            <p className="mt-1 text-sm text-gray-500">AFM, FR, Audit & IDT — every chapter, every question.</p>
            <p className="mt-4 mb-3 text-2xl font-black text-gray-900">
              ₹{couponResult?.valid ? (couponResult.finalAmount! / 100).toFixed(2) : '299'}
            </p>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
                placeholder="Coupon code (optional)"
                className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
              <button
                onClick={validateCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium hover:bg-gray-100 disabled:opacity-50"
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
              onClick={handleUnlockBundle}
              disabled={paymentLoading}
              className="mt-2 w-full rounded-lg bg-black px-4 py-3 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
            >
              {paymentLoading ? 'Processing...' : `Pay ₹${couponResult?.valid ? (couponResult.finalAmount! / 100).toFixed(2) : '299'}`}
            </button>
            <button
              onClick={() => setShowBundleModal(false)}
              className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {openSubject && modalSubject && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpenSubject(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-black">{modalSubject.name.replace(/^CA (Intermediate|Final) — /, '')}</h2>
              <button
                onClick={() => setOpenSubject(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!modalSubjectAccessible && (
              <div className="border-b border-gray-100 bg-gray-900 px-5 py-3 text-white">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs">Unlock all CA Finals for ₹299</p>
                  <button
                    onClick={() => setShowBundleModal(true)}
                    className="shrink-0 rounded-md bg-white px-3 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-100"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            )}

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
                        const accessible = isChapterAccessible(ch.id, openSubject)
                        const isFree = freeSet.has(ch.id)

                        if (!chHasQuestions) {
                          return (
                            <div key={ch.id} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                              <span className="text-sm text-gray-300">{ch.name}</span>
                              <span className="text-[10px] text-gray-300">Coming soon</span>
                            </div>
                          )
                        }

                        if (!accessible) {
                          return (
                            <div key={ch.id} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="text-sm text-gray-400">{ch.name}</span>
                              </div>
                              <span className="text-[10px] text-gray-400">Locked</span>
                            </div>
                          )
                        }

                        return (
                          <div key={ch.id} className="flex flex-wrap items-center justify-between gap-1 rounded-lg px-3 py-2.5 hover:bg-gray-50">
                            <label className="flex min-w-0 items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedChapters.has(ch.id)}
                                onChange={() => toggleChapter(ch.id, openSubject)}
                                className="h-4 w-4 shrink-0 rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">{ch.name}</span>
                              {isFree && (
                                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Free preview</span>
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
