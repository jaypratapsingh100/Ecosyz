import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { verifyResetToken } from '@/app/lib/utils/reset-token';
import { maskEmail } from '@/app/lib/utils/logger';

const UpdatePasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * Update password using a custom reset token.
 *
 * 1. Verify the HMAC-signed token (email + userId + expiry)
 * 2. Use Supabase admin API to update the user's password
 *
 * No Supabase session required — the signed token is proof of email ownership.
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const parse = UpdatePasswordSchema.safeParse(body);

    if (!parse.success) {
      const errorMessages = parse.error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json(
        { error: `Invalid input: ${errorMessages}` },
        { status: 400 }
      );
    }

    const { token, password } = parse.data;

    // Verify the reset token
    const payload = verifyResetToken(token, supabaseServiceKey);

    if (!payload) {
      console.error('[UpdatePassword] Invalid or expired reset token');
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 401 }
      );
    }

    console.log('[UpdatePassword] Token verified:', {
      email: maskEmail(payload.email),
      userId: payload.userId,
    });

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Update password via admin API (no session required)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      payload.userId,
      { password }
    );

    if (updateError) {
      console.error('[UpdatePassword] Admin password update failed:', updateError.message);

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

    console.log('[UpdatePassword] Password updated successfully:', {
      userId: payload.userId,
      email: maskEmail(payload.email),
    });

    return NextResponse.json({
      message: 'Password has been updated successfully',
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[UpdatePassword] Unexpected error:', { message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
