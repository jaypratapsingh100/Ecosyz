'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  type: string;
  entityType?: string;
  entityId?: string;
  title?: string;
  description?: string;
  createdAt: string;
}

interface ActivityFeedProps {
  userId?: string;
}

export default function ActivityFeed({ userId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [userId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const url = userId
        ? `/api/community/users/${userId}/activity`
        : '/api/community/activity';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      group_created: '👥',
      group_joined: '➕',
      discussion_created: '💬',
      reply_added: '↩️',
      event_created: '📅',
      event_registered: '✅',
      challenge_created: '🏆',
      challenge_submitted: '📝',
      user_followed: '👤',
    };
    return icons[type] || '📌';
  };

  if (loading) {
    return <div className="text-center py-12 text-teal-100/80">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return <div className="text-center py-12 text-teal-100/80">No activity yet</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="glass-card glass-border p-4 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{getActivityIcon(activity.type)}</span>
            <div className="flex-1">
              {activity.title && (
                <p className="text-cyan-300 font-semibold mb-1">{activity.title}</p>
              )}
              {activity.description && (
                <p className="text-teal-100/80 text-sm">{activity.description}</p>
              )}
              <p className="text-teal-100/60 text-xs mt-2">
                {new Date(activity.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


