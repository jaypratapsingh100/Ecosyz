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
    // First, check if user exists by supabaseId
    const existingBySupabaseId = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    // Also check if user exists by email (in case of email change or duplicate)
    const existingByEmail = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existingBySupabaseId) {
      // User exists with this supabaseId, update it
      await prisma.user.update({
        where: { supabaseId: user.id },
        data: {
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url,
          updatedAt: new Date(),
        },
      });
    } else if (existingByEmail) {
      // User exists with this email but different supabaseId - update the existing record
      await prisma.user.update({
        where: { email: user.email },
        data: {
          supabaseId: user.id, // Update supabaseId to match current user
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url,
          updatedAt: new Date(),
        },
      });
    } else {
      // User doesn't exist, create new one
      await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url,
        },
      });
    }
  } catch (error: any) {
    // Handle database authentication errors specifically
    if (error?.message?.includes('authentication failed') || error?.code === 'P1001' || error?.code === 'P1000') {
      console.error('Database authentication failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables.');
      throw new Error('Database connection failed');
    }
    // Handle unique constraint errors
    if (error?.code === 'P2002') {
      console.error('Unique constraint violation - user may already exist:', error);
      // Try to find and update existing user
      try {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { supabaseId: user.id },
              { email: user.email },
            ],
          },
        });
        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              supabaseId: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
              avatarUrl: user.user_metadata?.avatar_url,
              updatedAt: new Date(),
            },
          });
          return; // Successfully updated
        }
      } catch (retryError) {
        console.error('Failed to recover from unique constraint error:', retryError);
      }
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
