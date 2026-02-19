import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ensureUserInDb } from '@/lib/auth/core/user'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseUser = await getCurrentUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists in database
    await ensureUserInDb(supabaseUser)

    // Get the Prisma user record to get the correct ID
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 401 })
    }

    // Find the resource and verify ownership through workspace
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: { workspace: true },
    })

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    if (resource.workspace.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the resource (cascade will handle annotations)
    await prisma.resource.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/resources/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}