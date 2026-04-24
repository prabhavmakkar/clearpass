import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/select', '/assessment', '/practice', '/history', '/profile', '/link-telegram']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))

  if (!isProtected) return NextResponse.next()

  const sessionToken =
    req.cookies.get('authjs.session-token')?.value ??
    req.cookies.get('__Secure-authjs.session-token')?.value

  if (!sessionToken) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|icon\\.svg|favicon\\.ico).*)'],
}
