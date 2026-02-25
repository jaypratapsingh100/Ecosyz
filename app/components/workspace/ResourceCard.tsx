'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Trash2, Copy, MessageSquare, ShieldAlert, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../../src/lib/ui'
import { json, copy } from '../../../src/lib/api'
import AddAnnotationForm from './AddAnnotationForm'

interface Resource {
  id: string
  title: string
  url?: string
  notes?: string
  createdAt: string
  tags?: string[]
  annotationCount?: number
   plagiarismScore?: number
   plagiarismStatus?: string
}

interface ResourceCardProps {
  resource: Resource
  onDeleted?: (id: string) => void
  onAnnotationCreated?: (resourceId: string) => void
}

export default function ResourceCard({ resource, onDeleted, onAnnotationCreated }: ResourceCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [showAnnotationForm, setShowAnnotationForm] = useState(false)
  const [checking, setChecking] = useState(false)
  const [plagiarismStatus, setPlagiarismStatus] = useState<string | undefined>(resource.plagiarismStatus)
  const [plagiarismScore, setPlagiarismScore] = useState<number | undefined>(resource.plagiarismScore)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    setDeleting(true)
    try {
      await json(await fetch(`/api/resources/${resource.id}`, {
        method: 'DELETE',
      }))
      toast.success('Resource deleted')
      onDeleted?.(resource.id)
    } catch (error) {
      toast.error('Failed to delete resource')
      console.error('Delete error:', error)
      setDeleting(false)
    }
  }

  const handlePlagiarismCheck = async () => {
    setChecking(true)
    try {
      const updated = await json<Resource>(await fetch(`/api/resources/${resource.id}/plagiarism`, {
        method: 'POST',
      }))

      const status: string | undefined = updated.plagiarismStatus
      const score: number | undefined = updated.plagiarismScore

      setPlagiarismStatus(status)
      setPlagiarismScore(score)

      toast.success('Plagiarism check completed')
    } catch (error) {
      toast.error('Failed to run plagiarism check')
      console.error('Plagiarism check error:', error)
    } finally {
      setChecking(false)
    }
  }

  const handleCopyLink = async () => {
    if (!resource.url) {
      toast.error('No URL to copy')
      return
    }

    try {
      await copy(resource.url)
      toast.success('URL copied to clipboard!')
    } catch {
      // Error handling not needed for this case
      toast.error('Failed to copy URL')
    }
  }

  const handleOpenUrl = () => {
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn(
        "bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6",
        "shadow-lg hover:shadow-zinc-900/50 transition-all duration-200"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-100 flex-1 mr-4">
          {resource.title}
        </h3>

        <div className="flex gap-2">
          <button
            onClick={handlePlagiarismCheck}
            disabled={checking}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
              "border border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
            title="Check plagiarism for this resource"
          >
            {checking ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ShieldAlert className="w-3 h-3" />
            )}
            <span>Check</span>
          </button>

          {resource.url && (
            <>
              <button
                onClick={handleCopyLink}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                )}
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={handleOpenUrl}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                )}
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "text-zinc-400 hover:text-red-400 hover:bg-red-900/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Delete resource"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(plagiarismStatus || plagiarismScore !== undefined) && (
        <div className="mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full border text-[11px]",
                plagiarismStatus === 'clean' && "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
                plagiarismStatus === 'flagged' && "border-red-500/40 text-red-300 bg-red-500/10",
                plagiarismStatus === 'error' && "border-amber-500/40 text-amber-300 bg-amber-500/10",
                (!plagiarismStatus || plagiarismStatus === 'not_checked') &&
                  "border-zinc-600 text-zinc-300 bg-zinc-800/60"
              )}
            >
              Plagiarism: {plagiarismStatus || 'not_checked'}
            </span>
            {plagiarismScore !== undefined && (
              <span className="text-zinc-400">
                Score: {plagiarismScore.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      )}

      {resource.url && (
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 text-sm break-all block mb-3"
        >
          {resource.url}
        </a>
      )}

      {resource.notes && (
        <p className="text-zinc-300 text-sm mb-4 line-clamp-3">
          {resource.notes}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {resource.annotationCount !== undefined && resource.annotationCount > 0 && (
            <div className="flex items-center gap-1 text-zinc-400 text-sm">
              <MessageSquare className="w-4 h-4" />
              {resource.annotationCount} annotation{resource.annotationCount !== 1 ? 's' : ''}
            </div>
          )}

          <span className="text-zinc-500 text-xs">
            {new Date(resource.createdAt).toLocaleDateString()}
          </span>
        </div>

        {resource.tags && resource.tags.length > 0 && (
          <div className="flex gap-2">
            {resource.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-zinc-800/50 text-zinc-300 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {resource.tags.length > 3 && (
              <span className="text-zinc-500 text-xs">
                +{resource.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Add annotation section */}
      {!showAnnotationForm && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <button
            onClick={() => setShowAnnotationForm(true)}
            className={cn(
              "flex items-center gap-2 text-emerald-400 hover:text-emerald-300",
              "text-sm font-medium transition-colors"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Add Annotation
          </button>
        </div>
      )}

      {showAnnotationForm && (
        <AddAnnotationForm
          resourceId={resource.id}
          onCreated={() => {
            onAnnotationCreated?.(resource.id)
            setShowAnnotationForm(false)
          }}
          onCancel={() => setShowAnnotationForm(false)}
        />
      )}
    </motion.div>
  )
}