import { getCurrentUser } from './auth';

// Admin emails - can be configured via environment variable
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || [
  'sohni2012@gmail.com',
  'tesla@gmail.com'
];

/**
 * Check if the current user is an admin
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return false;
    }
    return ADMIN_EMAILS.includes(user.email.toLowerCase());
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get admin emails list
 * @returns string[] - Array of admin email addresses
 */
export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}

/**
 * Check if an email is an admin email
 * @param email - Email address to check
 * @returns boolean - true if email is admin, false otherwise
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}




