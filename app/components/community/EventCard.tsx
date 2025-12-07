'use client';

import Link from 'next/link';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate?: string;
    location?: string;
    eventUrl?: string;
    category?: string;
    imageUrl?: string;
    _count: {
      registrations: number;
    };
  };
}

export default function EventCard({ event }: EventCardProps) {
  const startDate = new Date(event.startDate);
  const isUpcoming = startDate > new Date();

  return (
    <Link href={`/community/events/${event.id}`}>
      <div className="glass-card glass-border p-6 rounded-xl transition-all duration-200 hover:-translate-y-2 cursor-pointer">
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-cyan-300 flex-1">{event.title}</h3>
          {event.category && (
            <span className="px-2 py-1 text-xs bg-purple-400/20 text-purple-300 rounded ml-2">
              {event.category}
            </span>
          )}
        </div>
        <p className="text-teal-100/80 text-sm mb-4 line-clamp-2">{event.description}</p>
        <div className="space-y-2 text-sm text-teal-100/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold">📅</span>
            <span>{startDate.toLocaleDateString()}</span>
            {event.endDate && (
              <span> - {new Date(event.endDate).toLocaleDateString()}</span>
            )}
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <span className="font-semibold">📍</span>
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-semibold">👥</span>
            <span>{event._count.registrations} registered</span>
          </div>
        </div>
        {isUpcoming && (
          <div className="mt-4 pt-4 border-t border-teal-400/20">
            <span className="text-xs text-emerald-400 font-semibold">Upcoming Event</span>
          </div>
        )}
      </div>
    </Link>
  );
}

