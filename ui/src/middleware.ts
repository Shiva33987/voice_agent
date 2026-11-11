import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { OSS_TOKEN_COOKIE } from '@/lib/auth/cookies';

// Paths that don't require authentication in OSS mode.
// `/embed` serves the public website widget (e.g. /embed/dograh-widget.js),
// which must be fetchable without a session cookie so third-party sites can
// embed it — otherwise the middleware 307-redirects the asset to /auth/login.
// `/book` serves the public per-agent appointment booking portal.
const PUBLIC_PATHS = ['/auth/login', '/auth/signup', '/embed', '/book'];

export function middleware(request: NextRequest) {
  const authProvider = process.env.AUTH_PROVIDER || 'local';

  // Only handle OSS (local) mode
  if (authProvider !== 'local') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow public paths without auth. Match on a path-segment boundary (exact
  // match or a `/`-delimited subpath) rather than a bare prefix, so a public
  // entry like `/embed` exempts `/embed` and `/embed/...` but NOT sibling
  // routes such as `/embed-admin` — a bare startsWith would let those bypass
  // authentication.
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(OSS_TOKEN_COOKIE)?.value;

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public static assets (anything with a file extension, e.g. /dograh-logo.png)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)).*)',
  ],
};
