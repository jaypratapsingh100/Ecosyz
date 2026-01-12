import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { getCurrentUser, ensureUserInDb } from '../../../../../src/lib/auth';
import {
  addDomainToVercel,
  getVercelDNSRecords,
  verifyVercelDomain,
} from '../../../../../src/lib/vercel';
import {
  configureGoDaddyDNSForVercel,
  checkGoDaddyAccountEligibility,
  getManualDNSInstructions,
} from '../../../../../src/lib/godaddy';

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

    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      domain,
      godaddyApiKey,
      godaddyApiSecret,
      useYourAccount = true, // Default to using your account
    } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    const project = await prisma.appProject.findUnique({
      where: { id },
      include: {
        files: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    if (!project.deploymentId) {
      return NextResponse.json(
        { error: 'Project must be deployed first' },
        { status: 400 }
      );
    }

    // Get Vercel DNS records needed
    const vercelDNSRecords = await getVercelDNSRecords(domain);

    // Option 1: Use YOUR GoDaddy account (recommended)
    if (useYourAccount || !godaddyApiKey) {
      const yourApiKey = process.env.GODADDY_API_KEY;
      const yourApiSecret = process.env.GODADDY_API_SECRET;

      if (!yourApiKey || !yourApiSecret) {
        return NextResponse.json(
          {
            error: 'GoDaddy API not configured',
            message:
              'Please configure GODADDY_API_KEY and GODADDY_API_SECRET environment variables',
          },
          { status: 500 }
        );
      }

      // Check if your account is eligible
      const eligibility = await checkGoDaddyAccountEligibility(
        yourApiKey,
        yourApiSecret
      );

      if (!eligibility.eligible) {
        return NextResponse.json(
          {
            error: 'GoDaddy account not eligible',
            message: eligibility.reason,
            manualInstructions: getManualDNSInstructions(domain, vercelDNSRecords),
          },
          { status: 400 }
        );
      }

      // Add domain to Vercel first
      const projectName = `app-${project.id.slice(0, 8)}`;
      let vercelDomain;
      try {
        vercelDomain = await addDomainToVercel(project.deploymentId, domain);
      } catch (error: any) {
        return NextResponse.json(
          {
            error: 'Failed to add domain to Vercel',
            message: error.message,
          },
          { status: 500 }
        );
      }

      // Configure DNS via YOUR GoDaddy account
      const dnsResult = await configureGoDaddyDNSForVercel(
        domain,
        yourApiKey,
        yourApiSecret,
        vercelDNSRecords
      );

      if (!dnsResult.success) {
        return NextResponse.json(
          {
            error: 'DNS configuration failed',
            message: dnsResult.error,
            manualInstructions: getManualDNSInstructions(domain, vercelDNSRecords),
          },
          { status: 500 }
        );
      }

      // Verify domain (will happen automatically, but we can trigger it)
      const verification = await verifyVercelDomain(projectName, domain);

      // Update project
      await prisma.appProject.update({
        where: { id },
        data: {
          deploymentUrl: `https://${domain}`,
        },
      });

      return NextResponse.json({
        success: true,
        domain: domain,
        verified: verification.verified,
        message:
          'Domain configured successfully! DNS changes may take a few minutes to propagate. SSL certificate will be issued automatically.',
      });
    }

    // Option 2: Use user's GoDaddy account
    if (!godaddyApiKey || !godaddyApiSecret) {
      return NextResponse.json(
        {
          error: 'GoDaddy API credentials required',
          message:
            'Provide godaddyApiKey and godaddyApiSecret, or set useYourAccount to true',
        },
        { status: 400 }
      );
    }

    // Check user's account eligibility
    const userEligibility = await checkGoDaddyAccountEligibility(
      godaddyApiKey,
      godaddyApiSecret
    );

    if (!userEligibility.eligible) {
      // Add domain to Vercel anyway (they can configure DNS manually)
      const projectName = `app-${project.id.slice(0, 8)}`;
      try {
        await addDomainToVercel(project.deploymentId, domain);
      } catch (error: any) {
        // Continue even if this fails - user can add manually
      }

      return NextResponse.json({
        success: false,
        error: userEligibility.reason,
        domain: domain,
        manualInstructions: getManualDNSInstructions(domain, vercelDNSRecords),
        message:
          'Your GoDaddy account does not qualify for API access. Please configure DNS manually using the instructions below.',
      });
    }

    // User qualifies - automate DNS
    const projectName = `app-${project.id.slice(0, 8)}`;
    const vercelDomain = await addDomainToVercel(project.deploymentId, domain);

    const dnsResult = await configureGoDaddyDNSForVercel(
      domain,
      godaddyApiKey,
      godaddyApiSecret,
      vercelDNSRecords
    );

    if (!dnsResult.success) {
      return NextResponse.json(
        {
          error: 'DNS configuration failed',
          message: dnsResult.error,
          manualInstructions: getManualDNSInstructions(domain, vercelDNSRecords),
        },
        { status: 500 }
      );
    }

    // Verify domain
    const verification = await verifyVercelDomain(projectName, domain);

    // Update project
    await prisma.appProject.update({
      where: { id },
      data: {
        deploymentUrl: `https://${domain}`,
      },
    });

    return NextResponse.json({
      success: true,
      domain: domain,
      verified: verification.verified,
      message:
        'Domain configured successfully! DNS changes may take a few minutes to propagate.',
    });
  } catch (error: any) {
    console.error('Domain deployment error:', error);
    return NextResponse.json(
      {
        error: 'Domain configuration failed',
        message: error.message || 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}





