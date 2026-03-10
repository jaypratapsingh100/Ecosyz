import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encrypt, decrypt, maskAccountNumber } from '@/lib/payments/encryption';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const fellow = await prisma.internFellow.findUnique({ where: { userId: prismaUser.id } });
    if (!fellow) {
      return NextResponse.json({ error: 'Not enrolled in fellowship' }, { status: 403 });
    }

    const details = await prisma.internPaymentDetails.findUnique({
      where: { fellowId: fellow.id },
    });

    if (!details) {
      return NextResponse.json({ details: null });
    }

    // Mask sensitive fields
    return NextResponse.json({
      details: {
        id: details.id,
        upiId: details.upiId,
        bankName: details.bankName,
        accountNumber: details.accountNumber ? maskAccountNumber(decrypt(details.accountNumber)) : null,
        ifscCode: details.ifscCode,
        accountHolderName: details.accountHolderName,
        isVerified: details.isVerified,
        updatedAt: details.updatedAt,
      },
    });
  } catch (err) {
    console.error('[intern-fellowship/payment-details] GET', err);
    return NextResponse.json({ error: 'Failed to fetch payment details' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const fellow = await prisma.internFellow.findUnique({ where: { userId: prismaUser.id } });
    if (!fellow) {
      return NextResponse.json({ error: 'Not enrolled in fellowship' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const upiId = (body.upiId as string)?.trim() || null;
    const bankName = (body.bankName as string)?.trim() || null;
    const accountNumber = (body.accountNumber as string)?.trim() || null;
    const ifscCode = (body.ifscCode as string)?.trim()?.toUpperCase() || null;
    const accountHolderName = (body.accountHolderName as string)?.trim() || null;

    // Must provide at least UPI or bank details
    if (!upiId && !accountNumber) {
      return NextResponse.json({ error: 'Provide at least a UPI ID or bank account number' }, { status: 400 });
    }

    // Validate UPI format
    if (upiId && !upiId.includes('@')) {
      return NextResponse.json({ error: 'Invalid UPI ID format (expected: username@provider)' }, { status: 400 });
    }

    // Validate IFSC
    if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      return NextResponse.json({ error: 'Invalid IFSC code format' }, { status: 400 });
    }

    // Validate account number
    if (accountNumber && !/^\d{9,18}$/.test(accountNumber)) {
      return NextResponse.json({ error: 'Invalid account number (9-18 digits)' }, { status: 400 });
    }

    // If bank details provided, require all fields
    if (accountNumber && (!ifscCode || !accountHolderName || !bankName)) {
      return NextResponse.json({ error: 'Bank name, IFSC code, and account holder name are required with account number' }, { status: 400 });
    }

    const encryptedAccountNumber = accountNumber ? encrypt(accountNumber) : null;

    const details = await prisma.internPaymentDetails.upsert({
      where: { fellowId: fellow.id },
      create: {
        fellowId: fellow.id,
        upiId,
        bankName,
        accountNumber: encryptedAccountNumber,
        ifscCode,
        accountHolderName,
      },
      update: {
        upiId,
        bankName,
        accountNumber: encryptedAccountNumber,
        ifscCode,
        accountHolderName,
        isVerified: false, // Reset verification on update
      },
    });

    return NextResponse.json({
      details: {
        id: details.id,
        upiId: details.upiId,
        bankName: details.bankName,
        accountNumber: accountNumber ? maskAccountNumber(accountNumber) : null,
        ifscCode: details.ifscCode,
        accountHolderName: details.accountHolderName,
        isVerified: details.isVerified,
        updatedAt: details.updatedAt,
      },
    });
  } catch (err) {
    console.error('[intern-fellowship/payment-details] POST', err);
    return NextResponse.json({ error: 'Failed to save payment details' }, { status: 500 });
  }
}
