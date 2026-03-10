import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { decrypt, maskAccountNumber } from '@/lib/payments/encryption';
import { notifyPayoutProcessed } from '@/lib/payments/stipend-emails';
import {
  createContact,
  createFundAccountBank,
  createFundAccountVpa,
  createPayout,
} from '@/lib/payments/razorpay-x';

/**
 * GET: List all payouts with filters
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const fellowId = searchParams.get('fellowId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (fellowId) where.fellowId = fellowId;

    const [payouts, total] = await Promise.all([
      prisma.stipendPayout.findMany({
        where,
        include: {
          fellow: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              paymentDetails: true,
            },
          },
          task: { select: { id: true, title: true } },
          milestone: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stipendPayout.count({ where }),
    ]);

    // Mask payment details in response
    const mapped = payouts.map((p) => {
      const pd = p.fellow.paymentDetails;
      return {
        ...p,
        fellow: {
          ...p.fellow,
          paymentDetails: pd
            ? {
                upiId: pd.upiId,
                bankName: pd.bankName,
                accountNumber: pd.accountNumber ? maskAccountNumber(decrypt(pd.accountNumber)) : null,
                ifscCode: pd.ifscCode,
                accountHolderName: pd.accountHolderName,
                isVerified: pd.isVerified,
              }
            : null,
        },
      };
    });

    return NextResponse.json({ payouts: mapped, total, page, limit });
  } catch (err) {
    console.error('[admin/interns/payouts] GET', err);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

/**
 * POST: Update payout status (mark as paid/failed)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const payoutId = (body.payoutId as string)?.trim();
    const action = (body.action as string)?.trim(); // mark_paid, mark_failed
    const transactionRef = (body.transactionRef as string)?.trim() || null;
    const failureReason = (body.failureReason as string)?.trim() || null;
    const paymentMethod = (body.paymentMethod as string)?.trim() || null;
    const notes = (body.notes as string)?.trim() || null;

    if (!payoutId || !action) {
      return NextResponse.json({ error: 'payoutId and action are required' }, { status: 400 });
    }
    if (!['mark_paid', 'mark_failed', 'send_razorpay_x'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use: mark_paid, mark_failed, send_razorpay_x' }, { status: 400 });
    }

    const payout = await prisma.stipendPayout.findUnique({
      where: { id: payoutId },
      include: {
        fellow: {
          include: {
            user: true,
            paymentDetails: true,
          },
        },
      },
    });
    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }
    if (payout.status === 'paid') {
      return NextResponse.json({ error: 'Payout already marked as paid' }, { status: 400 });
    }

    // Razorpay X automated payout
    if (action === 'send_razorpay_x') {
      if (!process.env.RAZORPAY_X_ACCOUNT_NUMBER) {
        return NextResponse.json({ error: 'Razorpay X not configured. Set RAZORPAY_X_ACCOUNT_NUMBER.' }, { status: 400 });
      }

      const pd = payout.fellow.paymentDetails;
      if (!pd || (!pd.upiId && !pd.accountNumber)) {
        return NextResponse.json({ error: 'Intern has no payment details. Ask them to add UPI or bank info.' }, { status: 400 });
      }

      try {
        // Step 1: Create or reuse Razorpay contact
        let contactId = pd.razorpayContactId;
        if (!contactId) {
          contactId = await createContact(
            payout.fellow.user.name || payout.fellow.user.email.split('@')[0],
            payout.fellow.user.email
          );
          await prisma.internPaymentDetails.update({
            where: { id: pd.id },
            data: { razorpayContactId: contactId },
          });
        }

        // Step 2: Create or reuse fund account
        let fundAccountId = pd.razorpayFundAcctId;
        if (!fundAccountId) {
          if (pd.upiId) {
            fundAccountId = await createFundAccountVpa(contactId, pd.upiId);
          } else if (pd.accountNumber && pd.ifscCode && pd.accountHolderName) {
            const rawAcctNum = decrypt(pd.accountNumber);
            fundAccountId = await createFundAccountBank(
              contactId,
              pd.accountHolderName,
              rawAcctNum,
              pd.ifscCode
            );
          } else {
            return NextResponse.json({ error: 'Incomplete bank details. IFSC and holder name required.' }, { status: 400 });
          }
          await prisma.internPaymentDetails.update({
            where: { id: pd.id },
            data: { razorpayFundAcctId: fundAccountId },
          });
        }

        // Step 3: Create payout
        const mode = pd.upiId ? 'UPI' as const : 'IMPS' as const;
        const result = await createPayout(
          fundAccountId,
          payout.amount * 100, // Convert rupees to paise
          `stipend_${payout.id}`,
          mode,
          `Stipend payout - ${payout.fellow.user.name || 'Intern'}`
        );

        // Step 4: Update our record
        const updated = await prisma.stipendPayout.update({
          where: { id: payoutId },
          data: {
            status: 'processing',
            paymentMethod: 'razorpay_x',
            razorpayPayoutId: result.id,
            approvedBy: user.email,
            notes: `Razorpay X payout initiated. Status: ${result.status}`,
          },
        });

        return NextResponse.json({ success: true, payout: updated, razorpayStatus: result.status });
      } catch (err) {
        console.error('[admin/interns/payouts] Razorpay X error:', err);
        const msg = err instanceof Error ? err.message : 'Razorpay X payout failed';
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    if (action === 'mark_paid') {
      const updated = await prisma.stipendPayout.update({
        where: { id: payoutId },
        data: {
          status: 'paid',
          transactionRef,
          paymentMethod: paymentMethod || 'bank_transfer',
          paidAt: new Date(),
          approvedBy: user.email,
          notes,
        },
      });

      const fellowEmail = payout.fellow.user.email;
      const fellowName = payout.fellow.user.name || fellowEmail.split('@')[0];
      notifyPayoutProcessed(fellowEmail, fellowName, payout.amount, transactionRef).catch(console.error);

      return NextResponse.json({ success: true, payout: updated });
    } else {
      const updated = await prisma.stipendPayout.update({
        where: { id: payoutId },
        data: {
          status: 'failed',
          failureReason: failureReason || 'Marked as failed by admin',
          failedAt: new Date(),
          notes,
        },
      });
      return NextResponse.json({ success: true, payout: updated });
    }
  } catch (err) {
    console.error('[admin/interns/payouts] POST', err);
    return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 });
  }
}
