import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    // First, check what cookies we're receiving
    const { getTokens } = await import('@/lib/auth/core/tokens');
    const { accessToken, refreshToken } = await getTokens();
    
    console.log('📥 Session check request received', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });
    
    const user = await getCurrentUser();

    if (!user) {
      // 401 is expected when user is not logged in - don't log as error
      // But log details in development to help debug
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ No authenticated user', {
          hadAccessToken: !!accessToken,
          hadRefreshToken: !!refreshToken,
          reason: !accessToken ? 'no access token' : !refreshToken ? 'no refresh token' : 'session validation failed',
        });
      }
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('✅ Session validated, returning user data', {
      userId: user.id,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url,
      },
    });
  } catch (error: any) {
    console.error('❌ Session error:', error?.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}