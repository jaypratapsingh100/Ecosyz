import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
    // Use try-catch around Prisma call to handle table not existing gracefully
    try {
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
    } catch (dbError: unknown) {
      // Handle P2021 error (table doesn't exist) gracefully
      const prismaError = dbError as { code?: string; message?: string };
      if (prismaError?.code === 'P2021') {
        console.warn('PageVisit table does not exist. Run migrations: npx prisma migrate deploy');
        // Return success with warning - don't break the app if analytics table is missing
        // Analytics should never break the user experience
        return NextResponse.json({ 
          success: false, 
          warning: 'Analytics table not found. Run migrations to enable tracking.' 
        });
      }
      // Handle database authentication errors
      if (prismaError?.message?.includes('authentication failed') || prismaError?.code === 'P1001' || prismaError?.code === 'P1000') {
        console.error('Database connection error in analytics:', dbError);
        // Return success: false but with 200 status - analytics failures shouldn't break the app
        return NextResponse.json({ 
          success: false, 
          error: 'Database connection failed. Please check DATABASE_URL and DIRECT_URL in Vercel environment variables.',
          code: 'DATABASE_CONNECTION_ERROR'
        });
      }
      // Handle other Prisma errors gracefully
      console.error('Error tracking page visit:', dbError);
      // Return success: false but with 200 status - analytics failures shouldn't break the app
      return NextResponse.json({ 
        success: false, 
        error: 'Tracking failed' 
      });
    }
  } catch (error: unknown) {
    console.error('Unexpected error in visit tracking:', error);
    // Don't fail the request if tracking fails - analytics should never break the app
    return NextResponse.json({ 
      success: false, 
      error: 'Tracking failed' 
    });
  }
}




