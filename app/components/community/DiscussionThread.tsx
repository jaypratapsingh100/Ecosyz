'use client';

import { useState, useEffect } from 'react';
import DiscussionForm from './DiscussionForm';

interface Reply {
  id: string;
  content: string;
  author: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

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
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  replies: Reply[];
  _count: {
    replies: number;
  };
}

interface DiscussionThreadProps {
  discussionId: string;
  canReply?: boolean;
}

export default function DiscussionThread({ discussionId, canReply = true }: DiscussionThreadProps) {
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReplyForm, setShowReplyForm] = useState(false);

  useEffect(() => {
    fetchDiscussion();
  }, [discussionId]);

  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/community/discussions/${discussionId}`);
      if (res.ok) {
        const data = await res.json();
        setDiscussion(data);
      }
    } catch (error) {
      console.error('Failed to fetch discussion:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplyAdded = () => {
    setShowReplyForm(false);
    fetchDiscussion();
  };

  if (loading) {
    return <div className="text-center py-8 text-teal-100/80">Loading...</div>;
  }

  if (!discussion) {
    return <div className="text-center py-8 text-teal-100/80">Discussion not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass-card glass-border p-6 rounded-xl">
        <div className="flex items-start gap-4 mb-4">
          {discussion.author.avatarUrl ? (
            <img
              src={discussion.author.avatarUrl}
              alt={discussion.author.name || discussion.author.email}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-white font-semibold">
              {(discussion.author.name || discussion.author.email).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold text-cyan-300">{discussion.title}</h2>
              {discussion.isPinned && (
                <span className="px-2 py-1 text-xs bg-yellow-400/20 text-yellow-300 rounded">
                  Pinned
                </span>
              )}
              {discussion.isLocked && (
                <span className="px-2 py-1 text-xs bg-red-400/20 text-red-300 rounded">
                  Locked
                </span>
              )}
            </div>
            <p className="text-sm text-teal-100/60 mb-2">
              by {discussion.author.name || discussion.author.email} •{' '}
              {new Date(discussion.createdAt).toLocaleDateString()}
            </p>
            {discussion.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
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
            <div className="text-teal-100/80 whitespace-pre-wrap">{discussion.content}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cyan-300">
            {discussion.replies.length} {discussion.replies.length === 1 ? 'Reply' : 'Replies'}
          </h3>
          {canReply && !discussion.isLocked && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition"
            >
              {showReplyForm ? 'Cancel' : 'Reply'}
            </button>
          )}
        </div>

        {showReplyForm && (
          <DiscussionForm
            discussionId={discussionId}
            onSuccess={handleReplyAdded}
            mode="reply"
          />
        )}

        {discussion.replies.map((reply) => (
          <div key={reply.id} className="glass-card glass-border p-4 rounded-xl ml-8">
            <div className="flex items-start gap-3">
              {reply.author.avatarUrl ? (
                <img
                  src={reply.author.avatarUrl}
                  alt={reply.author.name || reply.author.email}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-white font-semibold text-sm">
                  {(reply.author.name || reply.author.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-teal-100/60 mb-2">
                  {reply.author.name || reply.author.email} •{' '}
                  {new Date(reply.createdAt).toLocaleDateString()}
                </p>
                <div className="text-teal-100/80 whitespace-pre-wrap">{reply.content}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


