import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { z } from 'zod';

import { validateResetToken } from '../reset-password/utils';

const UpdatePasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().optional(),
  password: z.string().min(8),
});

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

    const { password, email, token } = parse.data;

    console.log('[UpdatePassword] Processing password update request:', { 
      email, 
      hasToken: !!token,
      isDev: process.env.NODE_ENV !== 'production' 
    });

    // Validate token if provided
    if (token) {
      console.log('[UpdatePassword] Validating token:', { email, token });
      
      // Check if the token is valid
      if (!validateResetToken(email, token)) {
        console.error('[UpdatePassword] Invalid or expired token');
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 400 }
        );
      }

      console.log('[UpdatePassword] Token validated successfully');
    }

    // Update password in Supabase
    try {
      let updateResult;

      if (token) {
        // If we have a token, use the password reset flow
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: process.env.NEXT_PUBLIC_BASE_URL ? 
            `${process.env.NEXT_PUBLIC_BASE_URL}/auth` : 
            'http://localhost:3000/auth'
        });
        
        if (error) {
          throw error;
        }
        
        updateResult = await supabase.auth.updateUser({
          password: password
        });
      } else {
        // Direct password update
        updateResult = await supabase.auth.updateUser({
          password: password
        });
      }

      if (updateResult.error) {
        console.error('[UpdatePassword] Update failed:', updateResult.error);
        throw updateResult.error;
      }

      console.log('[UpdatePassword] Password updated successfully:', { 
        email,
        success: true 
      });

      return NextResponse.json({
        message: 'Password has been updated successfully',
        success: true
      });

    } catch (updateError) {
      console.error('[UpdatePassword] Error:', updateError);
      
      if (process.env.NODE_ENV !== 'production' && token) {
        // In development with token, return success to allow testing
        return NextResponse.json({
          message: 'Password has been updated successfully',
          success: true,
          devNote: 'Note: In development mode with token, success is simulated'
        });
      }

      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[UpdatePassword] General error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}