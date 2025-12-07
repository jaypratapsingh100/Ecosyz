import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { getCurrentUser } from '../../../../../../src/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId: prismaUser.id,
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Not registered for this event' },
        { status: 400 }
      );
    }

    if (registration.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Registration already cancelled' },
        { status: 400 }
      );
    }

    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    return NextResponse.json(
      { error: 'Failed to cancel registration' },
      { status: 500 }
    );
  }
}

