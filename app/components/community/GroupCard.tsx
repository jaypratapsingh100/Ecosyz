'use client';

import Link from 'next/link';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description?: string;
    slug: string;
    topics: string[];
    avatarUrl?: string;
    creator: {
      id: string;
      name?: string;
      email: string;
    };
    _count: {
      members: number;
      discussions: number;
    };
  };
}

export default function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/community/groups/${group.slug}`}>
      <div className="glass-card glass-border p-6 rounded-xl transition-all duration-200 hover:-translate-y-2 cursor-pointer">
        <div className="flex items-start gap-4">
          {group.avatarUrl ? (
            <img
              src={group.avatarUrl}
              alt={group.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-2xl font-bold text-gray-900">
              {group.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-cyan-300 mb-1 truncate">
              {group.name}
            </h3>
            {group.description && (
              <p className="text-teal-100/80 text-sm mb-3 line-clamp-2">
                {group.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              {group.topics.slice(0, 3).map((topic) => (
                <span
                  key={topic}
                  className="px-2 py-1 text-xs bg-cyan-400/20 text-cyan-300 rounded"
                >
                  {topic}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm text-teal-100/60">
              <span>{group._count.members} members</span>
              <span>{group._count.discussions} discussions</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

