/**
 * GoDaddy API utilities for DNS management
 */

interface DNSRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'MX' | 'NS';
  name: string;
  data: string;
  ttl: number;
  priority?: number;
}

interface GoDaddyAccountInfo {
  eligible: boolean;
  reason?: string;
  domainCount?: number;
}

/**
 * Check if GoDaddy account is eligible for API access
 * Requires: 10+ domains OR Discount Domain Club subscription
 */
export async function checkGoDaddyAccountEligibility(
  apiKey: string,
  apiSecret: string
): Promise<GoDaddyAccountInfo> {
  try {
    // Try to get domains list
    const response = await fetch('https://api.godaddy.com/v1/domains', {
      headers: {
        'Authorization': `sso-key ${apiKey}:${apiSecret}`,
        'Accept': 'application/json',
      },
    });

    // 403 Forbidden means API access is restricted
    if (response.status === 403) {
      return {
        eligible: false,
        reason: 'API access requires 10+ domains or Discount Domain Club subscription',
      };
    }

    if (!response.ok) {
      return {
        eligible: false,
        reason: `API request failed: ${response.statusText}`,
      };
    }

    const domains = await response.json();
    const domainCount = Array.isArray(domains) ? domains.length : 0;

    // Check if account qualifies (10+ domains)
    if (domainCount >= 10) {
      return {
        eligible: true,
        domainCount,
      };
    }

    // Note: Checking for DDC subscription requires additional API calls
    // For now, we'll assume if they have < 10 domains, they need DDC
    return {
      eligible: false,
      reason: `Account has ${domainCount} domains. Need 10+ domains or Discount Domain Club subscription.`,
      domainCount,
    };
  } catch (error: any) {
    return {
      eligible: false,
      reason: `Unable to verify account eligibility: ${error.message}`,
    };
  }
}

/**
 * Get existing DNS records for a domain
 */
export async function getGoDaddyDNSRecords(
  domain: string,
  apiKey: string,
  apiSecret: string
): Promise<DNSRecord[]> {
  const response = await fetch(
    `https://api.godaddy.com/v1/domains/${domain}/records`,
    {
      headers: {
        'Authorization': `sso-key ${apiKey}:${apiSecret}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to fetch DNS records: ${error.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * Update DNS records for a domain
 */
export async function updateGoDaddyDNSRecords(
  domain: string,
  apiKey: string,
  apiSecret: string,
  records: DNSRecord[]
): Promise<void> {
  const response = await fetch(
    `https://api.godaddy.com/v1/domains/${domain}/records`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `sso-key ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(records),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to update DNS records: ${error.message || response.statusText}`);
  }
}

/**
 * Configure DNS records for Vercel deployment
 */
export async function configureGoDaddyDNSForVercel(
  domain: string,
  apiKey: string,
  apiSecret: string,
  vercelDNSRecords: {
    apex: { type: 'A'; name: string; value: string };
    www: { type: 'CNAME'; name: string; value: string };
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check eligibility first
    const eligibility = await checkGoDaddyAccountEligibility(apiKey, apiSecret);

    if (!eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reason,
      };
    }

    // Get existing DNS records
    const existingRecords = await getGoDaddyDNSRecords(domain, apiKey, apiSecret);

    // Filter out conflicting records (A record for @ and CNAME for www)
    const filteredRecords = existingRecords.filter((record) => {
      // Keep records that don't conflict
      if (record.name === '@' && record.type === 'A') return false;
      if (record.name === 'www' && record.type === 'CNAME') return false;
      return true;
    });

    // Prepare new DNS records
    const newRecords: DNSRecord[] = [
      // A record for apex domain
      {
        type: 'A',
        name: '@',
        data: vercelDNSRecords.apex.value,
        ttl: 3600,
      },
      // CNAME for www subdomain
      {
        type: 'CNAME',
        name: 'www',
        data: vercelDNSRecords.www.value,
        ttl: 3600,
      },
      // Keep existing non-conflicting records
      ...filteredRecords,
    ];

    // Update DNS records
    await updateGoDaddyDNSRecords(domain, apiKey, apiSecret, newRecords);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to configure DNS',
    };
  }
}

/**
 * Get manual DNS instructions for users who can't use API
 */
export function getManualDNSInstructions(domain: string, vercelDNSRecords: {
  apex: { type: 'A'; name: string; value: string };
  www: { type: 'CNAME'; name: string; value: string };
}): string {
  return `
To configure your domain ${domain} for Vercel:

1. Log in to your GoDaddy account
2. Go to Domain Management → DNS Settings
3. Add/Update the following DNS records:

A Record (for apex domain):
  - Type: A
  - Name: @
  - Value: ${vercelDNSRecords.apex.value}
  - TTL: 3600

CNAME Record (for www subdomain):
  - Type: CNAME
  - Name: www
  - Value: ${vercelDNSRecords.www.value}
  - TTL: 3600

4. Save changes
5. Wait 5-10 minutes for DNS propagation
6. Vercel will automatically verify and issue SSL certificate

Note: DNS changes can take up to 24 hours to propagate globally.
  `.trim();
}





