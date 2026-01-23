/**
 * Token refresh endpoint
 * Allows clients to refresh expired access tokens
 */

import { NextResponse } from 'next/server';
import { getTokens, refreshAccessToken, setSessionTokens } from '@/lib/auth/core/tokens';

export async function POST() {
  try {
    const { refreshToken } = await getTokens();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      );
    }

    const refreshed = await refreshAccessToken(refreshToken);

    if (!refreshed) {
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 401 }
      );
    }

    // Update cookies with new access token
    await setSessionTokens(refreshed.accessToken, refreshToken, refreshed.expiresIn);

    return NextResponse.json({
      success: true,
      expiresIn: refreshed.expiresIn,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
