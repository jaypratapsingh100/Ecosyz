import { prisma } from '../../../src/lib/db'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '../../../src/lib/auth'
import { ensureUserInDb } from '../../../src/lib/auth/core/user'
import WorkspacePageClient from '../../components/workspace/WorkspacePageClient'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

interface Resource {
  id: string
  title: string
  url?: string
  notes?: string
  createdAt: string
  tags?: string[]
  annotations: { id: string; body: string; createdAt: string }[]
  annotationCount?: number
  plagiarismScore?: number
  plagiarismStatus?: string
}

interface Workspace {
  id: string
  title: string
  resources: Resource[]
  shareLink: { id: string; token: string; createdAt: string; expiresAt?: string } | null
}

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return []
}

export default async function WorkspacePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Check authentication and ownership
  const supabaseUser = await getCurrentUser()
  if (supabaseUser) {
    await ensureUserInDb(supabaseUser)
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })
    
    if (prismaUser) {
      // Ensure user has exactly one workspace (consolidate if multiple exist)
      // This is handled by ensureUserInDb, but we'll verify here too
      const userWorkspaces = await prisma.workspace.findMany({
        where: { ownerId: prismaUser.id },
        orderBy: { createdAt: 'asc' },
      })
      
      let userWorkspace;
      if (userWorkspaces.length === 0) {
        // Should not happen if ensureUserInDb worked, but handle it
        userWorkspace = await prisma.workspace.create({
          data: {
            title: 'My Workspace',
            ownerId: prismaUser.id,
          },
        })
      } else if (userWorkspaces.length > 1) {
        // Multiple workspaces - consolidation will happen via ensureUserInDb on next call
        // For now, use the oldest one
        userWorkspace = userWorkspaces[0]
      } else {
        userWorkspace = userWorkspaces[0]
      }
      
      // If user tries to access a workspace that isn't theirs, redirect to their own workspace
      if (userWorkspace && userWorkspace.id !== id) {
        redirect(`/workspaces/${userWorkspace.id}`)
      }
    }
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      resources: {
        include: {
          annotations: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      shares: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!workspace) {
    notFound()
  }
  
  // Additional ownership check for authenticated users
  if (supabaseUser) {
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })
    if (prismaUser && workspace.ownerId !== prismaUser.id) {
      // User is authenticated but doesn't own this workspace
      // Get their own workspace (should be exactly one after consolidation)
      const userWorkspaces = await prisma.workspace.findMany({
        where: { ownerId: prismaUser.id },
        orderBy: { createdAt: 'asc' },
      })
      
      if (userWorkspaces.length > 0) {
        // Redirect to their primary workspace (oldest one)
        redirect(`/workspaces/${userWorkspaces[0].id}`)
      }
      notFound()
    }
  }

  interface ResourceData {
    notes?: string;
  }

  // Add annotation count to resources
  const resourcesWithCount = workspace.resources.map(resource => {
    const data = (resource.data as ResourceData | null) ?? {};
    return {
      ...resource,
      url: resource.url || undefined,
      notes: data.notes,
      createdAt: resource.createdAt.toISOString(),
      annotations: resource.annotations.map((annotation) => ({
        id: annotation.id,
        body: annotation.body,
        createdAt: annotation.createdAt.toISOString(),
      })),
      annotationCount: resource.annotations.length,
      tags: Array.isArray(resource.tags) ? resource.tags.map(tag => String(tag)) : undefined,
      plagiarismScore: resource.plagiarismScore ?? undefined,
      plagiarismStatus: resource.plagiarismStatus ?? undefined,
    }
  })

  const workspaceData: Workspace = {
    id: workspace.id,
    title: workspace.title,
    resources: resourcesWithCount,
    shareLink: workspace.shares.length > 0 ? {
      id: workspace.shares[0].id,
      token: workspace.shares[0].token,
      createdAt: workspace.shares[0].createdAt.toISOString(),
      expiresAt: workspace.shares[0].expiresAt?.toISOString(),
    } : null,
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <WorkspacePageClient workspaceData={workspaceData} />
      </main>
      <Footer />
    </div>
  )
}