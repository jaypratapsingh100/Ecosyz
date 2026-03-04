import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { z } from 'zod';
import { prisma } from '@/src/lib/db';
import { rateLimit, getClientKey } from '@/app/lib/utils/rate-limit';
import { passwordSchema, sanitizeString, sanitizeUrl, maskEmail } from '@/lib/auth/core/validation';

const SignUpSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit: 3 requests per minute per IP
  const clientKey = getClientKey(req);
  if (!rateLimit(`signup:${clientKey}`, 3)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const parse = SignUpSchema.safeParse(body);

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

    const { email, password, name } = parse.data;

    // Sanitize name input
    const sanitizedName = name ? sanitizeString(name) : email.split('@')[0];

    // Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: sanitizedName,
        },
      },
    });

    if (error) {
      // Provide more helpful error messages
      let errorMessage = error.message;

      // Map common Supabase errors to user-friendly messages
      if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.message.includes('Password')) {
        errorMessage = 'Password does not meet requirements.';
      } else if (error.message.includes('email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('Invalid')) {
        errorMessage = 'Invalid input. Please check your information and try again.';
      }

      console.error('Sign up error:', {
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

    if (!data.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create user record in Prisma database immediately
    try {
      if (!data.user.email) {
        throw new Error('User email is required');
      }

      const dbName = sanitizeString(
        data.user.user_metadata?.name || data.user.user_metadata?.full_name || sanitizedName
      );
      const dbAvatarUrl = sanitizeUrl(data.user.user_metadata?.avatar_url);

      await prisma.user.upsert({
        where: { supabaseId: data.user.id },
        update: {
          email: data.user.email,
          name: dbName,
          avatarUrl: dbAvatarUrl,
          updatedAt: new Date(),
        },
        create: {
          supabaseId: data.user.id,
          email: data.user.email,
          name: dbName,
          avatarUrl: dbAvatarUrl,
        },
      });
    } catch (dbError) {
      console.error('Error creating user in database:', dbError);
      // Don't fail the signup if DB creation fails, but log it
    }

    return NextResponse.json({
      message: 'Account created successfully! You can now sign in.',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        emailConfirmed: !!data.user.email_confirmed_at,
      },
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
