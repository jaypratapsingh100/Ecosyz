import crypto from 'crypto';

const TOKEN_EXPIRY_HOURS = 1;

function getSecret(serviceKey: string): string {
  return crypto
    .createHash('sha256')
    .update(`reset-password-${serviceKey}`)
    .digest('hex');
}

export function generateResetToken(
  email: string,
  userId: string,
  serviceKey: string
): string {
  const payload = {
    email,
    userId,
    exp: Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSecret(serviceKey))
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Verify a reset token. Returns the payload or null if invalid/expired.
 */
export function verifyResetToken(
  token: string,
  serviceKey: string
): { email: string; userId: string } | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;

    const expectedSig = crypto
      .createHmac('sha256', getSecret(serviceKey))
      .update(data)
      .digest('base64url');

    if (sig !== expectedSig) return null;

    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf-8')
    );

    if (!payload.email || !payload.userId || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;

    return { email: payload.email, userId: payload.userId };
  } catch {
    return null;
  }
}
