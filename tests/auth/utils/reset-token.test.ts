import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateResetToken, verifyResetToken } from '@/app/lib/utils/reset-token';

const SERVICE_KEY = 'test-service-key-12345';
const EMAIL = 'user@example.com';
const USER_ID = 'user-abc-123';

describe('generateResetToken', () => {
  it('returns a string with data and signature separated by a dot', () => {
    const token = generateResetToken(EMAIL, USER_ID, SERVICE_KEY);
    const parts = token.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('encodes email, userId, and expiry in the payload', () => {
    const token = generateResetToken(EMAIL, USER_ID, SERVICE_KEY);
    const [data] = token.split('.');
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    expect(payload.email).toBe(EMAIL);
    expect(payload.userId).toBe(USER_ID);
    expect(payload.exp).toBeGreaterThan(Date.now());
  });

  it('generates different tokens for different emails', () => {
    const token1 = generateResetToken('a@test.com', USER_ID, SERVICE_KEY);
    const token2 = generateResetToken('b@test.com', USER_ID, SERVICE_KEY);
    expect(token1).not.toBe(token2);
  });

  it('generates different tokens for different service keys', () => {
    const token1 = generateResetToken(EMAIL, USER_ID, 'key-1');
    const token2 = generateResetToken(EMAIL, USER_ID, 'key-2');
    expect(token1).not.toBe(token2);
  });
});

describe('verifyResetToken', () => {
  it('verifies a valid token and returns the payload', () => {
    const token = generateResetToken(EMAIL, USER_ID, SERVICE_KEY);
    const result = verifyResetToken(token, SERVICE_KEY);
    expect(result).toEqual({ email: EMAIL, userId: USER_ID });
  });

  it('returns null for a token signed with a different key', () => {
    const token = generateResetToken(EMAIL, USER_ID, SERVICE_KEY);
    expect(verifyResetToken(token, 'wrong-key')).toBeNull();
  });

  it('returns null for a tampered payload', () => {
    const token = generateResetToken(EMAIL, USER_ID, SERVICE_KEY);
    const [, sig] = token.split('.');
    const tamperedData = Buffer.from(
      JSON.stringify({ email: 'hacker@evil.com', userId: USER_ID, exp: Date.now() + 999999 })
    ).toString('base64url');
    expect(verifyResetToken(`${tamperedData}.${sig}`, SERVICE_KEY)).toBeNull();
  });

  it('returns null for an expired token', () => {
    vi.useFakeTimers();
    const token = generateResetToken(EMAIL, USER_ID, SERVICE_KEY);

    // Advance time past the 1-hour expiry
    vi.advanceTimersByTime(61 * 60 * 1000);

    expect(verifyResetToken(token, SERVICE_KEY)).toBeNull();
    vi.useRealTimers();
  });

  it('returns null for a malformed token (no dot)', () => {
    expect(verifyResetToken('nodothere', SERVICE_KEY)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(verifyResetToken('', SERVICE_KEY)).toBeNull();
  });

  it('returns null for a token with missing payload fields', () => {
    const data = Buffer.from(JSON.stringify({ email: EMAIL })).toString('base64url');
    const crypto = require('crypto');
    const secret = crypto.createHash('sha256').update(`reset-password-${SERVICE_KEY}`).digest('hex');
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    expect(verifyResetToken(`${data}.${sig}`, SERVICE_KEY)).toBeNull();
  });
});
