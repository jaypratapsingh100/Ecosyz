'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface DeploymentPanelProps {
  projectId: string;
  projectName: string;
  /** Called when API returns 401 - parent can re-check auth state */
  onAuthRequired?: () => void | Promise<void>;
}

export default function DeploymentPanel({ projectId, projectName, onAuthRequired }: DeploymentPanelProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ url: string; claimUrl: string } | null>(null);
  const [loadingDeployment, setLoadingDeployment] = useState(true);
  // GitHub export state
  const [githubToken, setGithubToken] = useState('');
  const [githubRepoName, setGithubRepoName] = useState('');
  const [githubPrivate, setGithubPrivate] = useState(false);
  const [exportingGithub, setExportingGithub] = useState(false);
  const [githubResult, setGithubResult] = useState<{ repoUrl: string; filesCommitted: number } | null>(null);
  const [showGithubForm, setShowGithubForm] = useState(false);

  const handleAuthError = () => {
    onAuthRequired?.();
    toast.error('Session Expired', {
      description: 'Your session may have expired. Please sign in again to continue.',
      duration: 6000,
      action: {
        label: 'Sign In',
        onClick: () => router.push('/auth?redirect=%2Fstudio'),
      },
    });
  };

  // Load existing deployment URLs when component mounts
  useEffect(() => {
    if (!projectId) {
      setLoadingDeployment(false);
      return;
    }

    const loadDeploymentInfo = async () => {
      try {
        const res = await fetch(`/api/app-projects/${projectId}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (res.ok) {
          const project = await res.json();
          if (project.deploymentUrl || project.claimUrl) {
            setDeployResult({
              url: project.deploymentUrl || '',
              claimUrl: project.claimUrl || '',
            });
          }
        }
      } catch (error) {
        console.error('Error loading deployment info:', error);
        // Don't show toast for loading errors - deployment panel will show empty state
      } finally {
        setLoadingDeployment(false);
      }
    };

    loadDeploymentInfo();
  }, [projectId]);

  const handleDownloadZip = async () => {
    if (!projectId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/app-projects/${projectId}/download`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMsg = (err as { error?: string })?.error || 'Download failed';
        if (res.status === 401 || errMsg.toLowerCase().includes('not authenticated')) {
          handleAuthError();
          return;
        }
        throw new Error(errMsg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]) || 'project.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      let errorMessage = 'Unable to download project';
      
      if (e instanceof Error) {
        if (e.message.includes('network') || e.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (e.message.includes('permission') || e.message.includes('access')) {
          errorMessage = 'You don\'t have permission to download this project.';
        } else {
          errorMessage = e.message || errorMessage;
        }
      }
      
      toast.error('Download Failed', {
        description: errorMessage,
        duration: 6000,
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleExportGithub = async () => {
    if (!projectId || !githubToken) return;
    setExportingGithub(true);
    setGithubResult(null);
    try {
      const res = await fetch(`/api/app-projects/${projectId}/export/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token: githubToken,
          repoName: githubRepoName || undefined,
          isPrivate: githubPrivate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 && (data as any)?.error?.includes('GitHub token')) {
          throw new Error((data as any).error);
        }
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error((data as any)?.error || 'Export failed');
      }
      setGithubResult({ repoUrl: (data as any).repoUrl, filesCommitted: (data as any).filesCommitted });
      toast.success('Exported to GitHub!', {
        description: `${(data as any).filesCommitted} files pushed to ${(data as any).repoName}`,
        duration: 6000,
      });
    } catch (e) {
      console.error(e);
      toast.error('GitHub Export Failed', {
        description: e instanceof Error ? e.message : 'Unable to export to GitHub',
        duration: 6000,
      });
    } finally {
      setExportingGithub(false);
    }
  };

  const handleDeployVercel = async () => {
    if (!projectId) return;
    setDeploying(true);
    setDeployResult(null);
    try {
      // Re-validate session before deploy to avoid confusing "Not authenticated" errors
      const sessionRes = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!sessionRes.ok) {
        handleAuthError();
        return;
      }

      const res = await fetch(`/api/app-projects/${projectId}/deploy/vercel`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = (data as { error?: string })?.error || 'Deploy failed';
        if (res.status === 401 || errMsg.toLowerCase().includes('not authenticated')) {
          handleAuthError();
          return;
        }
        throw new Error(errMsg);
      }
      const url = (data as { url?: string }).url;
      const liveUrl = url?.startsWith('http') ? url : url ? `https://${url}` : null;
      setDeployResult({
        url: liveUrl || url || '',
        claimUrl: (data as { claimUrl?: string }).claimUrl || '',
      });
    } catch (e) {
      console.error(e);
      let errorMessage = 'Unable to deploy to Vercel';
      
      if (e instanceof Error) {
        if (e.message.includes('network') || e.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (e.message.includes('permission') || e.message.includes('access')) {
          errorMessage = 'You don\'t have permission to deploy this project.';
        } else if (e.message.includes('configuration') || e.message.includes('config')) {
          errorMessage = 'Project configuration error. Please ensure your project has valid files and try again.';
        } else if (e.message.includes('vercel') || e.message.includes('deployment')) {
          errorMessage = e.message;
        } else {
          errorMessage = e.message || errorMessage;
        }
      }
      
      toast.error('Deployment Failed', {
        description: errorMessage + ' If the problem persists, try downloading the project and deploying manually.',
        duration: 7000,
      });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="mb-6">
          <h3 className="text-white font-semibold text-lg mb-2">Deploy Your Project</h3>
          <p className="text-gray-400 text-sm">
            Deploy your application to various platforms
          </p>
        </div>

        {/* Vercel Deployment */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 22.525H0l12-21.05 12 21.05z" />
            </svg>
            <h4 className="text-white font-semibold">Deploy to Vercel</h4>
          </div>
          <p className="text-gray-400 text-xs mb-3">
            Deploys using our Vercel account. You can claim the project to your email so it appears in your Vercel dashboard.
          </p>
          <button
            disabled={!projectId || deploying || loadingDeployment}
            onClick={handleDeployVercel}
            className="w-full px-4 py-2 bg-gradient-to-r from-black to-gray-800 hover:from-gray-900 hover:to-black border border-white/20 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deploying ? 'Deploying…' : loadingDeployment ? 'Loading…' : 'Deploy to Vercel'}
          </button>
          {(deployResult?.url || deployResult?.claimUrl) && (
            <div className="mt-3 space-y-2 pt-3 border-t border-white/10">
              {deployResult.url && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">Live URL</p>
                  <a
                    href={deployResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-sm break-all underline"
                  >
                    {deployResult.url}
                  </a>
                </div>
              )}
              {deployResult.claimUrl && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">Claim with your email</p>
                  <a
                    href={deployResult.claimUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-sm break-all underline"
                  >
                    {deployResult.claimUrl}
                  </a>
                  <p className="text-gray-500 text-xs mt-0.5">Open this link and sign in with your Vercel account to add this project to your team.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* GitHub Export */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <h4 className="text-white font-semibold">Export to GitHub</h4>
          </div>
          <p className="text-gray-400 text-xs mb-3">
            Push your project files to a new GitHub repository. Requires a Personal Access Token with <code className="text-gray-300">repo</code> scope.
          </p>

          {!showGithubForm && !githubResult && (
            <button
              disabled={!projectId}
              onClick={() => setShowGithubForm(true)}
              className="w-full px-4 py-2 bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 border border-white/20 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export to GitHub
            </button>
          )}

          {showGithubForm && !githubResult && (
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">GitHub Token *</label>
                <input
                  type="password"
                  placeholder="ghp_xxxx..."
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Repository Name (optional)</label>
                <input
                  type="text"
                  placeholder={projectName || 'my-app'}
                  value={githubRepoName}
                  onChange={(e) => setGithubRepoName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <label className="flex items-center gap-2 text-gray-400 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={githubPrivate}
                  onChange={(e) => setGithubPrivate(e.target.checked)}
                  className="rounded border-white/20"
                />
                Private repository
              </label>
              <div className="flex gap-2">
                <button
                  disabled={!githubToken || exportingGithub}
                  onClick={handleExportGithub}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 border border-white/20 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingGithub ? 'Exporting...' : 'Push to GitHub'}
                </button>
                <button
                  onClick={() => setShowGithubForm(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {githubResult && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {githubResult.filesCommitted} files exported
              </div>
              <a
                href={githubResult.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 text-sm break-all underline block"
              >
                {githubResult.repoUrl}
              </a>
              <button
                onClick={() => { setGithubResult(null); setShowGithubForm(false); }}
                className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
              >
                Export again
              </button>
            </div>
          )}
        </div>

        {/* Download Option */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Download Project</h4>
          <p className="text-gray-400 text-xs mb-3">
            Download your project as a ZIP file (Vercel-ready structure) for manual deployment
          </p>
          <button
            disabled={!projectId || downloading}
            onClick={handleDownloadZip}
            className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? 'Preparing…' : 'Download ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}
