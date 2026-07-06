import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    const serverToken = process.env.ADMIN_TOKEN;

    if (!serverToken) {
      return NextResponse.json(
        { success: false, error: 'Server authentication is not configured.' },
        { status: 500 }
      );
    }

    if (token !== serverToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin token' },
        { status: 401 }
      );
    }

    // Set 30-day session lifetime
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    const expires = Date.now() + maxAge;
    
    // Sign session payload with secret
    const sessionValue = await signSession(expires, serverToken);

    // Save session in HttpOnly secure cookie
    const cookieStore = await cookies();
    cookieStore.set('admin_session', sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: maxAge / 1000, // maxAge in seconds
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
