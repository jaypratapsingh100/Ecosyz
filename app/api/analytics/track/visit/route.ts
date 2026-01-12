import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser } from '../../../../../src/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    
    const { path, referrer, userAgent, sessionId } = body;
    
    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    // Get IP address from request headers
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Create page visit record
    await prisma.pageVisit.create({
      data: {
        userId: user?.id || null,
        path,
        referrer: referrer || null,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        sessionId: sessionId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking page visit:', error);
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: false }, { status: 500 });
  }
}




