/**
 * User management utilities
 * Handles user database operations and validation
 */

import { User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from '@/src/lib/db';

/**
 * Ensure user exists in database, create or update as needed
 */
export async function ensureUserInDb(user: SupabaseUser): Promise<void> {
  if (!user.email) {
    console.error('User email is required');
    throw new Error('User email is required');
  }

  try {
    await prisma.user.upsert({
      where: { supabaseId: user.id },
      update: {
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url,
        updatedAt: new Date(),
      },
      create: {
        supabaseId: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url,
      },
    });
  } catch (error: any) {
    // Handle database authentication errors specifically
    if (error?.message?.includes('authentication failed') || error?.code === 'P1001' || error?.code === 'P1000') {
      console.error('Database authentication failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables.');
      throw new Error('Database connection failed');
    }
    console.error('Error ensuring user in database:', error);
    throw error;
  }
}

/**
 * Get user name from Supabase user metadata
 */
export function getUserName(user: SupabaseUser): string {
  return (
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'User'
  );
}
