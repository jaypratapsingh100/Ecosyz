'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../../src/lib/ui'
import { json } from '../../../src/lib/api'

interface Workspace {
  id: string
  title: string
}

interface SaveToWorkspaceProps {
  result: {
    title: string
    url: string
    type?: string
    tags?: string[]
    description?: string
    authors?: string[]
    year?: string
    source?: string
  }
  onSaved?: () => void
  /**
   * When true, the modal opens immediately on mount.
   * Useful when the parent controls when this component is rendered.
   */
  initiallyOpen?: boolean
  /**
   * When false, the inline trigger button is hidden and only the modal is rendered.
   * Defaults to true to preserve existing behaviour.
   */
  showTriggerButton?: boolean
  /**
   * Called whenever the modal is closed (via backdrop, Cancel, X, or successful save).
   */
  onClose?: () => void
}

export default function SaveToWorkspace({
  result,
  onSaved,
  initiallyOpen = false,
  showTriggerButton = true,
  onClose,
}: SaveToWorkspaceProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchWorkspace()
    }
  }, [isOpen])

  const closeModal = () => {
    setIsOpen(false)
    onClose?.()
  }

  const fetchWorkspace = async () => {
    try {
      const data = await json<Workspace>(await fetch('/api/workspaces'))
      setWorkspace(data)
    } catch (error) {
      console.error('Failed to fetch workspace:', error)
    }
  }

  const handleSave = async () => {
    if (!workspace) return

    setLoading(true)
    try {
      await json(await fetch(`/api/workspaces/${workspace.id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.title,
          url: result.url,
          type: result.type,
          tags: result.tags,
          data: {
            description: result.description,
            authors: result.authors,
            year: result.year,
            source: result.source,
            snippet: result.description,
          },
        }),
      }))

      toast.success(`Saved "${result.title}" to workspace!`)
      setIsOpen(false)
      onSaved?.()
      onClose?.()
    } catch (error) {
      toast.error('Failed to save to workspace')
      console.error('Save error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showTriggerButton && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300",
            "rounded-lg text-xs font-semibold border border-emerald-600/30",
            "hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
          )}
        >
          <Save className="w-3 h-3 inline mr-1" />
          Save
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl",
                "shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-zinc-100">Save to Workspace</h3>
                  <button
                    onClick={closeModal}
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  {workspace ? (
                    <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700">
                      <p className="text-sm text-zinc-400 mb-1">Workspace:</p>
                      <p className="text-zinc-100 font-medium">{workspace.title}</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-700 text-center">
                      <p className="text-sm text-zinc-400">Loading workspace...</p>
                    </div>
                  )}
                </div>

                <div className="text-xs text-zinc-500 mb-6 p-3 bg-zinc-800/30 rounded-lg">
                  <strong>{result.title}</strong>
                  {result.url && (
                    <div className="mt-1 truncate">{result.url}</div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                      "bg-zinc-700/50 hover:bg-zinc-600/50 text-zinc-300 border border-zinc-600/30"
                    )}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={loading || !workspace}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg font-medium transition-all",
                      "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300",
                      "border border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}