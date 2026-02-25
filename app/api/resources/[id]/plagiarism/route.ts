import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/auth/core/user';

/**
 * POST /api/resources/[id]/plagiarism
 *
 * Runs a plagiarism check for a given resource by:
 * - Ensuring the current user owns the workspace that contains the resource
 * - Extracting text from resource.data
 * - Calling an external plagiarism API (configured via env)
 * - Storing score/status/meta back on the Resource record
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabaseUser = await getCurrentUser();
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDb(supabaseUser);

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 401 }
      );
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: { workspace: true },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    if (resource.workspace.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = (resource.data ?? {}) as any;

    const text: string =
      data.text ||
      data.content ||
      data.body ||
      data.notes ||
      '';

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Not enough text available on this resource to run plagiarism check' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.PLAGIARISM_API_URL;
    const apiKey = process.env.PLAGIARISM_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Plagiarism service is not configured on the server' },
        { status: 500 }
      );
    }

    const providerResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text,
        metadata: {
          resourceId: resource.id,
          workspaceId: resource.workspaceId,
          title: resource.title,
        },
      }),
    });

    if (!providerResponse.ok) {
      const errText = await providerResponse.text().catch(() => '');
      console.error('Plagiarism API error', providerResponse.status, errText);

      await prisma.resource.update({
        where: { id: resource.id },
        data: {
          plagiarismStatus: 'error',
        },
      });

      return NextResponse.json(
        { error: 'Plagiarism service failed' },
        { status: 502 }
      );
    }

    const result = await providerResponse.json();

    // Expecting provider result to contain a numeric score; adapt as needed.
    const rawScore = (result.score ?? result.similarity ?? 0) as number;

    // Normalize score to 0–100 range if needed
    const normalizedScore =
      rawScore <= 1 ? rawScore * 100 : rawScore;

    const status =
      normalizedScore >= 30 ? 'flagged' : 'clean'; // Adjust threshold to your preference

    const updated = await prisma.resource.update({
      where: { id: resource.id },
      data: {
        plagiarismScore: normalizedScore,
        plagiarismStatus: status,
        plagiarismMeta: result,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST /api/resources/[id]/plagiarism error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

