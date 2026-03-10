import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encrypt, maskAccountNumber, decrypt } from '@/lib/payments/encryption';

/**
 * GET: Return the partner's current payout details (masked)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partner = await prisma.partnershipApplication.findFirst({
      where: { email: user.email.toLowerCase(), status: 'approved' },
      select: {
        id: true,
        payoutVpa: true,
        payoutAccountNumber: true,
        payoutIfsc: true,
        payoutBeneficiaryName: true,
        payoutBankName: true,
      },
    });

    if (!partner) {
      return NextResponse.json({ error: 'No approved partnership found' }, { status: 404 });
    }

    return NextResponse.json({
      payoutVpa: partner.payoutVpa || null,
      payoutAccountNumber: partner.payoutAccountNumber
        ? maskAccountNumber(decrypt(partner.payoutAccountNumber))
        : null,
      payoutIfsc: partner.payoutIfsc || null,
      payoutBeneficiaryName: partner.payoutBeneficiaryName || null,
      payoutBankName: partner.payoutBankName || null,
      hasPayoutDetails: !!(partner.payoutVpa || partner.payoutAccountNumber),
    });
  } catch (error) {
    console.error('Error fetching payout details:', error);
    return NextResponse.json({ error: 'Failed to fetch payout details' }, { status: 500 });
  }
}

/**
 * POST: Save/update payout details (UPI or bank account)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const partner = await prisma.partnershipApplication.findFirst({
      where: { email: user.email.toLowerCase(), status: 'approved' },
    });

    if (!partner) {
      return NextResponse.json({ error: 'No approved partnership found' }, { status: 404 });
    }

    const { vpa, accountNumber, ifsc, beneficiaryName, bankName } = await req.json();

    // Validate: must provide either UPI or bank details
    if (!vpa && !accountNumber) {
      return NextResponse.json({ error: 'Provide either UPI ID or bank account details' }, { status: 400 });
    }

    if (accountNumber && !ifsc) {
      return NextResponse.json({ error: 'IFSC code is required for bank transfer' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      // Clear cached Razorpay fund account when details change
      razorpayFundAccountId: null,
    };

    if (vpa) {
      updateData.payoutVpa = vpa.trim();
      // Clear bank details if switching to UPI
      updateData.payoutAccountNumber = null;
      updateData.payoutIfsc = null;
      updateData.payoutBeneficiaryName = beneficiaryName?.trim() || partner.name;
      updateData.payoutBankName = null;
    } else {
      updateData.payoutAccountNumber = encrypt(accountNumber.trim());
      updateData.payoutIfsc = ifsc.trim().toUpperCase();
      updateData.payoutBeneficiaryName = beneficiaryName?.trim() || partner.name;
      updateData.payoutBankName = bankName?.trim() || null;
      // Clear UPI if switching to bank
      updateData.payoutVpa = null;
    }

    await prisma.partnershipApplication.update({
      where: { id: partner.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: 'Payout details saved' });
  } catch (error) {
    console.error('Error saving payout details:', error);
    return NextResponse.json({ error: 'Failed to save payout details' }, { status: 500 });
  }
}
