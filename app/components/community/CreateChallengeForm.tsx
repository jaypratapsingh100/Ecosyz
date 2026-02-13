'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface CreateChallengeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateChallengeForm({ onSuccess, onCancel }: CreateChallengeFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [prize, setPrize] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'active' | 'ended' | 'judging' | 'completed'>('upcoming');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Convert dates to ISO strings
      const startDateISO = startDate ? new Date(startDate).toISOString() : '';
      const endDateISO = endDate ? new Date(endDate).toISOString() : '';

      if (!startDateISO || !endDateISO) {
        throw new Error('Start date and end date are required');
      }

      const res = await fetch('/api/community/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          requirements: requirements.trim() || undefined,
          prize: prize.trim() || undefined,
          startDate: startDateISO,
          endDate: endDateISO,
          category: category.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create challenge');
      }

      const challenge = await res.json();
      toast.success('Challenge created successfully!', {
        description: `"${challenge.title}" has been created.`,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setRequirements('');
      setPrize('');
      setStartDate('');
      setEndDate('');
      setCategory('');
      setImageUrl('');
      setStatus('upcoming');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create challenge');
      toast.error('Failed to create challenge', {
        description: err.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card glass-border p-6 rounded-xl space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-cyan-300 mb-4">Create New Challenge</h3>
        {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-100/80 mb-2">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Climate Innovation Challenge"
          required
          maxLength={200}
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-100/80 mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the challenge..."
          rows={4}
          required
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-teal-100/80 mb-2">
            Start Date <span className="text-red-400">*</span>
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-teal-100/80 mb-2">
            End Date <span className="text-red-400">*</span>
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-100/80 mb-2">
          Requirements
        </label>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="List the requirements for participants..."
          rows={3}
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-100/80 mb-2">
          Prize
        </label>
        <input
          type="text"
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          placeholder="e.g., $10,000 cash prize"
          maxLength={500}
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-teal-100/80 mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="">Select category</option>
            <option value="innovation">Innovation</option>
            <option value="coding">Coding</option>
            <option value="research">Research</option>
            <option value="ai">AI</option>
            <option value="climate">Climate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-teal-100/80 mb-2">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="judging">Judging</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-100/80 mb-2">
          Image URL
        </label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !title.trim() || !description.trim() || !startDate || !endDate}
          className="flex-1 px-6 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Challenge'}
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
