import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { deployToVercel, getClaimableDeploymentUrl } from '@/lib/vercel';
import { buildDeployableHtml } from '@/app/lib/app-builder/build-deployable-html';

/**
 * POST /api/app-projects/[id]/deploy/vercel
 * Deploy project to Vercel (using app's Vercel account). Returns live URL and claim link.
 * Builds deployable HTML (same as preview) so the live site matches what users see.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: {
        files: { orderBy: { path: 'asc' } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!project.files.length) {
      return NextResponse.json(
        { error: 'Project has no files to deploy' },
        { status: 400 }
      );
    }

    const slug =
      (project.title || 'project')
        .replace(/[^a-z0-9-]/gi, '-')
        .replace(/-+/g, '-')
        .toLowerCase() || 'project';
    const uniqueName = `${slug}-${id.slice(-8)}`;

    // Build deployable HTML (same logic as preview) so the live site works.
    // Raw project files (src/App.jsx with imports, etc.) would show blank when deployed.
    let deployableIndexHtml: string;
    try {
      deployableIndexHtml = buildDeployableHtml(
        {
          files: project.files,
          framework: project.framework,
          title: project.title,
        },
        { showPreviewBanner: false }
      );
    } catch (buildErr) {
      console.error('Deploy build error:', buildErr);
      return NextResponse.json(
        {
          error:
            buildErr instanceof Error
              ? buildErr.message
              : 'Failed to build deployable HTML',
        },
        { status: 400 }
      );
    }

    // Ensure static-only deployment so no serverless function is invoked (avoids FUNCTION_INVOCATION_FAILED)
    const vercelJson = {
      version: 2,
      builds: [{ src: '**/*', use: '@vercel/static' }],
    };
    const filesForDeploy = [
      { path: 'index.html', content: deployableIndexHtml },
      { path: 'vercel.json', content: JSON.stringify(vercelJson, null, 2) },
    ];

    const result = await deployToVercel({
      files: filesForDeploy,
      projectName: uniqueName,
      framework: undefined, // Static HTML, no build
    });

    const claimUrl = getClaimableDeploymentUrl(result.deploymentId);
    const liveUrl = result.url.startsWith('http') ? result.url : `https://${result.url}`;

    await prisma.appProject.update({
      where: { id },
      data: {
        deploymentUrl: liveUrl,
        deploymentId: result.deploymentId,
        claimUrl,
        deploymentPlatform: 'vercel',
        deploymentStatus: result.readyState === 'READY' ? 'deployed' : 'building',
        deployedAt: new Date(),
      },
    });

    return NextResponse.json({
      url: liveUrl,
      deploymentId: result.deploymentId,
      claimUrl,
      readyState: result.readyState,
    });
  } catch (error) {
    console.error('Vercel deploy error:', error);
    const message = error instanceof Error ? error.message : 'Deployment failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
