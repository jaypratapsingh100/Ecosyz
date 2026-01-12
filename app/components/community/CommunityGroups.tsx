'use client';

import { useState, useEffect } from 'react';
import GroupCard from './GroupCard';

interface Group {
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
}

export default function CommunityGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');

  useEffect(() => {
    fetchGroups();
  }, [topicFilter]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (topicFilter) params.append('topic', topicFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/community/groups?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGroups();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white placeholder-teal-100/50 focus:outline-none focus:border-cyan-400"
          />
        </form>
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="px-4 py-2 bg-[#172421]/90 border border-teal-400/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
        >
          <option value="">All Topics</option>
          <option value="research">Research</option>
          <option value="development">Development</option>
          <option value="innovation">Innovation</option>
          <option value="open-source">Open Source</option>
          <option value="ai">AI</option>
          <option value="climate">Climate</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-teal-100/80">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-teal-100/80">No groups found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}






