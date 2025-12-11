import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req. nextUrl;

  // Allow public routes
  if (publicRoutes. some(route => pathname. startsWith(route))) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const token = req.cookies.get('auth_token')?.value;

  // If no token and trying to access protected route, redirect to login
  if (!token && ! pathname.startsWith('/api')) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams. set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For API routes without token, return 401
  if (! token && pathname.startsWith('/api')) {
    return NextResponse.json(
      { success: false, error:  'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except: 
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.jpg|.*\\. png$).*)',
  ],
};