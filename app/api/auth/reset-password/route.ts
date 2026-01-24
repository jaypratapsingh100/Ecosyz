import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const ResetPasswordSchema = z.object({
  email: z.string().email(),
});

/**
 * Request password reset
 * Uses Supabase's built-in resetPasswordForEmail which sends emails via Resend SMTP
 */
export async function POST(req: NextRequest) {
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
    // Use the request origin if NEXT_PUBLIC_BASE_URL is not set
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    req.headers.get('origin') || 
                    'http://localhost:3000';
    const redirectTo = `${baseUrl}/auth/reset-password`;

    console.log('[ResetPassword] Requesting password reset:', { 
      email,
      redirectTo,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      requestOrigin: req.headers.get('origin'),
      isDev: process.env.NODE_ENV !== 'production' 
    });

    // Create a fresh Supabase client for this request
    // This ensures proper server-side configuration
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Use Supabase's built-in password reset
    // This will send an email via Resend SMTP (configured in Supabase)
    console.log('[ResetPassword] Calling Supabase resetPasswordForEmail...');
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    console.log('[ResetPassword] Supabase response:', {
      hasData: !!data,
      hasError: !!error,
      errorType: error?.constructor?.name,
      errorKeys: error ? Object.keys(error) : [],
    });

    if (error) {
      // Log the error in multiple formats to catch all possible structures
      console.error('[ResetPassword] Supabase error (stringified):', JSON.stringify(error, null, 2));
      console.error('[ResetPassword] Supabase error (object):', {
        message: error.message,
        status: error.status,
        name: error.name,
        email,
        redirectTo,
        errorObject: error,
        errorString: String(error),
      });
      
      // Provide helpful error messages
      let errorMessage = 'Failed to send password reset email';
      let statusCode = 400;
      
      // Check for specific error types
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
        // But in development, show the actual error
        if (process.env.NODE_ENV === 'development') {
          errorMessage = `Failed to send password reset email: ${error.message}`;
        } else {
          errorMessage = 'If an account exists with this email, a password reset link will be sent.';
        }
      } else {
        // Generic error - show details in development
        if (process.env.NODE_ENV === 'development') {
          errorMessage = `Failed to send password reset email: ${error.message || 'Unknown error'}`;
        }
        console.error('[ResetPassword] Full error details:', error);
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
      
      console.log('[ResetPassword] Returning error response:', errorResponse);
      
      return NextResponse.json(
        errorResponse,
        { 
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('[ResetPassword] Password reset email sent successfully');

    // Success - Supabase will send the email via Resend SMTP
    const successResponse = {
      message: 'Password reset email sent successfully. Please check your inbox.',
      success: true,
    };
    
    console.log('[ResetPassword] Returning success response:', successResponse);
    
    return NextResponse.json(successResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[ResetPassword] Unexpected error:', {
      message: error?.message,
      stack: error?.stack,
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
