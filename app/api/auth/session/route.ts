import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      // Return user: null with 200 — this is a session check endpoint, not a protected resource.
      // Using 401 here causes unnecessary red errors in browser console on every page load.
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url,
      },
    });
  } catch (error: any) {
    console.error('Session error:', error?.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}