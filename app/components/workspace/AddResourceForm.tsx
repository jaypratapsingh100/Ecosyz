'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../../src/lib/ui'
import { json } from '../../../src/lib/api'

interface Resource {
  id: string
  workspaceId: string
  title: string
  url?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface AddResourceFormProps {
  workspaceId: string
  onCreated?: (resource: Resource) => void
}

export default function AddResourceForm({ workspaceId, onCreated }: AddResourceFormProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setCreating(true)
    try {
      const data = await json<Resource>(await fetch(`/api/workspaces/${workspaceId}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          data: {
            notes: notes.trim() || undefined,
          },
        }),
      }))

      toast.success('Resource added successfully!')
      setTitle('')
      setUrl('')
      setNotes('')
      setIsExpanded(false)
      onCreated?.(data)
    } catch (error) {
      toast.error('Failed to add resource')
      console.error('Create resource error:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleCancel = () => {
    setTitle('')
    setUrl('')
    setNotes('')
    setIsExpanded(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl",
        "shadow-lg hover:shadow-zinc-900/50 transition-all duration-200"
      )}
    >
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "w-full p-6 flex items-center justify-center gap-3",
            "text-zinc-400 hover:text-emerald-400 transition-colors",
            "hover:bg-zinc-800/30 rounded-2xl"
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Resource</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-100">Add New Resource</h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-zinc-400 hover:text-zinc-200 text-sm"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                "w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg",
                "text-zinc-100 placeholder-zinc-400",
                "focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60",
                "transition-colors"
              )}
              placeholder="Resource title..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              URL (optional)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={cn(
                "w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg",
                "text-zinc-100 placeholder-zinc-400",
                "focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60",
                "transition-colors"
              )}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cn(
                "w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg",
                "text-zinc-100 placeholder-zinc-400",
                "focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60",
                "transition-colors resize-none"
              )}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all",
                "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300",
                "border border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/20",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Resource
            </button>
          </div>
        </form>
      )}
    </motion.div>
  )
}