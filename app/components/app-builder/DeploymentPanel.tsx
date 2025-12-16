'use client';

import { useState } from 'react';

interface DeploymentPanelProps {
  projectId: string;
  projectName: string;
}

export default function DeploymentPanel({ projectId, projectName }: DeploymentPanelProps) {
  const [deploying, setDeploying] = useState<'vercel' | 'github' | 'firebase' | 'domain' | null>(null);
  const [vercelToken, setVercelToken] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [repositoryName, setRepositoryName] = useState('');
  const [vercelProjectName, setVercelProjectName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [godaddyApiKey, setGodaddyApiKey] = useState('');
  const [godaddyApiSecret, setGodaddyApiSecret] = useState('');
  const [useYourAccount, setUseYourAccount] = useState(true);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVercelDeploy = async () => {
    setDeploying('vercel');
    setError(null);
    setDeploymentResult(null);

    try {
      // Use new endpoint - no token needed (uses server-side VERCEL_API_TOKEN)
      const response = await fetch(`/api/app-projects/${projectId}/deploy-vercel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to deploy to Vercel');
      }

      setDeploymentResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to deploy to Vercel');
    } finally {
      setDeploying(null);
    }
  };

  const handleDomainDeploy = async () => {
    if (!customDomain) {
      setError('Please enter a domain name');
      return;
    }

    setDeploying('domain');
    setError(null);

    try {
      const response = await fetch(`/api/app-projects/${projectId}/deploy-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: customDomain,
          useYourAccount: useYourAccount,
          godaddyApiKey: useYourAccount ? undefined : godaddyApiKey,
          godaddyApiSecret: useYourAccount ? undefined : godaddyApiSecret,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to configure domain');
      }

      if (data.success) {
        setDeploymentResult({
          ...deploymentResult,
          domain: data.domain,
          domainConfigured: true,
          domainMessage: data.message,
        });
      } else {
        // Show manual instructions
        setDeploymentResult({
          ...deploymentResult,
          domain: data.domain,
          domainConfigured: false,
          manualInstructions: data.manualInstructions,
          domainError: data.error,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to configure domain');
    } finally {
      setDeploying('domain');
    }
  };

  const handleGitHubPagesDeploy = async () => {
    if (!githubToken) {
      setError('Please enter your GitHub token');
      return;
    }

    setDeploying('github');
    setError(null);
    setDeploymentResult(null);

    try {
      const response = await fetch(`/api/app-projects/${projectId}/deploy/github-pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubToken,
          repositoryName: repositoryName || projectName.toLowerCase().replace(/\s+/g, '-'),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deploy to GitHub Pages');
      }

      setDeploymentResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to deploy to GitHub Pages');
    } finally {
      setDeploying(null);
    }
  };

  const handleFirebaseDeploy = async () => {
    setDeploying('firebase');
    setError(null);
    setDeploymentResult(null);

    try {
      const response = await fetch(`/api/app-projects/${projectId}/deploy/firebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseToken: 'not-required', // Firebase uses Google OAuth
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to prepare Firebase deployment');
      }

      setDeploymentResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to prepare Firebase deployment');
    } finally {
      setDeploying(null);
    }
  };

  const handleDownload = () => {
    window.open(`/api/app-projects/${projectId}/download`, '_blank');
  };

  const handleDownloadFirebase = () => {
    window.open(`/api/app-projects/${projectId}/download-firebase`, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-t border-white/10">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-semibold text-lg mb-2">Deploy Project</h3>
        <p className="text-gray-400 text-sm">
          Deploy your project to Firebase, Vercel, or GitHub Pages
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {deploymentResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg">
            <h4 className="text-emerald-400 font-semibold mb-2">Deployment Successful!</h4>
            {deploymentResult.deploymentUrl && (
              <div className="mb-3">
                <a
                  href={deploymentResult.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 hover:text-emerald-200 text-sm underline block mb-1"
                >
                  {deploymentResult.deploymentUrl}
                </a>
                {deploymentResult.note && (
                  <p className="text-yellow-400 text-xs mt-1">⚠️ {deploymentResult.note}</p>
                )}
              </div>
            )}
            {deploymentResult.pagesUrl && (
              <div className="mb-3">
                <a
                  href={deploymentResult.pagesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 hover:text-emerald-200 text-sm underline block mb-1"
                >
                  🌐 GitHub Pages: {deploymentResult.pagesUrl}
                </a>
                <p className="text-gray-400 text-xs">(May take 2-5 minutes to build)</p>
              </div>
            )}
            {deploymentResult.repositoryUrl && (
              <div className="mb-3">
                <a
                  href={deploymentResult.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-300 hover:text-emerald-200 text-sm underline block mb-1"
                >
                  📦 View Repository
                </a>
                {(deploymentResult.vercelImportUrl || deploymentResult.repositoryFullName) && (
                  <a
                    href={deploymentResult.vercelImportUrl || `https://vercel.com/new?import=${encodeURIComponent(deploymentResult.repositoryFullName || deploymentResult.repositoryUrl.replace('https://github.com/', ''))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:text-cyan-200 text-sm underline block mt-2 font-medium"
                  >
                    🚀 Connect to Vercel (Recommended)
                  </a>
                )}
              </div>
            )}
            {deploymentResult.instructions && (
              <div className="mt-3">
                <p className="text-gray-300 text-xs font-medium mb-1">Next Steps:</p>
                <ul className="text-gray-400 text-xs list-disc list-inside space-y-1">
                  {deploymentResult.instructions.map((instruction: string, idx: number) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Vercel Deployment */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 22.525H0l12-21.05 12 21.05z" />
            </svg>
            <h4 className="text-white font-semibold">Deploy to Vercel</h4>
          </div>
          
          <div className="mb-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-300">
            ✨ <strong>New:</strong> One-click deployment! No tokens needed - uses server configuration.
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleVercelDeploy}
              disabled={deploying === 'vercel'}
              className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {deploying === 'vercel' ? 'Deploying...' : '🚀 Deploy to Vercel'}
            </button>
            <p className="text-gray-500 text-xs text-center">
              Deploys instantly to Vercel. Get a claimable URL to transfer ownership later.
            </p>
          </div>

          {/* Show deployment result */}
          {deploymentResult?.url && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-emerald-300 text-xs font-medium mb-2">✅ Deployment Successful!</p>
              <a
                href={deploymentResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 text-sm underline block mb-2"
              >
                {deploymentResult.url}
              </a>
              {deploymentResult.claimUrl && (
                <div className="mt-2">
                  <p className="text-gray-400 text-xs mb-1">Claim this deployment:</p>
                  <a
                    href={deploymentResult.claimUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-xs underline"
                  >
                    {deploymentResult.claimUrl}
                  </a>
                  <p className="text-gray-500 text-xs mt-1">
                    Click to claim ownership (optional)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom Domain Configuration */}
        {deploymentResult?.url && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <h4 className="text-white font-semibold">Add Custom Domain</h4>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-xs mb-1">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="myapp.in"
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-400/50"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Enter your domain (e.g., myapp.in, example.com)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useYourAccount"
                  checked={useYourAccount}
                  onChange={(e) => setUseYourAccount(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-600 rounded"
                />
                <label htmlFor="useYourAccount" className="text-gray-300 text-xs">
                  Use Open Idea's GoDaddy account (Recommended - Automated DNS)
                </label>
              </div>

              {!useYourAccount && (
                <div className="space-y-2 pl-6 border-l-2 border-gray-700">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">
                      GoDaddy API Key
                    </label>
                    <input
                      type="password"
                      value={godaddyApiKey}
                      onChange={(e) => setGodaddyApiKey(e.target.value)}
                      placeholder="your_api_key"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-400/50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">
                      GoDaddy API Secret
                    </label>
                    <input
                      type="password"
                      value={godaddyApiSecret}
                      onChange={(e) => setGodaddyApiSecret(e.target.value)}
                      placeholder="your_api_secret"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-400/50"
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      Requires 10+ domains or Discount Domain Club subscription
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleDomainDeploy}
                disabled={deploying === 'domain' || !customDomain}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deploying === 'domain' ? 'Configuring Domain...' : '🌐 Configure Domain'}
              </button>

              {deploymentResult?.domainConfigured && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-300 text-xs font-medium mb-1">✅ Domain Configured!</p>
                  <a
                    href={`https://${deploymentResult.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-sm underline block"
                  >
                    {deploymentResult.domain}
                  </a>
                  <p className="text-gray-400 text-xs mt-1">
                    DNS configured automatically. SSL certificate will be issued shortly.
                  </p>
                </div>
              )}

              {deploymentResult?.manualInstructions && (
                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-300 text-xs font-medium mb-2">⚠️ Manual DNS Configuration Required</p>
                  <p className="text-gray-400 text-xs mb-2">{deploymentResult.domainError}</p>
                  <div className="bg-[#0a0a0a] p-2 rounded text-xs text-gray-300 font-mono whitespace-pre-wrap">
                    {deploymentResult.manualInstructions}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GitHub Pages Deployment */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <h4 className="text-white font-semibold">Deploy to GitHub Pages</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxx..."
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-400/50"
              />
              <p className="text-gray-500 text-xs mt-1">
                Create a token with <code className="bg-[#0a0a0a] px-1 rounded">repo</code> and{' '}
                <code className="bg-[#0a0a0a] px-1 rounded">workflow</code> permissions at{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 underline"
                >
                  github.com/settings/tokens
                </a>
              </p>
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1">
                Repository Name (Optional)
              </label>
              <input
                type="text"
                value={repositoryName}
                onChange={(e) => setRepositoryName(e.target.value)}
                placeholder={projectName.toLowerCase().replace(/\s+/g, '-')}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-400/50"
              />
            </div>

            <button
              onClick={handleGitHubPagesDeploy}
              disabled={deploying === 'github' || !githubToken}
              className="w-full px-4 py-2 bg-gradient-to-r from-gray-800 to-black hover:from-gray-900 hover:to-black border border-white/20 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deploying === 'github' ? 'Deploying...' : 'Deploy to GitHub Pages'}
            </button>
          </div>
        </div>

        {/* Download Option */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Download Project</h4>
          <p className="text-gray-400 text-xs mb-3">
            Download your project as a ZIP file for manual deployment
          </p>
          <button
            onClick={handleDownload}
            className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg text-white text-sm font-medium transition-all"
          >
            Download ZIP
          </button>
        </div>
      </div>
    </div>
  );
}

