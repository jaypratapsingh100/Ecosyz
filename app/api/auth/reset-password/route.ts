import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { rateLimit, getClientKey } from '@/app/lib/utils/rate-limit';
import { maskEmail } from '@/lib/auth/core/validation';

const ResetPasswordSchema = z.object({
  email: z.string().email(),
});

/**
 * Request password reset
 * Uses Supabase's built-in resetPasswordForEmail which sends emails via Resend SMTP
 */
export async function POST(req: NextRequest) {
  // Rate limit: 3 requests per minute per IP
  const clientKey = getClientKey(req);
  if (!rateLimit(`reset-password:${clientKey}`, 3)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[ResetPassword] Missing Supabase configuration');
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const parse = ResetPasswordSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = parse.data;

    // Get the base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    req.headers.get('origin') ||
                    'http://localhost:3000';
    const redirectTo = `${baseUrl}/auth/reset-password`;

    console.log('[ResetPassword] Requesting password reset:', {
      email: maskEmail(email),
      redirectTo,
      isDev: process.env.NODE_ENV !== 'production'
    });

    // Create a fresh Supabase client for this request
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error('[ResetPassword] Supabase error:', {
        message: error.message,
        status: error.status,
        email: maskEmail(email),
      });

      let errorMessage = 'Failed to send password reset email';
      let statusCode = 400;

      if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
        statusCode = 429;
      } else if (error.message?.toLowerCase().includes('redirect') ||
                 error.message?.toLowerCase().includes('url') ||
                 error.message?.toLowerCase().includes('whitelist')) {
        errorMessage = 'Invalid redirect URL configuration. Please ensure the redirect URL is whitelisted in Supabase dashboard.';
        statusCode = 400;
        console.error('[ResetPassword] Redirect URL issue:', {
          redirectTo,
          message: 'Ensure this URL is added to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs',
        });
      } else if (error.message?.toLowerCase().includes('email') ||
                 error.message?.toLowerCase().includes('not found') ||
                 error.message?.toLowerCase().includes('user')) {
        // Don't reveal if email exists (security best practice)
        if (process.env.NODE_ENV === 'development') {
          errorMessage = `Failed to send password reset email: ${error.message}`;
        } else {
          errorMessage = 'If an account exists with this email, a password reset link will be sent.';
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          errorMessage = `Failed to send password reset email: ${error.message || 'Unknown error'}`;
        }
      }

      const errorResponse = {
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          status: error.status,
          name: error.name,
          redirectTo,
        })
      };

      return NextResponse.json(errorResponse, { status: statusCode });
    }

    console.log('[ResetPassword] Password reset email sent successfully');

    return NextResponse.json({
      message: 'Password reset email sent successfully. Please check your inbox.',
      success: true,
    });
  } catch (error: any) {
    console.error('[ResetPassword] Unexpected error:', {
      message: error?.message,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error?.message })
      },
      { status: 500 }
    );
  }
}
