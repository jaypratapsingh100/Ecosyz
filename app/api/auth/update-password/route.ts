import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { z } from 'zod';

const UpdatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Update password after reset
 * Requires authenticated session (user must come from Supabase reset link)
 */
export async function POST(req: NextRequest) {
  if (!supabase) {
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

    const { password } = parse.data;

    console.log('[UpdatePassword] Processing password update request');

    // Check if user is authenticated (required for password update)
    // User should have a session from clicking the reset link
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[UpdatePassword] No authenticated session:', authError?.message);
      return NextResponse.json(
        { error: 'Authentication required. Please use the password reset link from your email.' },
        { status: 401 }
      );
    }

    console.log('[UpdatePassword] User authenticated:', { userId: user.id, email: user.email });

    // Update password using Supabase
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      console.error('[UpdatePassword] Password update failed:', updateError);
      
      // Handle specific Supabase errors
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
      userId: user.id,
      email: user.email 
    });

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
