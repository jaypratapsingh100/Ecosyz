/**
 * Authentication constants
 * Centralized constants for auth module
 */

export const SESSION_COOKIE = 'sb-access-token';
export const REFRESH_COOKIE = 'sb-refresh-token';
export const ANON_SESSION_COOKIE = 'anon_session';

export const ANON_SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
