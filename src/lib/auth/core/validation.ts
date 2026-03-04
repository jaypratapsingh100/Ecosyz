/**
 * Shared authentication validation schemas and utilities
 */

import { z } from 'zod';

/**
 * Shared password validation schema
 * Enforces: min 8 chars, at least one uppercase, one lowercase, one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Sanitize a string to prevent stored XSS
 * Strips HTML-significant characters
 */
export function sanitizeString(str: string): string {
  return str.replace(/[<>"'&]/g, '');
}

/**
 * Sanitize a URL string — only allows http(s) URLs
 * Returns undefined if the URL is not valid http(s)
 */
export function sanitizeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return url;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Mask an email for logging: "us***@***"
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email) return '[no email]';
  const prefix = email.substring(0, 2);
  return `${prefix}***@***`;
}
