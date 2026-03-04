import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { generateResetToken } from '@/app/lib/utils/reset-token';

const ResetPasswordSchema = z.object({
  email: z.string().email(),
});

/**
 * Custom password reset flow that bypasses Supabase's built-in email/OTP system.
 *
 * 1. Look up user by email via Supabase admin API
 * 2. Generate a signed token (HMAC-SHA256) with email + expiry
 * 3. Send the reset link via Resend
 * 4. The /auth/reset-password page reads the token from query params
 * 5. The /api/auth/update-password route verifies the token and resets via admin API
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[ResetPassword] Missing Supabase service role configuration');
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  if (!resendApiKey) {
    console.error('[ResetPassword] Missing RESEND_API_KEY');
    return NextResponse.json(
      { error: 'Email service unavailable' },
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

    // Derive base URL from request headers (works for both localhost and production)
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const baseUrl = origin || (host ? `${proto}://${host}` : 'http://localhost:3000');

    console.log('[ResetPassword] Requesting password reset:', { email, baseUrl });

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up user by email via Supabase admin API
    let userId: string | null = null;

    const { data: usersData, error: listError } =
      await supabase.auth.admin.listUsers({ perPage: 50 });

    if (!listError && usersData?.users) {
      const found = usersData.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (found) {
        userId = found.id;
      }
    }

    if (!userId) {
      // Don't reveal that the user doesn't exist — return success anyway
      console.log('[ResetPassword] User not found, returning success (security)');
      return NextResponse.json({
        message:
          'If an account exists with this email, a password reset link will be sent.',
        success: true,
      });
    }

    console.log('[ResetPassword] User found:', { userId });

    // Generate a signed reset token
    const token = generateResetToken(email, userId, supabaseServiceKey);
    const resetLink = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    console.log('[ResetPassword] Sending reset email via Resend...');

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Open Idea <noreply@openidea.world>',
        to: email,
        subject: 'Reset your Open Idea password',
        html: buildResetEmailHtml(resetLink),
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error('[ResetPassword] Resend API error:', {
        status: resendResponse.status,
        error: resendError,
      });
      return NextResponse.json(
        {
          error: 'Failed to send reset email. Please try again.',
          ...(process.env.NODE_ENV === 'development' && {
            details: resendError,
          }),
        },
        { status: 500 }
      );
    }

    const resendResult = await resendResponse.json();
    console.log('[ResetPassword] Email sent via Resend:', {
      id: resendResult.id,
    });

    return NextResponse.json({
      message:
        'If an account exists with this email, a password reset link will be sent.',
      success: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ResetPassword] Unexpected error:', { message });
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: message }),
      },
      { status: 500 }
    );
  }
}

// ---- Email template ----

function buildResetEmailHtml(resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a1016;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a1016;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0c2321,#121f22);border-radius:16px;border:1px solid rgba(255,255,255,0.1);padding:40px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Open Idea</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <h2 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">Reset Your Password</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0;">
                We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#06b6d4);color:#0a1016;font-weight:600;font-size:16px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:16px;">
              <p style="color:#64748b;font-size:13px;line-height:1.5;margin:0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color:#06b6d4;font-size:13px;line-height:1.5;margin:8px 0 0;word-break:break-all;">
                ${resetLink}
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;">
              <p style="color:#475569;font-size:12px;line-height:1.5;margin:0;">
                If you didn't request this, you can safely ignore this email. Your password won't be changed.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
