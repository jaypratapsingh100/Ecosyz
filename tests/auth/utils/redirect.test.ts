import { describe, it, expect } from 'vitest';
import { getSafeRedirectUrl, buildAuthUrl } from '@/src/lib/auth/utils/redirect';

describe('getSafeRedirectUrl', () => {
  it('returns default /studio for null', () => {
    expect(getSafeRedirectUrl(null)).toBe('/studio');
  });

  it('returns default /studio for undefined', () => {
    expect(getSafeRedirectUrl(undefined)).toBe('/studio');
  });

  it('returns default /studio for empty string', () => {
    expect(getSafeRedirectUrl('')).toBe('/studio');
  });

  it('allows a simple relative path', () => {
    expect(getSafeRedirectUrl('/community')).toBe('/community');
  });

  it('allows a relative path with query params', () => {
    expect(getSafeRedirectUrl('/community?tab=barter')).toBe('/community?tab=barter');
  });

  it('allows nested relative paths', () => {
    expect(getSafeRedirectUrl('/admin/analytics')).toBe('/admin/analytics');
  });

  it('blocks absolute URLs (https)', () => {
    expect(getSafeRedirectUrl('https://evil.com')).toBe('/studio');
  });

  it('blocks absolute URLs (http)', () => {
    expect(getSafeRedirectUrl('http://evil.com/path')).toBe('/studio');
  });

  it('blocks protocol-relative URLs', () => {
    expect(getSafeRedirectUrl('//evil.com')).toBe('/studio');
  });

  it('blocks path traversal with ..', () => {
    expect(getSafeRedirectUrl('/../../etc/passwd')).toBe('/studio');
  });

  it('blocks /javascript: scheme', () => {
    expect(getSafeRedirectUrl('/javascript:alert(1)')).toBe('/studio');
  });

  it('blocks /data: scheme', () => {
    expect(getSafeRedirectUrl('/data:text/html,<h1>hi</h1>')).toBe('/studio');
  });

  it('blocks /JavaScript: (case-insensitive)', () => {
    expect(getSafeRedirectUrl('/JavaScript:alert(1)')).toBe('/studio');
  });

  it('trims whitespace', () => {
    expect(getSafeRedirectUrl('  /profile  ')).toBe('/profile');
  });

  it('blocks non-string input', () => {
    expect(getSafeRedirectUrl(42 as any)).toBe('/studio');
  });
});

describe('buildAuthUrl', () => {
  it('returns /auth with no param for default redirect', () => {
    expect(buildAuthUrl('/studio')).toBe('/auth');
  });

  it('returns /auth with encoded redirect for non-default path', () => {
    expect(buildAuthUrl('/community')).toBe('/auth?redirect=%2Fcommunity');
  });

  it('properly encodes query params in redirect', () => {
    const url = buildAuthUrl('/community?tab=barter');
    expect(url).toBe('/auth?redirect=%2Fcommunity%3Ftab%3Dbarter');
  });

  it('falls back to /auth for unsafe input', () => {
    expect(buildAuthUrl('https://evil.com')).toBe('/auth');
  });
});
