import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { APP_HOME } from '@/lib/routes';

const PUBLIC_ROUTES = ['/login', '/field-login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

/** field.jrecc.org serves the dedicated field-worker app, under /field/* internally. */
const FIELD_HOST = 'field.jrecc.org';

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
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    request.nextUrl.host;
  const isFieldHost = host === FIELD_HOST;
  const token = request.cookies.get('merline-auth-token')?.value;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  // On the main domain, '/' is its own client-side redirector (src/app/page.tsx)
  // and does not need a token yet. On field.jrecc.org, '/' rewrites straight
  // into the field home page's real content below, so it needs the same
  // server-side guard as every other field route.
  const isRoot = pathname === '/' && !isFieldHost;

  if (!token && !isPublicRoute && !isRoot) {
    const origin = resolveOrigin(request);
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL(isFieldHost ? '/' : APP_HOME, resolveOrigin(request)));
  }

  // Domain routing: field.jrecc.org's URLs stay clean (field.jrecc.org/ ,
  // not field.jrecc.org/field) — rewritten transparently to the real,
  // field-only route tree under src/app/field/.
  //
  // /login is the one deliberate exception to "public routes stay shared":
  // the field app gets its own login screen (src/app/field-login/ — a
  // sibling of field/, not nested under it, so it does not inherit
  // FieldLayout's authenticated header/logout button). Everything else
  // public (register, forgot-password) stays the shared admin flow; field
  // workers don't self-register.
  if (isFieldHost && (pathname === '/login' || pathname.startsWith('/login/'))) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = '/field-login';
    rewritten.protocol = 'http:';
    rewritten.port = '3001';
    return NextResponse.rewrite(rewritten);
  }

  if (isFieldHost && !pathname.startsWith('/field') && !isPublicRoute) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = pathname === '/' ? '/field' : `/field${pathname}`;
    // The rewrite target is this same Next.js process — plain HTTP on
    // 127.0.0.1:3001, TLS terminates at Nginx. `nextUrl.protocol` picks up
    // the forwarded `https` scheme (inconsistently with `.host`, which does
    // not — see resolveOrigin above), so a rewrite without this line has
    // Next try to speak TLS to its own HTTP-only listener and fail with
    // EPROTO "wrong version number" on every /field request.
    rewritten.protocol = 'http:';
    rewritten.port = '3001';
    return NextResponse.rewrite(rewritten);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // manifest.json and sw.js must be reachable unauthenticated — the
    // browser's install-prompt scanner and service worker registration
    // never carry the auth cookie.
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js)$).*)',
  ],
};
