import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimit, getClientKey } from '@/app/lib/utils/rate-limit';

describe('getClientKey', () => {
  function makeRequest(headers: Record<string, string> = {}) {
    return {
      headers: {
        get: (name: string) => headers[name] ?? null,
      },
    } as any;
  }

  it('returns IP from x-forwarded-for header', () => {
    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(getClientKey(req)).toBe('1.2.3.4');
  });

  it('returns IP from x-real-ip header', () => {
    const req = makeRequest({ 'x-real-ip': '10.0.0.1' });
    expect(getClientKey(req)).toBe('10.0.0.1');
  });

  it('returns IP from cf-connecting-ip header', () => {
    const req = makeRequest({ 'cf-connecting-ip': '172.16.0.1' });
    expect(getClientKey(req)).toBe('172.16.0.1');
  });

  it('prefers x-forwarded-for over other headers', () => {
    const req = makeRequest({
      'x-forwarded-for': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
      'cf-connecting-ip': '3.3.3.3',
    });
    expect(getClientKey(req)).toBe('1.1.1.1');
  });

  it('returns "unknown" when no IP headers present', () => {
    const req = makeRequest({});
    expect(getClientKey(req)).toBe('unknown');
  });
});

describe('rateLimit', () => {
  beforeEach(() => {
    // Reset the rate limit map by calling with a fresh key each time
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}`;
    expect(rateLimit(key, 3)).toBe(true);
    expect(rateLimit(key, 3)).toBe(true);
    expect(rateLimit(key, 3)).toBe(true);
  });

  it('blocks requests exceeding the limit', () => {
    const key = `test-block-${Date.now()}`;
    expect(rateLimit(key, 2)).toBe(true);
    expect(rateLimit(key, 2)).toBe(true);
    expect(rateLimit(key, 2)).toBe(false);
  });

  it('resets after the time window expires', () => {
    const key = `test-reset-${Date.now()}`;
    expect(rateLimit(key, 1)).toBe(true);
    expect(rateLimit(key, 1)).toBe(false);

    // Advance past the 1-minute window
    vi.advanceTimersByTime(61_000);

    expect(rateLimit(key, 1)).toBe(true);
  });

  it('tracks different keys independently', () => {
    const keyA = `test-a-${Date.now()}`;
    const keyB = `test-b-${Date.now()}`;

    expect(rateLimit(keyA, 1)).toBe(true);
    expect(rateLimit(keyA, 1)).toBe(false);
    // keyB should still be allowed
    expect(rateLimit(keyB, 1)).toBe(true);
  });
});
