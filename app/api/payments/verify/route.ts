import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { auth } from '@/lib/auth'
import { markPurchasePaid, incrementCouponUsage } from '@/lib/queries'
import { getDb } from '@/lib/db'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purchaseId } = await req.json()

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !purchaseId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
  }

  const expectedSignature = createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  const sql = getDb()
  const rows = await sql`SELECT coupon_code FROM purchases WHERE id = ${purchaseId} AND user_id = ${Number(session.user.id)} AND status = 'pending'`
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
  }

  await markPurchasePaid(purchaseId, razorpay_payment_id, razorpay_signature)

  const couponCode = rows[0].coupon_code as string | null
  if (couponCode) {
    await incrementCouponUsage(couponCode)
  }

  return NextResponse.json({ ok: true })
}
