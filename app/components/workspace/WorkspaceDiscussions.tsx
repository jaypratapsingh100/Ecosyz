'use client';

import { useState, useEffect } from 'react';
import DiscussionForm from '../community/DiscussionForm';
import DiscussionThread from '../community/DiscussionThread';

interface Discussion {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  tags: string[];
  createdAt: string;
  _count: {
    replies: number;
  };
}

interface WorkspaceDiscussionsProps {
  workspaceId: string;
}

export default function WorkspaceDiscussions({ workspaceId }: WorkspaceDiscussionsProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscussion, setSelectedDiscussion] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, [workspaceId]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/community/discussions?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setDiscussions(data.discussions || []);
      }
    } catch (error) {
      console.error('Failed to fetch discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscussionCreated = () => {
    setShowForm(false);
    fetchDiscussions();
  };

  if (selectedDiscussion) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedDiscussion(null)}
          className="text-cyan-400 hover:text-cyan-300 mb-4"
        >
          ← Back to discussions
        </button>
        <DiscussionThread discussionId={selectedDiscussion} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100">Discussions</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition"
        >
          {showForm ? 'Cancel' : 'New Discussion'}
        </button>
      </div>

      {showForm && (
        <DiscussionForm
          workspaceId={workspaceId}
          onSuccess={handleDiscussionCreated}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-zinc-400">Loading discussions...</div>
      ) : discussions.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl">
          <div className="text-zinc-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No discussions yet</h3>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Start a discussion to collaborate with your team.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <div
              key={discussion.id}
              onClick={() => setSelectedDiscussion(discussion.id)}
              className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 cursor-pointer hover:border-cyan-400/50 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-zinc-100">{discussion.title}</h3>
                <span className="text-sm text-zinc-400">
                  {discussion._count.replies} {discussion._count.replies === 1 ? 'reply' : 'replies'}
                </span>
              </div>
              <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{discussion.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {discussion.author.avatarUrl ? (
                    <img
                      src={discussion.author.avatarUrl}
                      alt={discussion.author.name || discussion.author.email}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-white text-xs font-semibold">
                      {(discussion.author.name || discussion.author.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-zinc-500">
                    {discussion.author.name || discussion.author.email}
                  </span>
                </div>
                <span className="text-sm text-zinc-500">
                  {new Date(discussion.createdAt).toLocaleDateString()}
                </span>
              </div>
              {discussion.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {discussion.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-cyan-400/20 text-cyan-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

