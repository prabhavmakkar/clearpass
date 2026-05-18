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
        theme: { color: '#0F1B3D' },
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="eyebrow mb-2">Choose your exam</p>
      <h1 className="font-display text-4xl md:text-5xl mb-3">Pick what to practice.</h1>
      <p className="mb-7 text-sm text-[var(--color-muted)]">
        Tick the chapters you&apos;re worried about. We&apos;ll build the 20-question diagnostic from them.
      </p>

      {/* Exam-level toggle */}
      <div
        className="mb-6 flex rounded-full border p-1 bg-paper w-fit"
        style={{ borderColor: 'var(--color-line)' }}
      >
        <button
          onClick={() => setExamLevel('finals')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
            examLevel === 'finals' ? 'text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
          style={examLevel === 'finals' ? { background: 'var(--color-ink)' } : undefined}
        >
          CA Finals
        </button>
        <button
          onClick={() => setExamLevel('inter')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
            examLevel === 'inter' ? 'text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
          style={examLevel === 'inter' ? { background: 'var(--color-ink)' } : undefined}
        >
          CA Intermediate
        </button>
      </div>

      {/* Bundle banner */}
      {showBundleBanner && (
        <div
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-white relative overflow-hidden"
          style={{ background: 'var(--color-navy)' }}
        >
          <div
            className="absolute -top-16 -right-12 h-40 w-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(217,80,30,0.35), transparent 65%)' }}
          />
          <div className="min-w-0 relative">
            <p className="text-sm font-bold">Unlock all CA Finals subjects</p>
            <p className="mt-0.5 text-xs opacity-75">AFM, FR, Audit &amp; IDT — full access for ₹299</p>
          </div>
          <button
            onClick={() => setShowBundleModal(true)}
            className="relative shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-accent)' }}
          >
            Unlock ₹299
          </button>
        </div>
      )}

      {/* Subject grid */}
      {filteredSubjects.length === 0 && filteredComingSoon.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-[var(--color-muted)]">No subjects available for this exam level yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filteredSubjects.map(subject => {
            const owned = isSubjectAccessible(subject.id)
            const isInter = getExamLevel(subject.id) === 'inter'
            const shortName = subject.name.replace(/^CA (Intermediate|Final) — /, '')
            return (
              <button
                key={subject.id}
                onClick={() => setOpenSubject(subject.id)}
                className="group card p-5 text-left transition-all hover:border-[#C7C0AF] hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-display text-2xl leading-tight">{shortName}</h3>
                  <svg
                    className="h-5 w-5 text-[var(--color-muted)] transition-transform group-hover:translate-x-0.5 mt-1.5"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  {owned && !isInter && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: 'var(--color-success-soft)', color: '#0E5A3D' }}
                    >
                      Unlocked
                    </span>
                  )}
                  {isInter && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: 'var(--color-success-soft)', color: '#0E5A3D' }}
                    >
                      Free
                    </span>
                  )}
                  {!owned && !isInter && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: 'var(--color-warning-soft)', color: '#7A5A0F' }}
                    >
                      Locked · free preview inside
                    </span>
                  )}
                </div>
              </button>
            )
          })}
          {filteredComingSoon.map(card => (
            <button
              key={card.id}
              onClick={() => setShowComingSoon(card.shortName)}
              className="group card-flat p-5 text-left border-dashed transition-all hover:border-[#C7C0AF]"
              style={{ background: 'var(--color-bg)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-display text-2xl leading-tight text-[var(--color-muted)]">{card.shortName}</h3>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                style={{ background: 'var(--color-line-soft)', color: 'var(--color-muted)' }}
              >
                Coming soon
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Sticky action bar */}
      {hasSelection && !openSubject && (
        <div className="fixed bottom-6 left-4 right-4 z-40 mx-auto max-w-2xl sm:left-auto sm:right-auto sm:w-full sm:px-6">
          <button
            onClick={goToAssessment}
            className="w-full rounded-2xl px-8 py-4 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-ink)' }}
          >
            Take Readiness Assessment ({selectedChapters.size} chapter{selectedChapters.size !== 1 ? 's' : ''})
            <span style={{ color: 'var(--color-accent)' }}> →</span>
          </button>
        </div>
      )}

      {/* Coming-soon modal */}
      {showComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowComingSoon(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-sm card p-6">
            <h2 className="font-display text-2xl mb-2">{showComingSoon} is coming soon</h2>
            <p className="mb-5 text-sm text-[var(--color-muted)]">
              We&apos;re putting the finishing touches on this subject. Check back shortly.
            </p>
            <button
              onClick={() => setShowComingSoon(null)}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
              style={{ background: 'var(--color-ink)' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Bundle modal */}
      {showBundleModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setShowBundleModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full rounded-t-3xl card sm:max-w-md sm:rounded-3xl p-6 overflow-hidden"
          >
            <div
              className="absolute -top-24 -right-16 h-56 w-56 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(217,80,30,0.18), transparent 65%)' }}
            />
            <div className="relative">
              <p className="eyebrow mb-2">CA Finals Bundle</p>
              <h2 className="font-display text-3xl leading-tight">Unlock all four subjects.</h2>
              <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                AFM, FR, Audit &amp; IDT — every chapter, every question.
              </p>

              <div className="mt-5 mb-4 flex items-baseline gap-2">
                <p className="font-display text-5xl">
                  ₹{couponResult?.valid ? (couponResult.finalAmount! / 100).toFixed(2) : '299'}
                </p>
                {couponResult?.valid && (
                  <p className="text-sm text-[var(--color-muted)] line-through">₹299</p>
                )}
              </div>

              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
                  placeholder="Coupon code (optional)"
                  className="flex-1 rounded-md border px-3 py-2 text-sm uppercase placeholder:normal-case bg-paper focus:outline-none focus:border-[#C7C0AF]"
                  style={{ borderColor: 'var(--color-line)' }}
                />
                <button
                  onClick={validateCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-[var(--color-line-soft)] disabled:opacity-50"
                  style={{ borderColor: 'var(--color-line)' }}
                >
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
              {couponResult && (
                <p
                  className="mb-2 text-xs"
                  style={{ color: couponResult.valid ? 'var(--color-success)' : 'var(--color-error)' }}
                >
                  {couponResult.valid ? `${couponResult.discountPercent}% discount applied!` : couponResult.error}
                </p>
              )}
              <button
                onClick={handleUnlockBundle}
                disabled={paymentLoading}
                className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--color-accent)' }}
              >
                {paymentLoading ? 'Processing…' : `Pay ₹${couponResult?.valid ? (couponResult.finalAmount! / 100).toFixed(2) : '299'}`}
              </button>
              <button
                onClick={() => setShowBundleModal(false)}
                className="mt-2 w-full rounded-xl border px-4 py-2.5 text-sm font-medium text-[var(--color-ink-soft)] hover:bg-[var(--color-line-soft)]"
                style={{ borderColor: 'var(--color-line)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapter modal */}
      {openSubject && modalSubject && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpenSubject(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full flex-col card sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)] mb-0.5">
                  {getExamLevel(modalSubject.id) === 'finals' ? 'CA Final' : 'CA Intermediate'}
                </p>
                <h2 className="font-display text-2xl leading-tight">
                  {modalSubject.name.replace(/^CA (Intermediate|Final) — /, '')}
                </h2>
              </div>
              <button
                onClick={() => setOpenSubject(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-line-soft)]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!modalSubjectAccessible && (
              <div
                className="border-b px-5 py-3 text-white relative overflow-hidden"
                style={{ background: 'var(--color-navy)', borderColor: 'var(--color-line)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs">Unlock all CA Finals for ₹299</p>
                  <button
                    onClick={() => setShowBundleModal(true)}
                    className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    Unlock
                  </button>
                </div>
              </div>
            )}

            {allAccessibleInModal.length > 0 && (
              <div className="border-b px-5 py-2.5" style={{ borderColor: 'var(--color-line)' }}>
                <button
                  onClick={() => allSelected ? deselectAllInSubject(openSubject) : selectAllInSubject(openSubject)}
                  className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
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
                        <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)] first:mt-0">
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
                              <span className="text-sm text-[var(--color-muted)] opacity-60">{ch.name}</span>
                              <span className="text-[10px] text-[var(--color-muted)] opacity-60">Coming soon</span>
                            </div>
                          )
                        }

                        if (!accessible) {
                          return (
                            <div key={ch.id} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <svg className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="text-sm text-[var(--color-muted)]">{ch.name}</span>
                              </div>
                              <span className="text-[10px] text-[var(--color-muted)]">Locked</span>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={ch.id}
                            className="flex flex-wrap items-center justify-between gap-1 rounded-lg px-3 py-2.5 hover:bg-[var(--color-bg)]"
                          >
                            <label className="flex min-w-0 items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedChapters.has(ch.id)}
                                onChange={() => toggleChapter(ch.id, openSubject)}
                                className="h-4 w-4 shrink-0 rounded"
                                style={{ accentColor: 'var(--color-ink)' }}
                              />
                              <span className="text-sm text-[var(--color-ink-soft)]">{ch.name}</span>
                              {isFree && (
                                <span
                                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                  style={{ background: 'var(--color-success-soft)', color: '#0E5A3D' }}
                                >
                                  Free preview
                                </span>
                              )}
                            </label>
                            <button
                              onClick={() => goToPractice(ch.id)}
                              className="shrink-0 text-xs text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--color-ink)]"
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

            <div className="border-t px-5 py-4" style={{ borderColor: 'var(--color-line)' }}>
              {selectedInModal > 0 ? (
                <button
                  onClick={goToAssessment}
                  className="w-full rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-ink)' }}
                >
                  Take Assessment ({selectedInModal} chapter{selectedInModal !== 1 ? 's' : ''})
                  <span style={{ color: 'var(--color-accent)' }}> →</span>
                </button>
              ) : (
                <p className="text-center text-xs text-[var(--color-muted)]">
                  Select chapters above to take an assessment
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
