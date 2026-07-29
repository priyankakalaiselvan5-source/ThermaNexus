import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth is handled client-side via AuthGuard + Supabase localStorage session.
// The Supabase JS client stores tokens in localStorage, not cookies, so
// server-side middleware cannot verify auth state. AuthGuard handles
// redirecting unauthenticated users to /login and enforcing role-based routes.

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
