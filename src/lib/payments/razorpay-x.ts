/**
 * Razorpay X — Payout API
 *
 * Uses the same RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET as the standard Razorpay SDK.
 * Requires RAZORPAY_X_ACCOUNT_NUMBER for the source account.
 *
 * Docs: https://razorpay.com/docs/api/x/payouts/
 */

const BASE_URL = 'https://api.razorpay.com/v1';

function getAuth(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured.');
  }
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

function getAccountNumber(): string {
  const acct = process.env.RAZORPAY_X_ACCOUNT_NUMBER;
  if (!acct) throw new Error('RAZORPAY_X_ACCOUNT_NUMBER not configured.');
  return acct;
}

async function rzpFetch(path: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: getAuth(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = (data as { error?: { description?: string } }).error?.description || res.statusText;
    throw new Error(`Razorpay X error (${res.status}): ${errMsg}`);
  }
  return data as Record<string, unknown>;
}

/**
 * Create a Razorpay X contact (the person who receives the payout).
 */
export async function createContact(name: string, email: string, phone?: string): Promise<string> {
  const body: Record<string, unknown> = {
    name,
    email,
    type: 'employee',
  };
  if (phone) body.contact = phone;

  const data = await rzpFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.id as string;
}

/**
 * Create a fund account (bank account) linked to a contact.
 */
export async function createFundAccountBank(
  contactId: string,
  accountName: string,
  accountNumber: string,
  ifsc: string
): Promise<string> {
  const data = await rzpFetch('/fund_accounts', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      account_type: 'bank_account',
      bank_account: {
        name: accountName,
        ifsc,
        account_number: accountNumber,
      },
    }),
  });
  return data.id as string;
}

/**
 * Create a fund account (UPI VPA) linked to a contact.
 */
export async function createFundAccountVpa(
  contactId: string,
  vpaAddress: string
): Promise<string> {
  const data = await rzpFetch('/fund_accounts', {
    method: 'POST',
    body: JSON.stringify({
      contact_id: contactId,
      account_type: 'vpa',
      vpa: { address: vpaAddress },
    }),
  });
  return data.id as string;
}

/**
 * Create a payout to a fund account.
 * mode: NEFT, RTGS, IMPS, or UPI
 */
export async function createPayout(
  fundAccountId: string,
  amountInPaise: number,
  referenceId: string,
  mode: 'NEFT' | 'IMPS' | 'RTGS' | 'UPI' = 'IMPS',
  narration?: string
): Promise<{ id: string; status: string }> {
  const data = await rzpFetch('/payouts', {
    method: 'POST',
    body: JSON.stringify({
      account_number: getAccountNumber(),
      fund_account_id: fundAccountId,
      amount: amountInPaise,
      currency: 'INR',
      mode,
      purpose: 'payout',
      queue_if_low_balance: true,
      reference_id: referenceId,
      narration: narration || 'Intern stipend payout',
    }),
  });
  return { id: data.id as string, status: data.status as string };
}

/**
 * Get payout status by ID.
 */
export async function getPayoutStatus(payoutId: string): Promise<{ status: string; utr: string | null }> {
  const data = await rzpFetch(`/payouts/${payoutId}`, { method: 'GET' });
  return {
    status: data.status as string,
    utr: (data.utr as string) || null,
  };
}

// ---------------------------------------------------------------------------
// Affiliate partner helpers
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/payments/encryption';

/**
 * Ensure a Razorpay X Contact + Fund Account exist for an affiliate partner.
 * Creates them if missing and caches the IDs on the PartnershipApplication record.
 */
export async function ensurePartnerRazorpaySetup(partnershipId: string): Promise<{
  contactId: string;
  fundAccountId: string;
}> {
  const partner = await prisma.partnershipApplication.findUnique({
    where: { id: partnershipId },
  });
  if (!partner) throw new Error('Partner not found');

  // Step 1: Ensure Contact exists
  let contactId = partner.razorpayContactId;
  if (!contactId) {
    contactId = await createContact(
      partner.payoutBeneficiaryName || partner.name,
      partner.email
    );
    await prisma.partnershipApplication.update({
      where: { id: partnershipId },
      data: { razorpayContactId: contactId },
    });
  }

  // Step 2: Ensure Fund Account exists
  let fundAccountId = partner.razorpayFundAccountId;
  if (!fundAccountId) {
    if (partner.payoutVpa) {
      fundAccountId = await createFundAccountVpa(contactId, partner.payoutVpa);
    } else if (partner.payoutAccountNumber && partner.payoutIfsc) {
      const decryptedAccount = decrypt(partner.payoutAccountNumber);
      fundAccountId = await createFundAccountBank(
        contactId,
        partner.payoutBeneficiaryName || partner.name,
        decryptedAccount,
        partner.payoutIfsc
      );
    } else {
      throw new Error('Partner has no payout details (UPI or bank account) configured');
    }
    await prisma.partnershipApplication.update({
      where: { id: partnershipId },
      data: { razorpayFundAccountId: fundAccountId },
    });
  }

  return { contactId, fundAccountId };
}
