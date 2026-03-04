import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { clearSessionTokens } from '@/lib/auth/core/tokens';

export async function DELETE() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY for account deletion');
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      );
    }

    // Delete user from Prisma database first (due to foreign key constraints)
    try {
      await prisma.user.delete({
        where: { supabaseId: user.id },
      });
    } catch (prismaError) {
      console.error('Error deleting user from Prisma:', prismaError);
      // Continue with Supabase deletion even if Prisma deletion fails
    }

    // Create an admin client with the service role key (required for admin.deleteUser)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: supabaseError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (supabaseError) {
      console.error('Error deleting user from Supabase:', supabaseError.message);
      return NextResponse.json(
        { error: 'Failed to delete user from authentication service' },
        { status: 500 }
      );
    }

    // Clear session cookies after successful deletion
    await clearSessionTokens();

    return NextResponse.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
