import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    
    const { 
      query, 
      resourceType, 
      resultCount, 
      clicked, 
      clickedResourceId, 
      providers,
      sessionId 
    } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Create search log record
    try {
      await prisma.searchLog.create({
        data: {
          userId: user?.id || null,
          query: query.trim(),
          resourceType: resourceType || null,
          resultCount: resultCount || 0,
          clicked: clicked || false,
          clickedResourceId: clickedResourceId || null,
          providers: providers || [],
          sessionId: sessionId || null,
        },
      });
      return NextResponse.json({ success: true });
    } catch (dbError: unknown) {
      // Handle P2021 error (table doesn't exist) gracefully
      const prismaError = dbError as { code?: string };
      if (prismaError?.code === 'P2021') {
        console.warn('SearchLog table does not exist. Run migrations: npx prisma migrate deploy');
        return NextResponse.json({ 
          success: false, 
          warning: 'Analytics table not found' 
        });
      }
      console.error('Error tracking search:', dbError);
      return NextResponse.json({ success: false });
    }
  } catch (error: unknown) {
    console.error('Unexpected error in search tracking:', error);
    return NextResponse.json({ success: false });
  }
}




