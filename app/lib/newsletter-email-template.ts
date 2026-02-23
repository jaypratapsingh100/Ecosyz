/**
 * Fanciful HTML email template for newsletters.
 * Email-safe: inline styles, table-based layout, no external CSS.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://openidea.world';

export interface NewsletterTemplateOptions {
  /** Main content HTML (will be placed inside the content area) */
  bodyHtml: string;
  /** Optional preheader text (shown in inbox preview) */
  preheader?: string;
  /** Optional headline above the body (e.g. "This month's update") */
  headline?: string;
}

/**
 * Wraps the given body HTML in a branded, email-client-safe template.
 */
export function buildNewsletterHtml(options: NewsletterTemplateOptions): string {
  const { bodyHtml, preheader = '', headline } = options;
  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : '';

  const headlineBlock = headline
    ? `<h1 style="margin:0 0 20px 0;font-size:26px;font-weight:700;color:#0f172a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">${escapeHtml(headline)}</h1>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Open Idea Newsletter</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheaderBlock}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 28px 24px;background:linear-gradient(135deg,#0f766e 0%,#0d9488 50%,#14b8a6 100%);border-radius:12px 12px 0 0;text-align:center;">
              <a href="${BASE_URL}" style="text-decoration:none;">
                <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Open Idea</span>
              </a>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">Innovation · AI · Community</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 28px;background:#ffffff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
              ${headlineBlock}
              <div style="font-size:16px;line-height:1.65;color:#334155;">
                ${bodyHtml}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px 32px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
              <p style="margin:0 0 12px;font-size:13px;color:#64748b;">
                You received this because you subscribed to the Open Idea newsletter.
              </p>
              <p style="margin:0;font-size:13px;">
                <a href="${BASE_URL}" style="color:#0d9488;text-decoration:none;font-weight:600;">Visit Open Idea</a>
                &nbsp;·&nbsp;
                <a href="${BASE_URL}/newsletter" style="color:#0d9488;text-decoration:none;">Manage subscription</a>
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} Open Idea. All rights reserved.
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

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Article item for building newsletter body from saved news.
 */
export interface NewsletterArticleItem {
  title: string;
  url: string;
  summary?: string | null;
  source?: string | null;
  category?: string | null;
}

/**
 * Build email-safe HTML body from a list of articles (e.g. saved news marked for newsletter).
 */
export function buildNewsletterBodyFromArticles(articles: NewsletterArticleItem[]): string {
  if (articles.length === 0) {
    return '<p>No articles selected.</p>';
  }
  const blocks = articles.map((a) => {
    const titleEscaped = escapeHtml(a.title);
    const urlEscaped = escapeHtml(a.url);
    const summaryEscaped = a.summary ? escapeHtml(a.summary) : '';
    const sourceEscaped = a.source ? escapeHtml(a.source) : '';
    const categoryEscaped = a.category ? escapeHtml(a.category) : '';
    return `<div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #e2e8f0;">
  ${categoryEscaped ? `<span style="font-size:12px;color:#0d9488;text-transform:uppercase;letter-spacing:0.05em;">${categoryEscaped}</span>` : ''}
  <h2 style="margin:8px 0 12px;font-size:20px;font-weight:600;line-height:1.35;">
    <a href="${urlEscaped}" style="color:#0f172a;text-decoration:none;">${titleEscaped}</a>
  </h2>
  ${summaryEscaped ? `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#475569;">${summaryEscaped}</p>` : ''}
  ${sourceEscaped ? `<p style="margin:0;font-size:13px;color:#94a3b8;">${sourceEscaped}</p>` : ''}
  <a href="${urlEscaped}" style="display:inline-block;margin-top:8px;font-size:14px;font-weight:600;color:#0d9488;text-decoration:none;">Read more →</a>
</div>`;
  });
  return blocks.join('\n');
}

/**
 * Default template with a simple placeholder body for the admin to replace.
 * Used when admin chooses "Use template" and we inject their content as body.
 */
export const DEFAULT_BODY_PLACEHOLDER = `<p>Hello from Open Idea!</p>
<p>Add your newsletter content above or replace this with your own HTML.</p>
<p>You can use simple HTML: <strong>bold</strong>, <em>italic</em>, <a href="${BASE_URL}" style="color:#0d9488;">links</a>, and lists.</p>`;
