import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { passwordSchema, maskEmail } from '@/lib/auth/core/validation';
import { rateLimit, getClientKey } from '@/app/lib/utils/rate-limit';

const UpdatePasswordSchema = z.object({
  password: passwordSchema,
  accessToken: z.string().min(1, 'Access token is required'),
});

/**
 * Update password after reset
 * Accepts the client-side access token to create a per-request Supabase client.
 * This is required because the server-side singleton has no user session context.
 */
export async function POST(req: NextRequest) {
  // Rate limit: 3 requests per minute per IP
  const clientKey = getClientKey(req);
  if (!rateLimit(`update-password:${clientKey}`, 3)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const parse = UpdatePasswordSchema.safeParse(body);

    if (!parse.success) {
      const errorMessages = parse.error.issues.map(err => {
        const field = err.path.join('.');
        return `${field}: ${err.message}`;
      }).join(', ');

      return NextResponse.json(
        { error: `Invalid input: ${errorMessages}` },
        { status: 400 }
      );
    }

    const { password, accessToken } = parse.data;

    console.log('[UpdatePassword] Processing password update request');

    // Create a per-request Supabase client with the user's access token
    // This ensures we can validate and act on the user's recovery session
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Validate the user's session using the provided token
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[UpdatePassword] No authenticated session:', authError?.message);
      return NextResponse.json(
        { error: 'Authentication required. Please use the password reset link from your email.' },
        { status: 401 }
      );
    }

    console.log('[UpdatePassword] User authenticated:', { userId: user.id, email: maskEmail(user.email) });

    // Update password using the per-request client
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      console.error('[UpdatePassword] Password update failed:', updateError.message);

      if (updateError.message?.includes('same password')) {
        return NextResponse.json(
          { error: 'New password must be different from your current password' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    console.log('[UpdatePassword] Password updated successfully:', { userId: user.id });

    return NextResponse.json({
      message: 'Password has been updated successfully',
      success: true
    });
  } catch (error) {
    console.error('[UpdatePassword] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
