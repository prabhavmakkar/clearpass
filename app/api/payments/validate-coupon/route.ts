import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCoupon } from '@/lib/queries'

const BASE_PRICE_PAISE = 99900

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await req.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ valid: false, error: 'Coupon code required' })
  }

  const coupon = await getCoupon(code)
  if (!coupon || !coupon.active) {
    return NextResponse.json({ valid: false, error: 'Invalid coupon code' })
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ valid: false, error: 'Coupon usage limit reached' })
  }

  const finalAmount = Math.max(100, Math.round(BASE_PRICE_PAISE * (1 - coupon.discountPercent / 100)))

  return NextResponse.json({
    valid: true,
    discountPercent: coupon.discountPercent,
    originalAmount: BASE_PRICE_PAISE,
    finalAmount,
  })
}
