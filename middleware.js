// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const session = request.cookies.get('viga-session');
  const { pathname } = request.nextUrl;

  // Si no hay sesión y quiere entrar a áreas privadas, al login.
  const isPrivateRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/infrastructure') || pathname.startsWith('/tests');
  
  if (!session && isPrivateRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si está logueado, que no pueda volver al login ni a la landing (para ir directo al laburo)
  if (session && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}