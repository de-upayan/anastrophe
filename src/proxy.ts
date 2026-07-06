import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const isLoginPage = pathname === '/admin/login';
  const isAdminRoute = pathname.startsWith('/admin') && !isLoginPage;
  const isUploadApi = pathname === '/api/upload';
  const isListApi = pathname === '/api/ambigrams' && request.method === 'GET';
  const isDeleteApi = pathname.startsWith('/api/ambigrams/') && request.method === 'DELETE';
  
  // Protect administrative views and state-modifying creator endpoints
  if (isAdminRoute || isUploadApi || isListApi || isDeleteApi) {
    const adminSession = request.cookies.get('admin_session')?.value;
    const token = process.env.ADMIN_TOKEN || '';
    
    const isValid = await verifySession(adminSession, token);
    
    if (!isValid) {
      // Return 401 JSON for secure API routes
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Redirect to login page for browser navigation
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*', 
    '/api/upload', 
    '/api/ambigrams/:path*'
  ],
};
