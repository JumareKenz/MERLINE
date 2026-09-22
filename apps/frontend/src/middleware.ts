import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { APP_HOME } from '@/lib/routes';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

/**
 * PHASE 2 — self-hosted (not Vercel) redirect origin fix.
 *
 * `request.url` / `request.nextUrl.origin` in Next.js middleware does not
 * pick up the reverse proxy's forwarded Host/Proto here — it resolves to
 * whatever address the Next server itself was started on (`localhost:3001`,
 * since that's what `next start -H 127.0.0.1 -p 3001` binds). Redirecting
 * with that as the base sent every logged-out visitor to an unreachable
 * `https://localhost:3001/login`, discovered by curling the real domain.
 * Build the origin from the headers Nginx actually forwards instead.
 */
function resolveOrigin(request: NextRequest): string {
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  return `${proto}://${host}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('merline-auth-token')?.value;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isRoot = pathname === '/';

  if (!token && !isPublicRoute && !isRoot) {
    const origin = resolveOrigin(request);
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL(APP_HOME, resolveOrigin(request)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
