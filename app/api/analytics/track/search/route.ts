import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser } from '../../../../../src/lib/auth';

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
  } catch (error) {
    console.error('Error tracking search:', error);
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
