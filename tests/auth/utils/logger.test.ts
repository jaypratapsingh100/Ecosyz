import { describe, it, expect } from 'vitest';
import { maskEmail } from '@/app/lib/utils/logger';

describe('maskEmail', () => {
  it('masks a standard email address', () => {
    expect(maskEmail('testuser@example.com')).toBe('te***@***');
  });

  it('masks a short-prefix email', () => {
    expect(maskEmail('a@example.com')).toBe('a***@***');
  });

  it('masks a two-char prefix email', () => {
    expect(maskEmail('ab@example.com')).toBe('ab***@***');
  });

  it('returns fallback for email without valid prefix', () => {
    expect(maskEmail('@example.com')).toBe('***@***');
  });

  it('handles email with no @ symbol gracefully', () => {
    // atIndex will be -1, so atIndex <= 0 → returns '***@***'
    expect(maskEmail('noemail')).toBe('***@***');
  });

  it('masks long prefix to only 2 characters', () => {
    expect(maskEmail('verylongemail@domain.com')).toBe('ve***@***');
  });
});
