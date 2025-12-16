/**
 * Vercel API utilities for deployment and domain management
 */

interface VercelDeploymentOptions {
  files: Array<{ path: string; content: string }>;
  projectName: string;
  framework?: string;
}

/**
 * Map common framework names to Vercel's allowed framework values
 */
function mapFrameworkToVercel(framework?: string): string | null {
  if (!framework) return null;
  
  const frameworkLower = framework.toLowerCase().trim();
  
  // Vercel allowed frameworks (from API docs)
  const frameworkMap: Record<string, string> = {
    // React frameworks
    'react': 'create-react-app',
    'reactjs': 'create-react-app',
    'create-react-app': 'create-react-app',
    'nextjs': 'nextjs',
    'next': 'nextjs',
    'next.js': 'nextjs',
    'gatsby': 'gatsby',
    'remix': 'remix',
    'react-router': 'react-router',
    'preact': 'preact',
    'ionic-react': 'ionic-react',
    
    // Vue frameworks
    'vue': 'vue',
    'vuejs': 'vue',
    'nuxt': 'nuxtjs',
    'nuxtjs': 'nuxtjs',
    'gridsome': 'gridsome',
    
    // Svelte frameworks
    'svelte': 'svelte',
    'sveltekit': 'sveltekit',
    'sveltekit-1': 'sveltekit-1',
    
    // Angular frameworks
    'angular': 'angular',
    'ionic-angular': 'ionic-angular',
    'scully': 'scully',
    
    // Static site generators
    'astro': 'astro',
    'hexo': 'hexo',
    'eleventy': 'eleventy',
    '11ty': 'eleventy',
    'docusaurus': 'docusaurus',
    'docusaurus-2': 'docusaurus-2',
    'hugo': 'hugo',
    'jekyll': 'jekyll',
    'vitepress': 'vitepress',
    'vuepress': 'vuepress',
    
    // Build tools
    'vite': 'vite',
    'parcel': 'parcel',
    'hydrogen': 'hydrogen',
    'tanstack-start': 'tanstack-start',
    
    // Other frameworks
    'blitzjs': 'blitzjs',
    'solidstart': 'solidstart',
    'solidstart-1': 'solidstart-1',
    'dojo': 'dojo',
    'ember': 'ember',
    'polymer': 'polymer',
    'umijs': 'umijs',
    'sapper': 'sapper',
    'saber': 'saber',
    'stencil': 'stencil',
    'redwoodjs': 'redwoodjs',
    'brunch': 'brunch',
    'middleman': 'middleman',
    'zola': 'zola',
    
    // Backend frameworks
    'fastapi': 'fastapi',
    'flask': 'flask',
    'fasthtml': 'fasthtml',
    'sanity': 'sanity',
    'sanity-v3': 'sanity-v3',
    'storybook': 'storybook',
    'nitro': 'nitro',
    'hono': 'hono',
    'express': 'express',
    'h3': 'h3',
    'nestjs': 'nestjs',
    'elysia': 'elysia',
    'fastify': 'fastify',
    'xmcp': 'xmcp',
  };
  
  // Check exact match first
  if (frameworkMap[frameworkLower]) {
    return frameworkMap[frameworkLower];
  }
  
  // Check partial matches
  for (const [key, value] of Object.entries(frameworkMap)) {
    if (frameworkLower.includes(key) || key.includes(frameworkLower)) {
      return value;
    }
  }
  
  // For static HTML sites (no framework detected), return null
  // Vercel will auto-detect or use null for static sites
  return null;
}

interface VercelDeploymentResponse {
  url: string;
  deploymentId: string;
  readyState: string;
  createdAt: number;
}

interface VercelDomainResponse {
  name: string;
  verified: boolean;
  verification?: Array<{ type: string; domain: string; value: string }>;
  nameservers?: string[];
}

/**
 * Deploy static files to Vercel
 */
export async function deployToVercel(
  options: VercelDeploymentOptions
): Promise<VercelDeploymentResponse> {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID; // Optional

  if (!vercelToken) {
    throw new Error('VERCEL_API_TOKEN is not configured');
  }

  // Prepare files for Vercel API
  // Vercel expects files as an array of objects with 'file' (path) and 'data' (content) properties
  const filesArray = options.files.map((file) => ({
    file: file.path,
    data: file.content,
  }));

  console.log(`Preparing ${filesArray.length} files for Vercel deployment`);

  // Create deployment
  const deploymentUrl = vercelTeamId
    ? `https://api.vercel.com/v13/deployments?teamId=${vercelTeamId}`
    : 'https://api.vercel.com/v13/deployments';

  // Map framework to Vercel's allowed values
  // For static sites (pre-built HTML/JS), we use null to disable build
  const vercelFramework = mapFrameworkToVercel(options.framework);
  
  // Check if this is a static site (has index.html with inline React/CDN scripts or vercel.json)
  const hasStaticHtml = filesArray.some(f => f.file === 'index.html' && f.data.includes('unpkg.com/react'));
  const hasVercelJson = filesArray.some(f => f.file === 'vercel.json');
  
  // For static sites, disable build and use null framework
  // If vercel.json exists, it will override projectSettings
  const finalFramework = (hasStaticHtml || hasVercelJson) ? null : vercelFramework;
  
  const requestBody = {
    name: options.projectName,
    files: filesArray,
    projectSettings: {
      framework: finalFramework,
      // Disable build for static sites - files are already built
      // vercel.json will also help ensure no build is attempted
      buildCommand: null,
      outputDirectory: null,
      installCommand: null,
      devCommand: null,
    },
    target: 'production',
  };
  
  console.log(`Framework mapping: "${options.framework}" -> "${vercelFramework}" -> "${finalFramework}" (static: ${hasStaticHtml}, has vercel.json: ${hasVercelJson})`);

  console.log(`Deploying to Vercel: ${options.projectName} with ${filesArray.length} files`);

  const response = await fetch(deploymentUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = 'Unknown error';
    let errorDetails: any = {};
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || response.statusText;
      errorDetails = errorData;
      
      // Log detailed error for debugging
      console.error('Vercel API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
    } catch (parseError) {
      // If JSON parsing fails, try to get text
      try {
        const textError = await response.text();
        errorMessage = textError || response.statusText;
        console.error('Vercel API error (text):', textError);
      } catch (textError) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    }
    
    // Provide helpful error messages based on status code
    if (response.status === 401) {
      throw new Error(`Vercel API authentication failed. Please check your VERCEL_API_TOKEN is valid. Status: ${response.status}`);
    } else if (response.status === 403) {
      throw new Error(`Vercel API access forbidden. Your token may not have deployment permissions. Status: ${response.status}`);
    } else if (response.status === 400) {
      throw new Error(`Vercel API bad request: ${errorMessage}. Check your deployment configuration.`);
    } else if (response.status === 404) {
      throw new Error(`Vercel API endpoint not found. This might be a temporary issue. Status: ${response.status}`);
    } else {
      throw new Error(`Vercel deployment failed (${response.status}): ${errorMessage}`);
    }
  }

  const deployment = await response.json();

  return {
    url: deployment.url,
    deploymentId: deployment.id || deployment.uid,
    readyState: deployment.readyState || 'QUEUED',
    createdAt: deployment.createdAt || Date.now(),
  };
}

/**
 * Generate claimable deployment URL
 */
export function getClaimableDeploymentUrl(deploymentId: string): string {
  return `https://vercel.com/claim/${deploymentId}`;
}

/**
 * Add custom domain to Vercel deployment
 */
export async function addDomainToVercel(
  deploymentId: string,
  domain: string
): Promise<VercelDomainResponse> {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken) {
    throw new Error('VERCEL_API_TOKEN is not configured');
  }

  // First, get the project name from deployment
  const deploymentResponse = await fetch(
    `https://api.vercel.com/v13/deployments/${deploymentId}`,
    {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    }
  );

  if (!deploymentResponse.ok) {
    throw new Error('Failed to fetch deployment details');
  }

  const deployment = await deploymentResponse.json();
  const projectName = deployment.name || deployment.project;

  // Add domain to project
  const addDomainUrl = vercelTeamId
    ? `https://api.vercel.com/v10/projects/${projectName}/domains?teamId=${vercelTeamId}`
    : `https://api.vercel.com/v10/projects/${projectName}/domains`;

  const response = await fetch(addDomainUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: domain,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Failed to add domain: ${error.message || response.statusText}`);
  }

  const domainData = await response.json();

  return {
    name: domainData.name || domain,
    verified: domainData.verified || false,
    verification: domainData.verification || [],
    nameservers: domainData.nameservers || [],
  };
}

/**
 * Get DNS records needed for Vercel domain
 */
export async function getVercelDNSRecords(domain: string): Promise<{
  apex: { type: 'A'; name: string; value: string };
  www: { type: 'CNAME'; name: string; value: string };
}> {
  // Vercel DNS records are standard
  return {
    apex: {
      type: 'A',
      name: '@',
      value: '76.76.21.21',
    },
    www: {
      type: 'CNAME',
      name: 'www',
      value: 'cname.vercel-dns.com',
    },
  };
}

/**
 * Verify domain on Vercel
 */
export async function verifyVercelDomain(
  projectName: string,
  domain: string
): Promise<{ verified: boolean; error?: string }> {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;

  if (!vercelToken) {
    throw new Error('VERCEL_API_TOKEN is not configured');
  }

  const verifyUrl = vercelTeamId
    ? `https://api.vercel.com/v10/projects/${projectName}/domains/${domain}/verify?teamId=${vercelTeamId}`
    : `https://api.vercel.com/v10/projects/${projectName}/domains/${domain}/verify`;

  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    return {
      verified: false,
      error: error.message || 'Domain verification failed',
    };
  }

  const result = await response.json();

  return {
    verified: result.verified || false,
  };
}

