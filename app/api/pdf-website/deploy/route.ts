import { NextRequest, NextResponse } from 'next/server';
import { deployToVercel, getClaimableDeploymentUrl } from '@/lib/vercel';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const html = body.html as string | undefined;
    const title = (body.title as string | undefined)?.trim() || 'PDF Website';

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'HTML content is required (field: html)' },
        { status: 400 },
      );
    }

    const slug = title
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .slice(0, 30) || 'site';
    const projectName = `pdf-website-${slug}-${Date.now().toString(36)}`;

    const vercelJson = JSON.stringify(
      { version: 2, builds: [{ src: '**/*', use: '@vercel/static' }] },
      null,
      2,
    );

    const result = await deployToVercel({
      files: [
        { path: 'index.html', content: html },
        { path: 'vercel.json', content: vercelJson },
      ],
      projectName,
      framework: 'html',
    });

    const liveUrl = result.url.startsWith('http') ? result.url : `https://${result.url}`;
    const claimUrl = getClaimableDeploymentUrl(result.deploymentId);

    return NextResponse.json({
      url: liveUrl,
      claimUrl,
      deploymentId: result.deploymentId,
      readyState: result.readyState,
    });
  } catch (error) {
    console.error('[pdf-website/deploy] Error:', error);
    const message = error instanceof Error ? error.message : 'Deployment failed';
    const hint = !process.env.VERCEL_API_TOKEN
      ? 'Set VERCEL_API_TOKEN to enable deploy.'
      : undefined;
    return NextResponse.json(
      { error: message, hint },
      { status: 500 },
    );
  }
}
