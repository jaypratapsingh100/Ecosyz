'use client';

import { useState } from 'react';

interface DiscussionFormProps {
  groupId?: string;
  workspaceId?: string;
  discussionId?: string;
  onSuccess?: () => void;
  mode?: 'create' | 'reply';
  initialData?: {
    title?: string;
    content?: string;
    tags?: string[];
  };
}

export default function DiscussionForm({
  groupId,
  workspaceId,
  discussionId,
  onSuccess,
  mode = 'create',
  initialData,
}: DiscussionFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'reply') {
        const res = await fetch(`/api/community/discussions/${discussionId}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create reply');
        }
      } else {
        const res = await fetch('/api/community/discussions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            groupId,
            workspaceId,
            tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create discussion');
        }
      }

      setTitle('');
      setContent('');
      setTags('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'reply') {
    return (
      <form onSubmit={handleSubmit} className="glass-card glass-border p-4 rounded-xl">
        {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your reply..."
          required
          rows={4}
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400 resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Post Reply'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card glass-border p-6 rounded-xl">
      {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Discussion title"
        required
        className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400 mb-4"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your discussion..."
        required
        rows={6}
        className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400 resize-none mb-4"
      />
      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma-separated)"
        className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400 mb-4"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !title.trim() || !content.trim()}
          className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Discussion'}
        </button>
      </div>
    </form>
  );
}






