import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { rateLimit, getClientKey } from '@/app/lib/utils/rate-limit';
import { maskEmail } from '@/app/lib/utils/logger';

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Rate limit: 5 requests per minute per IP
  const clientKey = `signin:${getClientKey(req)}`;
  if (!rateLimit(clientKey, 5)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait a minute and try again.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  // Check if Supabase is configured
  if (!supabase) {
    console.error('Supabase client not initialized. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
    return NextResponse.json(
      { 
        error: 'Authentication service unavailable',
        message: 'The authentication service is not properly configured. Please contact support.',
        code: 'SERVICE_UNAVAILABLE'
      },
      { status: 503 }
    );
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          message: 'The request body is not valid JSON.',
          code: 'INVALID_REQUEST'
        },
        { status: 400 }
      );
    }

    // Validate input
    const parse = SignInSchema.safeParse(body);
    if (!parse.success) {
      console.error('Validation error:', parse.error);
      return NextResponse.json(
        { 
          error: 'Invalid input',
          message: parse.error.issues.map(e => e.message).join(', '),
          details: parse.error.message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    const { email, password } = parse.data;

    // Sign in with Supabase
    let authResult;
    try {
      authResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });
    } catch (authError: any) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          message: 'Unable to connect to authentication service. Please try again later.',
          code: 'AUTH_SERVICE_ERROR'
        },
        { status: 503 }
      );
    }

    const { data, error } = authResult;

    if (error) {
      // Provide more helpful error messages
      let errorMessage = error.message;
      
      // Map common Supabase errors to user-friendly messages
      if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in. Check your inbox for a confirmation email.';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
      } else if (error.message.includes('User not found')) {
        errorMessage = 'No account found with this email address. Please sign up first.';
      }
      
      console.error('Sign in error:', {
        message: error.message,
        status: error.status,
        email: maskEmail(email),
      });
      
      return NextResponse.json(
        { 
          error: errorMessage,
          code: error.status || 'AUTH_ERROR',
          originalError: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 400 }
      );
    }

    if (!data || !data.session) {
      console.error('No session data returned from Supabase');
      return NextResponse.json(
        { 
          error: 'Failed to create session',
          message: 'Authentication succeeded but session creation failed. Please try again.',
          code: 'SESSION_ERROR'
        },
        { status: 500 }
      );
    }

    // Set session cookies using new token utilities
    try {
      const { setSessionTokens } = await import('@/lib/auth/core/tokens');
      await setSessionTokens(
        data.session.access_token,
        data.session.refresh_token,
        data.session.expires_in
      );
    } catch (cookieError) {
      console.error('Failed to set cookies:', cookieError);
      // Don't fail the request if cookies fail, but log it
    }

    return NextResponse.json({
      message: 'Signed in successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
      },
    });
  } catch (error: any) {
    console.error('Unexpected sign in error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'An unexpected error occurred. Please try again later.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}