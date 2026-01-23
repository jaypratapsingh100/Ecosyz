/**
 * Legacy auth module - maintained for backward compatibility
 * New code should use @/lib/auth instead
 * 
 * @deprecated Use @/lib/auth/server for server-side utilities
 * @deprecated Use @/lib/auth/client for client-side hooks
 */

// Re-export from new auth module for backward compatibility
export {
  getCurrentUser,
  getUid,
  ensureUserInDb,
} from '@/lib/auth/server';

// Re-export ensureOwner but with proper error handling
export { ensureOwner } from '@/lib/auth/server';
