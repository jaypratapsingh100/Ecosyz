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

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (!event.isPublic) {
      return NextResponse.json(
        { error: 'Event is not public' },
        { status: 403 }
      );
    }

    // Check if already registered
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId: prismaUser.id,
        },
      },
    });

    if (existingRegistration) {
      if (existingRegistration.status === 'cancelled') {
        // Re-register
        const registration = await prisma.eventRegistration.update({
          where: { id: existingRegistration.id },
          data: { status: 'registered' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        });
        return NextResponse.json(registration);
      }
      return NextResponse.json(
        { error: 'Already registered for this event' },
        { status: 400 }
      );
    }

    // Check max attendees
    if (event.maxAttendees) {
      const currentRegistrations = await prisma.eventRegistration.count({
        where: {
          eventId: id,
          status: 'registered',
        },
      });

      if (currentRegistrations >= event.maxAttendees) {
        return NextResponse.json(
          { error: 'Event is full' },
          { status: 400 }
        );
      }
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        eventId: id,
        userId: prismaUser.id,
        status: 'registered',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        userId: prismaUser.id,
        type: 'event_registered',
        entityType: 'event',
        entityId: id,
        title: `Registered for event "${event.title}"`,
      },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error) {
    console.error('Error registering for event:', error);
    return NextResponse.json(
      { error: 'Failed to register for event' },
      { status: 500 }
    );
  }
}

