import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase';
import { z } from 'zod';
import { prisma } from '@/src/lib/db';
import { rateLimit, getClientKey } from '@/app/lib/utils/rate-limit';
import { maskEmail } from '@/app/lib/utils/logger';

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit: 3 requests per minute per IP
  const clientKey = `signup:${getClientKey(req)}`;
  if (!rateLimit(clientKey, 3)) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please wait a minute and try again.', code: 'RATE_LIMITED' },
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
      return NextResponse.json(
        { error: 'Invalid input', details: parse.error.message },
        { status: 400 }
      );
    }

    const { email, password, name } = parse.data;

    // Sign up with Supabase (disable email confirmation for testing)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0], // Default name from email
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
        errorMessage = 'Password must be at least 6 characters long.';
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

      await prisma.user.upsert({
        where: { supabaseId: data.user.id },
        update: {
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || name || email.split('@')[0],
          avatarUrl: data.user.user_metadata?.avatar_url,
          updatedAt: new Date(),
        },
        create: {
          supabaseId: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || name || email.split('@')[0],
          avatarUrl: data.user.user_metadata?.avatar_url,
        },
      });
    } catch (dbError) {
      console.error('Error creating user in database:', dbError);
      // Don't fail the signup if DB creation fails, but log it
    }

    // Send welcome email (non-blocking)
    const userName = data.user.user_metadata?.name || name || email.split('@')[0];
    sendWelcomeEmail(email, userName).catch((err: unknown) =>
      console.error('[Signup] Failed to send welcome email:', err)
    );

    return NextResponse.json({
      message: 'Account created successfully! You can now sign in.',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        emailConfirmed: data.user.email_confirmed_at ? true : false,
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

// ---- Welcome email ----

async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('[Signup] RESEND_API_KEY not set, skipping welcome email');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Open Idea <noreply@openidea.world>',
      to: email,
      subject: 'Welcome to Open Idea!',
      html: buildWelcomeEmailHtml(name),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }

  const result = await res.json();
  console.log('[Signup] Welcome email sent:', { id: result.id, email: maskEmail(email) });
}

function buildWelcomeEmailHtml(name: string): string {
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Welcome to Open Idea</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,Helvetica,sans-serif!important;}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Preheader -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your Open Idea account is ready. Start exploring open-source research and building today.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Main card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background-color:#ffffff;border-radius:20px;border:1px solid #d1fae5;overflow:hidden;box-shadow:0 4px 24px rgba(16,185,129,0.08);">

          <!-- Hero banner with gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#0891b2,#7c3aed);padding:40px 40px 32px 40px;text-align:center;">
              <!-- Globe icon -->
              <div style="font-size:52px;line-height:1;">&#127758;</div>
              <h1 style="margin:16px 0 0 0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Welcome to Open Idea</h1>
              <p style="margin:8px 0 0 0;font-size:15px;color:rgba(255,255,255,0.85);font-weight:400;">
                Where ideas connect across the globe
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                Hi ${name}! &#128075;
              </h2>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.7;color:#4b5563;">
                Your account is all set. You've just joined a global community of researchers, builders, and innovators working with open-source knowledge.
              </p>
            </td>
          </tr>

          <!-- Feature cards -->
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <!-- Feature 1 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#ecfdf5,#f0fdfa);border:1px solid #a7f3d0;border-radius:12px;padding:16px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="font-size:22px;line-height:1;">&#128269;</td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#065f46;">Global Research Search</p>
                          <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Search across papers, hardware, code &amp; datasets worldwide</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Feature 2 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1px solid #93c5fd;border-radius:12px;padding:16px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="font-size:22px;line-height:1;">&#129302;</td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#1e40af;">AI App Builder</p>
                          <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Build and deploy apps powered by AI in minutes</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Feature 3 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#faf5ff,#fdf4ff);border:1px solid #d8b4fe;border-radius:12px;padding:16px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="font-size:22px;line-height:1;">&#128194;</td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#6b21a8;">Workspaces</p>
                          <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Organize your projects and collaborate with others</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Feature 4 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#fff7ed,#fffbeb);border:1px solid #fdba74;border-radius:12px;padding:16px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="font-size:22px;line-height:1;">&#127760;</td>
                        <td style="padding-left:10px;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#9a3412;">Global Community</p>
                          <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;line-height:1.5;">Connect with innovators and share ideas around the world</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:32px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:12px;background:linear-gradient(135deg,#059669,#0891b2);">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="https://openidea.world/studio" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="20%" fillcolor="#059669">
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Start Exploring &#127758;</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="https://openidea.world/studio" target="_blank" style="display:inline-block;padding:15px 44px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;letter-spacing:0.3px;line-height:1;">
                      Start Exploring &#127758;
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Help -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;padding-top:24px;text-align:center;">
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
                      Questions? Visit our
                      <a href="https://openidea.world/docs" style="color:#0891b2;text-decoration:none;font-weight:500;">documentation</a>
                      or just reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom padding -->
          <tr>
            <td style="padding:28px 40px 36px 40px;">&nbsp;</td>
          </tr>

        </table>
        <!-- End main card -->

        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">
          <tr>
            <td align="center" style="padding:24px 40px 0 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Open Idea. All rights reserved.
              </p>
              <p style="margin:6px 0 0 0;font-size:11px;line-height:1.5;color:#d1d5db;">
                You're receiving this because you signed up for Open Idea.
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