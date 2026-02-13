'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface CreateGroupFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateGroupForm({ onSuccess, onCancel }: CreateGroupFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topics, setTopics] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Parse topics from comma-separated string
      const topicsArray = topics
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const res = await fetch('/api/community/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          topics: topicsArray,
          isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create group');
      }

      const group = await res.json();
      toast.success('Group created successfully!', {
        description: `"${group.name}" has been created.`,
      });

      // Reset form
      setName('');
      setDescription('');
      setTopics('');
      setIsPublic(true);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
      toast.error('Failed to create group', {
        description: err.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card glass-border p-6 rounded-xl space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-cyan-300 mb-4">Create New Group</h3>
        {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-100/80 mb-2">
          Group Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., AI Research Community"
          required
          maxLength={100}
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-100/80 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this group is about..."
          rows={4}
          maxLength={1000}
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-100/80 mb-2">
          Topics <span className="text-xs text-teal-100/60">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder="e.g., AI, Machine Learning, Research"
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400"
        />
        <p className="mt-1 text-xs text-teal-100/60">
          Add up to 10 topics to help others find your group
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="w-4 h-4 rounded border-teal-400/20 bg-[#172421]/90 text-cyan-400 focus:ring-cyan-400"
        />
        <label htmlFor="isPublic" className="text-sm text-teal-100/80 cursor-pointer">
          Make this group public (anyone can join)
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex-1 px-6 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 border border-teal-400/20 text-teal-100/80 font-medium rounded-lg hover:bg-teal-400/10 transition disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
