'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Share, Clock, Loader2 } from 'lucide-react'
import SocialShareButtons from '../ui/SocialShareButtons'
import { toast } from 'sonner'
import { cn } from '../../../src/lib/ui'
import { json, copy } from '../../../src/lib/api'

interface ShareLink {
  id: string
  token: string
  createdAt: string
  expiresAt?: string
}

interface ShareLinksPanelProps {
  workspaceId: string
}

export default function ShareLinksPanel({ workspaceId }: ShareLinksPanelProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const fetchShareLink = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/share`)
      if (!res.ok) {
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('text/html')) {
          // Next.js returned HTML 404 page - route not found
          console.error('Share links route not found - returning HTML 404')
          setShareLink(null)
          setLoading(false)
          return
        }
        if (res.status === 403 || res.status === 401) {
          // User doesn't have access to this workspace
          // Try to fetch their own workspace and redirect
          try {
            const workspaceRes = await fetch('/api/workspaces')
            if (workspaceRes.ok) {
              const userWorkspace = await workspaceRes.json()
              if (userWorkspace?.id && userWorkspace.id !== workspaceId) {
                window.location.href = `/workspaces/${userWorkspace.id}`
                return
              }
            }
          } catch {
            // Ignore redirect errors
          }
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await json<ShareLink | null>(res)
      setShareLink(data)
    } catch (error) {
      console.error('Failed to fetch share link:', error)
      // Don't show error state if it's a permission issue - just show empty state
      setShareLink(null)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const createShareLink = async () => {
    setCreating(true)
    try {
      const data = await json<ShareLink>(await fetch(`/api/workspaces/${workspaceId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }))

      const shareUrl = `${window.location.origin}/share/${data.token}`
      await copy(shareUrl)
      toast.success('Share link copied to clipboard!')
      fetchShareLink()
    } catch (error) {
      toast.error('Failed to create share link')
      console.error('Share creation error:', error)
    } finally {
      setCreating(false)
    }
  }

  const openShareUrl = (token: string) => {
    window.open(`${window.location.origin}/share/${token}`, '_blank', 'noopener,noreferrer')
  }

  // Fetch share link on mount and when workspaceId changes
  useEffect(() => {
    fetchShareLink()
  }, [fetchShareLink])

  if (loading) {
    return (
      <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-3">
        <div className="animate-pulse">
          <div className="h-5 bg-zinc-800/50 rounded mb-3"></div>
          <div className="h-3 bg-zinc-800/50 rounded mb-2"></div>
          <div className="h-3 bg-zinc-800/50 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-3",
        "shadow-lg hover:shadow-zinc-900/50 transition-all duration-200"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-1.5">
          <Share className="w-4 h-4" />
          Share Link
        </h2>

        {!shareLink && (
          <button
            onClick={createShareLink}
            disabled={creating}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30",
              "hover:shadow-lg hover:shadow-emerald-500/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Share className="w-3.5 h-3.5" />
            )}
            Create
          </button>
        )}
      </div>

      {!shareLink ? (
        <div className="text-center py-4">
          <Share className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-400 text-xs">
            No share link yet.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "bg-zinc-800/50 border border-zinc-700 rounded-lg p-2.5",
            "hover:bg-zinc-800/70 transition-colors"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Share className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-medium">Share Link</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400">Share:</span>
              <SocialShareButtons
                url={`${window.location.origin}/share/${shareLink.token}`}
                text="Check out my workspace on Open Idea"
                size="md"
              />
              <button
                onClick={() => openShareUrl(shareLink.token)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors flex items-center justify-center",
                  "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                )}
                title="Open share page"
              >
                <Share className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 font-mono bg-zinc-900/50 p-2 rounded break-all mb-2 leading-tight">
            {window.location.origin}/share/{shareLink.token}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              Created {new Date(shareLink.createdAt).toLocaleDateString()}
            </span>
            {shareLink.expiresAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                Expires {new Date(shareLink.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}