import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'
import {
  getQuestionCountsByChapter,
  getFreeChapterIds,
  hasUserPurchasedChapter,
  getCoupon,
  createPurchase,
} from '@/lib/queries'

const BASE_PRICE_PAISE = 99900 // ₹999

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chapterId, couponCode } = await req.json()
  if (!chapterId || typeof chapterId !== 'string') {
    return NextResponse.json({ error: 'chapterId required' }, { status: 400 })
  }

  const [questionCounts, freeIds] = await Promise.all([
    getQuestionCountsByChapter(),
    getFreeChapterIds(),
  ])

  if ((questionCounts[chapterId] ?? 0) === 0) {
    return NextResponse.json({ error: 'Chapter has no questions' }, { status: 400 })
  }

  if (freeIds.includes(chapterId)) {
    return NextResponse.json({ error: 'This chapter is free' }, { status: 400 })
  }

  const alreadyPurchased = await hasUserPurchasedChapter(Number(session.user.id), chapterId)
  if (alreadyPurchased) {
    return NextResponse.json({ error: 'Already purchased' }, { status: 400 })
  }

  let amount = BASE_PRICE_PAISE
  let validCoupon: string | null = null

  if (couponCode) {
    const coupon = await getCoupon(couponCode)
    if (!coupon || !coupon.active) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 })
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 })
    }
    amount = Math.round(BASE_PRICE_PAISE * (1 - coupon.discountPercent / 100))
    if (amount < 100) amount = 100
    validCoupon = coupon.code
  }

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
  }

  const receipt = `cp_${nanoid(12)}`
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt,
    }),
  })

  if (!rzpRes.ok) {
    const err = await rzpRes.text()
    console.error('[create-order] Razorpay error:', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  const order = await rzpRes.json()
  const purchaseId = nanoid(12)

  await createPurchase({
    id: purchaseId,
    userId: Number(session.user.id),
    chapterId,
    razorpayOrderId: order.id,
    amount,
    originalAmount: BASE_PRICE_PAISE,
    couponCode: validCoupon,
  })

  return NextResponse.json({
    orderId: order.id,
    amount,
    originalAmount: BASE_PRICE_PAISE,
    currency: 'INR',
    purchaseId,
  })
}
