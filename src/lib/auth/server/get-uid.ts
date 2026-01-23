/**
 * Get user ID (authenticated or anonymous)
 * Returns authenticated user ID or falls back to anonymous session ID
 */

import { getCurrentUser } from './get-current-user';
import { ensureUserInDb } from '../core/user';
import { getAnonymousUid } from '../core/session';

/**
 * Get user ID - authenticated user ID or anonymous session ID
 */
export async function getUid(): Promise<string> {
  const user = await getCurrentUser();

  if (user) {
    // Ensure user exists in our database
    await ensureUserInDb(user);
    return user.id;
  }

  // Fallback to anonymous session for backwards compatibility
  return getAnonymousUid();
}
