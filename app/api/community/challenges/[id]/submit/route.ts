import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { getCurrentUser } from '../../../../../../src/lib/auth';
import { CreateChallengeSubmission } from '../../../../../../src/lib/validation';

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
    const body = await req.json();
    const parse = CreateChallengeSubmission.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parse.error.message },
        { status: 400 }
      );
    }

    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    if (challenge.status !== 'active') {
      return NextResponse.json(
        { error: 'Challenge is not accepting submissions' },
        { status: 400 }
      );
    }

    const now = new Date();
    if (now < challenge.startDate || now > challenge.endDate) {
      return NextResponse.json(
        { error: 'Challenge submission period has ended or not started' },
        { status: 400 }
      );
    }

    // Check if already submitted
    const existingSubmission = await prisma.challengeSubmission.findUnique({
      where: {
        challengeId_userId: {
          challengeId: id,
          userId: prismaUser.id,
        },
      },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'Already submitted to this challenge' },
        { status: 400 }
      );
    }

    const submission = await prisma.challengeSubmission.create({
      data: {
        challengeId: id,
        userId: prismaUser.id,
        title: parse.data.title,
        description: parse.data.description,
        url: parse.data.url,
        status: 'submitted',
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
        type: 'challenge_submitted',
        entityType: 'challenge',
        entityId: id,
        title: `Submitted to challenge "${challenge.title}"`,
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error('Error submitting to challenge:', error);
    return NextResponse.json(
      { error: 'Failed to submit to challenge' },
      { status: 500 }
    );
  }
}

