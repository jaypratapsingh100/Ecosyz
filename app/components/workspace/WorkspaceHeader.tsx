'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Loader2, Edit2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn, useDebouncedCallback } from '../../../src/lib/ui'
import { json } from '../../../src/lib/api'

interface WorkspaceHeaderProps {
  id: string
  title: string
}

export default function WorkspaceHeader({ id, title: initialTitle }: WorkspaceHeaderProps) {
  const [title, setTitle] = useState(initialTitle)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update title when initialTitle changes (e.g., after save)
  useEffect(() => {
    setTitle(initialTitle)
  }, [initialTitle])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const saveTitle = useCallback(async (newTitle: string) => {
    if (newTitle.trim() === initialTitle) {
      setIsEditing(false)
      return
    }

    if (!newTitle.trim()) {
      toast.error('Workspace title cannot be empty')
      setTitle(initialTitle)
      setIsEditing(false)
      return
    }

    setSaving(true)
    try {
      await json(await fetch(`/api/workspaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      }))
      toast.success('Workspace title saved')
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to save title')
      console.error('Save error:', error)
      setTitle(initialTitle)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }, [id, initialTitle])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveTitle(title)
    } else if (e.key === 'Escape') {
      setTitle(initialTitle)
      setIsEditing(false)
    } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      saveTitle(title)
    }
  }

  const handleBlur = () => {
    if (title.trim() !== initialTitle) {
      saveTitle(title)
    } else {
      setIsEditing(false)
    }
  }

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setTitle(initialTitle)
    setIsEditing(false)
  }

  return (
    <header className="mb-4">
      <div className="flex items-center gap-3">
        {isEditing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="Untitled Workspace"
              disabled={saving}
              className={cn(
                "flex-1 px-3 py-2 text-xl font-medium bg-zinc-800/50 border border-cyan-400/50 rounded-lg",
                "text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400",
                "transition-all",
                saving && "opacity-50"
              )}
            />
            <button
              onClick={() => saveTitle(title)}
              disabled={saving}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20",
                "disabled:opacity-50"
              )}
              title="Save (Enter)"
            >
              <Check className="h-5 w-5" />
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50",
                "disabled:opacity-50"
              )}
              title="Cancel (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
            {saving && <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />}
          </>
        ) : (
          <>
            <h1
              onClick={handleStartEdit}
              className={cn(
                "flex-1 text-xl font-medium text-zinc-100 cursor-text",
                "hover:text-cyan-400 transition-colors",
                "group"
              )}
            >
              {title || 'Untitled Workspace'}
            </h1>
            <button
              onClick={handleStartEdit}
              className={cn(
                "p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100",
                "text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/50"
              )}
              title="Edit workspace name"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </header>
  )
}