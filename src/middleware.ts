import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const token = request.cookies.get('auth-token')?.value;
  const refreshToken = request.cookies.get('refresh-token')?.value;

  let isAccessTokenValid = false;
  if (token) {
    const payload = parseJwt(token);
    // exp is in seconds, Date.now() is in milliseconds
    if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
      isAccessTokenValid = true;
    }
  }

  let isRefreshTokenValid = false;
  if (refreshToken) {
    const payload = parseJwt(refreshToken);
    if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
      isRefreshTokenValid = true;
    }
  }

  const isLoggedIn = isAccessTokenValid || isRefreshTokenValid;

  // 1. If user is logged in, restrict access to /login (redirect to /dashboard)
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. If user is NOT logged in, restrict access to protected pages (redirect to /login)
  if (!isLoggedIn && (pathname === '/dashboard' || pathname === '/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard', '/admin'],
};
