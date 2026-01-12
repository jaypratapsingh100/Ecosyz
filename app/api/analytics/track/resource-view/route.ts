import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
    try {
      await prisma.resourceView.create({
        data: {
          resourceId,
          userId: user?.id || null,
          workspaceId: workspaceId || null,
          sessionId: sessionId || null,
        },
      });
      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      // Handle P2021 error (table doesn't exist) gracefully
      if (dbError?.code === 'P2021') {
        console.warn('ResourceView table does not exist. Run migrations: npx prisma migrate deploy');
        return NextResponse.json({ 
          success: false, 
          warning: 'Analytics table not found' 
        });
      }
      console.error('Error tracking resource view:', dbError);
      return NextResponse.json({ success: false });
    }
  } catch (error: any) {
    console.error('Unexpected error in resource view tracking:', error);
    return NextResponse.json({ success: false });
  }
}




