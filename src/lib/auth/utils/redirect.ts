/**
 * Shared redirect URL utilities for authentication flows.
 * Prevents open-redirect vulnerabilities and centralizes redirect logic.
 */

const DEFAULT_REDIRECT = '/studio';

/**
 * Validates a redirect URL and returns a safe version.
 * Only allows relative paths starting with '/'.
 * Blocks absolute URLs, protocol-relative URLs, data/javascript URLs, and path traversal.
 */
export function getSafeRedirectUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return DEFAULT_REDIRECT;

  const trimmed = url.trim();

  // Must start with a single slash (reject //, absolute URLs, javascript:, data:, etc.)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return DEFAULT_REDIRECT;

  // Block path traversal
  if (trimmed.includes('..')) return DEFAULT_REDIRECT;

  // Block non-http schemes that might sneak in after decoding
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('/javascript:') || lower.startsWith('/data:')) return DEFAULT_REDIRECT;

  return trimmed;
}

/**
 * Builds a full /auth URL with an encoded redirect parameter.
 * Returns '/auth' (no param) when redirectTo is the default.
 */
export function buildAuthUrl(redirectTo: string): string {
  const safe = getSafeRedirectUrl(redirectTo);
  if (safe === DEFAULT_REDIRECT) return '/auth';
  return `/auth?redirect=${encodeURIComponent(safe)}`;
}
