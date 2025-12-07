'use client';

import Link from 'next/link';

interface ChallengeCardProps {
  challenge: {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    category?: string;
    status: string;
    prize?: string;
    imageUrl?: string;
    _count: {
      submissions: number;
    };
  };
}

export default function ChallengeCard({ challenge }: ChallengeCardProps) {
  const endDate = new Date(challenge.endDate);
  const isActive = challenge.status === 'active';
  const isEnded = endDate < new Date();

  return (
    <Link href={`/community/challenges/${challenge.id}`}>
      <div className="glass-card glass-border p-6 rounded-xl transition-all duration-200 hover:-translate-y-2 cursor-pointer">
        {challenge.imageUrl && (
          <img
            src={challenge.imageUrl}
            alt={challenge.title}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-purple-300 flex-1">{challenge.title}</h3>
          <span
            className={`px-2 py-1 text-xs rounded ml-2 ${
              isActive
                ? 'bg-emerald-400/20 text-emerald-300'
                : isEnded
                ? 'bg-gray-400/20 text-gray-300'
                : 'bg-yellow-400/20 text-yellow-300'
            }`}
          >
            {challenge.status}
          </span>
        </div>
        {challenge.category && (
          <span className="inline-block px-2 py-1 text-xs bg-purple-400/20 text-purple-300 rounded mb-2">
            {challenge.category}
          </span>
        )}
        <p className="text-teal-100/80 text-sm mb-4 line-clamp-2">{challenge.description}</p>
        <div className="space-y-2 text-sm text-teal-100/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold">🏁</span>
            <span>Ends {endDate.toLocaleDateString()}</span>
          </div>
          {challenge.prize && (
            <div className="flex items-center gap-2">
              <span className="font-semibold">🏆</span>
              <span>{challenge.prize}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-semibold">📝</span>
            <span>{challenge._count.submissions} submissions</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

