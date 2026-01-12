'use client';

import { useState, useEffect } from 'react';
import ChallengeCard from './ChallengeCard';

interface Challenge {
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
}

export default function ChallengesList() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchChallenges();
  }, [statusFilter, categoryFilter]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await fetch(`/api/community/challenges?${params}`);
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
        >
          <option value="">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
          <option value="judging">Judging</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
        >
          <option value="">All Categories</option>
          <option value="innovation">Innovation</option>
          <option value="coding">Coding</option>
          <option value="research">Research</option>
          <option value="ai">AI</option>
          <option value="climate">Climate</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-teal-100/80">Loading challenges...</div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-12 text-teal-100/80">No challenges found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </div>
  );
}






