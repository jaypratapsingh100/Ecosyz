'use client';

import { useState, useEffect } from 'react';

interface FollowButtonProps {
  userId: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ userId, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [userId]);

  const checkFollowStatus = async () => {
    try {
      // Check if current user is following this user
      // This would require getting current user ID, which we can do via session
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData.user) {
          // Check follow status - we'd need an endpoint for this
          // For now, we'll assume not following initially
          setIsFollowing(false);
        }
      }
    } catch (error) {
      console.error('Failed to check follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/community/users/${userId}/follow`, {
        method: 'POST',
      });

      if (res.ok) {
        setIsFollowing(true);
        if (onFollowChange) onFollowChange(true);
      }
    } catch (error) {
      console.error('Failed to follow user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/community/users/${userId}/unfollow`, {
        method: 'POST',
      });

      if (res.ok) {
        setIsFollowing(false);
        if (onFollowChange) onFollowChange(false);
      }
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={isFollowing ? handleUnfollow : handleFollow}
      disabled={actionLoading}
      className={`px-4 py-2 rounded-lg font-semibold transition ${
        isFollowing
          ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
          : 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 hover:scale-105'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {actionLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
}






