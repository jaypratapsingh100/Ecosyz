import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    );
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
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

    // Delete user from Supabase using admin client (service role key)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: supabaseError } = await adminClient.auth.admin.deleteUser(user.id);

    if (supabaseError) {
      console.error('Error deleting user from Supabase:', supabaseError);
      return NextResponse.json(
        { error: 'Failed to delete user from authentication service' },
        { status: 500 }
      );
    }

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