import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser } from '../../../../../src/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    
    const { resourceId, workspaceId, sessionId } = body;
    
    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      );
    }

    // Verify resource exists
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Create resource view record
    await prisma.resourceView.create({
      data: {
        resourceId,
        userId: user?.id || null,
        workspaceId: workspaceId || null,
        sessionId: sessionId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking resource view:', error);
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
