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

    // Use paginated search to find user regardless of user count
    let page = 1;
    const perPage = 100;

    while (!userId) {
      const { data: usersData, error: listError } =
        await supabase.auth.admin.listUsers({ page, perPage });

      if (listError) {
        console.error('[ResetPassword] listUsers error on page', page, listError.message);
        break;
      }
      if (!usersData?.users?.length) break;

      console.log('[ResetPassword] Scanned page', page, '—', usersData.users.length, 'users');

      const found = usersData.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (found) {
        userId = found.id;
        break;
      }

      // If we got fewer results than perPage, we've reached the last page
      if (usersData.users.length < perPage) break;
      page++;
    }

    if (!userId) {
      console.log('[ResetPassword] User not found for email:', email);
      return NextResponse.json(
        { error: 'No account found with this email address. Please check your email or sign up.' },
        { status: 404 }
      );
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
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Reset your password</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,Helvetica,sans-serif!important;}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#080d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">

  <!-- Preheader text (hidden, shows in inbox preview) -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    You requested a password reset for your Open Idea account. This link expires in 1 hour.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#080d12;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Main card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#0f171e;border-radius:16px;border:1px solid #1e293b;overflow:hidden;">

          <!-- Header with lock icon -->
          <tr>
            <td align="center" style="padding:40px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="width:56px;height:56px;background:linear-gradient(135deg,#10b981,#06b6d4);border-radius:14px;font-size:28px;color:#ffffff;line-height:56px;">
                    &#128274;
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Brand name -->
          <tr>
            <td align="center" style="padding:20px 40px 0 40px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;letter-spacing:-0.3px;">Open Idea</h1>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding:24px 40px 0 40px;">
              <h2 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">Password Reset Request</h2>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td style="padding:16px 40px 0 40px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#94a3b8;text-align:center;">
                We received a request to reset the password associated with your account. Use the button below to set a new password.
              </p>
            </td>
          </tr>

          <!-- Expiry notice -->
          <tr>
            <td align="center" style="padding:20px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#0c1a25;border:1px solid #1e3a4f;border-radius:8px;padding:10px 20px;">
                    <p style="margin:0;font-size:13px;color:#38bdf8;font-weight:500;">
                      &#9202; This link expires in 1 hour
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:28px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#10b981,#06b6d4);">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${resetLink}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="20%" fillcolor="#10b981">
                    <center style="color:#0a1016;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Reset Password</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${resetLink}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:700;color:#0a1016;text-decoration:none;border-radius:10px;letter-spacing:0.3px;line-height:1;">
                      Reset Password
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a1219;border-radius:8px;border:1px solid #1e293b;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">
                      Or copy this link
                    </p>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#22d3ee;word-break:break-all;">
                      ${resetLink}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security notice -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #1e293b;padding-top:24px;">
                    <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#64748b;">Security Tips</p>
                    <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#475569;">
                      &#8226; Never share this link with anyone
                    </p>
                    <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#475569;">
                      &#8226; Open Idea will never ask for your password via email
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#475569;">
                      &#8226; If you didn't request this, you can safely ignore this email
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom padding -->
          <tr>
            <td style="padding:32px 40px 40px 40px;">&nbsp;</td>
          </tr>

        </table>
        <!-- End main card -->

        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding:24px 40px 0 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#334155;">
                &copy; ${new Date().getFullYear()} Open Idea. All rights reserved.
              </p>
              <p style="margin:6px 0 0 0;font-size:11px;line-height:1.5;color:#1e293b;">
                This is an automated message. Please do not reply to this email.
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
