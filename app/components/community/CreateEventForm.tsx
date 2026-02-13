'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface CreateEventFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateEventForm({ onSuccess, onCancel }: CreateEventFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [eventUrl, setEventUrl] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Convert dates to ISO strings
      const startDateISO = startDate ? new Date(startDate).toISOString() : '';
      const endDateISO = endDate ? new Date(endDate).toISOString() : undefined;

      if (!startDateISO) {
        throw new Error('Start date is required');
      }

      const res = await fetch('/api/community/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          startDate: startDateISO,
          endDate: endDateISO,
          location: location.trim() || undefined,
          eventUrl: eventUrl.trim() || undefined,
          category: category.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
          isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }

      const event = await res.json();
      toast.success('Event created successfully!', {
        description: `"${event.title}" has been created.`,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setLocation('');
      setEventUrl('');
      setCategory('');
      setImageUrl('');
      setMaxAttendees('');
      setIsPublic(true);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
      toast.error('Failed to create event', {
        description: err.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card glass-border p-6 rounded-xl space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-cyan-300 mb-4">Create New Event</h3>
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
          placeholder="e.g., AI Research Workshop"
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
          placeholder="Describe the event..."
          rows={4}
          required
          className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-teal-100/80 mb-2">
            Start Date & Time <span className="text-red-400">*</span>
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
            End Date & Time
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-teal-100/80 mb-2">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., San Francisco, CA or Online"
            maxLength={200}
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400"
          />
        </div>

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
            <option value="workshop">Workshop</option>
            <option value="webinar">Webinar</option>
            <option value="hackathon">Hackathon</option>
            <option value="meetup">Meetup</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-teal-100/80 mb-2">
            Event URL
          </label>
          <input
            type="url"
            value={eventUrl}
            onChange={(e) => setEventUrl(e.target.value)}
            placeholder="https://example.com/event"
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-teal-100/80 mb-2">
            Max Attendees
          </label>
          <input
            type="number"
            value={maxAttendees}
            onChange={(e) => setMaxAttendees(e.target.value)}
            placeholder="e.g., 100"
            min="1"
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400"
          />
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

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="w-4 h-4 rounded border-teal-400/20 bg-[#172421]/90 text-cyan-400 focus:ring-cyan-400"
        />
        <label htmlFor="isPublic" className="text-sm text-teal-100/80 cursor-pointer">
          Make this event public (visible to everyone)
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !title.trim() || !description.trim() || !startDate}
          className="flex-1 px-6 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Event'}
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
