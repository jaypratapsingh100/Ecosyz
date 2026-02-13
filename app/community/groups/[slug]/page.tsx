'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { Container } from '../../../components/ui/Container';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import DiscussionForm from '../../../components/community/DiscussionForm';
import DiscussionThread from '../../../components/community/DiscussionThread';

interface Group {
  id: string;
  name: string;
  description?: string;
  slug: string;
  topics: string[];
  avatarUrl?: string;
  bannerUrl?: string;
  isPublic: boolean;
  creator: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  members: Array<{
    id: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name?: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
  discussions: Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
    isPinned: boolean;
    createdAt: string;
    author: {
      id: string;
      name?: string;
      email: string;
      avatarUrl?: string;
    };
    _count: {
      replies: number;
    };
  }>;
  _count: {
    members: number;
    discussions: number;
  };
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateDiscussion, setShowCreateDiscussion] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<string | null>(null);
  const [showMembersSidebar, setShowMembersSidebar] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchGroup();
    }
  }, [slug]);

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/community/groups/by-slug/${slug}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Group not found');
          router.push('/community/groups');
          return;
        }
        throw new Error('Failed to fetch group');
      }
      const data = await res.json();
      setGroup(data);
      
      // Check if current user is a member
      checkMembership(data.id);
    } catch (error) {
      console.error('Error fetching group:', error);
      toast.error('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const checkMembership = async (groupId: string) => {
    try {
      const res = await fetch(`/api/community/groups/${groupId}/members`);
      if (res.ok) {
        const data = await res.json();
        // Check if current user is in members list
        // Note: This is a simplified check - you might want to get current user ID
        setIsMember(data.members?.length > 0);
      }
    } catch (error) {
      console.error('Error checking membership:', error);
    }
  };

  const handleJoin = async () => {
    if (!group) return;
    
    setIsJoining(true);
    try {
      const res = await fetch(`/api/community/groups/${group.id}/join`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join group');
      }

      toast.success('Successfully joined group!');
      setIsMember(true);
      fetchGroup(); // Refresh group data
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!group) return;
    
    setIsJoining(true);
    try {
      const res = await fetch(`/api/community/groups/${group.id}/leave`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to leave group');
      }

      toast.success('Left group successfully');
      setIsMember(false);
      fetchGroup(); // Refresh group data
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave group');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading group...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Group not found</h2>
            <Link href="/community/groups" className="text-cyan-400 hover:text-cyan-300">
              Back to Groups
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
          {/* Globe background image */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt="Digital Globe Background"
              fill
              className="object-cover object-right opacity-30"
              quality={100}
              priority
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
          </div>

          {/* Banner */}
          {group.bannerUrl && (
            <div className="h-48 w-full relative z-10">
              <Image
                src={group.bannerUrl}
                alt={group.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          <Container>
            <div className="relative z-10 py-8 text-white">
              {/* Group Header */}
              <div className="mb-8">
                <div className="flex items-start gap-6 mb-6">
                  {group.avatarUrl ? (
                    <img
                      src={group.avatarUrl}
                      alt={group.name}
                      className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-4xl font-bold text-gray-900 flex-shrink-0">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-bold text-cyan-300 mb-2 truncate">{group.name}</h1>
                        {group.description && (
                          <p className="text-teal-100/80 mb-4">{group.description}</p>
                        )}
                      </div>
                      {/* Members Sidebar Toggle Button */}
                      <button
                        onClick={() => setShowMembersSidebar(!showMembersSidebar)}
                        className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 rounded-lg hover:bg-cyan-500/30 transition flex items-center gap-2 text-sm flex-shrink-0"
                        title={showMembersSidebar ? 'Hide Members' : 'Show Members'}
                      >
                        <span>👥</span>
                        <span className="hidden sm:inline">{group._count.members}</span>
                        <span className="text-xs">{showMembersSidebar ? '←' : '→'}</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {group.topics.map((topic) => (
                        <span
                          key={topic}
                          className="px-3 py-1 text-sm bg-cyan-400/20 text-cyan-300 rounded-lg"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-teal-100/60 mb-4">
                      <span>{group._count.members} members</span>
                      <span>{group._count.discussions} discussions</span>
                      <span>Created by {group.creator.name || group.creator.email}</span>
                    </div>
                    {!isMember ? (
                      <button
                        onClick={handleJoin}
                        disabled={isJoining}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50"
                      >
                        {isJoining ? 'Joining...' : 'Join Group'}
                      </button>
                    ) : (
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={handleLeave}
                          disabled={isJoining}
                          className="px-6 py-2 border border-teal-400/20 text-teal-100/80 font-medium rounded-lg hover:bg-teal-400/10 transition disabled:opacity-50"
                        >
                          {isJoining ? 'Leaving...' : 'Leave Group'}
                        </button>
                        <button
                          onClick={() => setShowCreateDiscussion(!showCreateDiscussion)}
                          className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition"
                        >
                          {showCreateDiscussion ? 'Cancel' : '+ New Discussion'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Area with Sidebar */}
              <div className="flex gap-6 items-start relative">
                {/* Main Content */}
                <div className={`flex-1 min-w-0 ${showMembersSidebar ? 'lg:pr-0' : ''}`}>
                  {/* Create Discussion Form */}
                  {showCreateDiscussion && isMember && (
                    <div className="mb-8">
                      <DiscussionForm
                        groupId={group.id}
                        onSuccess={() => {
                          setShowCreateDiscussion(false);
                          fetchGroup();
                        }}
                      />
                    </div>
                  )}

                  {/* Discussions */}
                  <div>
                    <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Discussions</h2>
                    {selectedDiscussion ? (
                      <div>
                        <button
                          onClick={() => setSelectedDiscussion(null)}
                          className="mb-4 text-cyan-400 hover:text-cyan-300"
                        >
                          ← Back to discussions
                        </button>
                        <DiscussionThread discussionId={selectedDiscussion} />
                      </div>
                    ) : group.discussions.length === 0 ? (
                      <div className="text-center py-12 text-teal-100/80">
                        {isMember ? 'No discussions yet. Start one!' : 'Join the group to see discussions'}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {group.discussions.map((discussion) => (
                          <div
                            key={discussion.id}
                            onClick={() => setSelectedDiscussion(discussion.id)}
                            className="glass-card glass-border p-6 rounded-xl cursor-pointer hover:-translate-y-1 transition"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {discussion.isPinned && (
                                    <span className="text-yellow-400">📌</span>
                                  )}
                                  <h3 className="text-lg font-semibold text-cyan-300">
                                    {discussion.title}
                                  </h3>
                                </div>
                                <p className="text-teal-100/80 text-sm mb-3 line-clamp-2">
                                  {discussion.content}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-teal-100/60">
                                  <span>By {discussion.author.name || discussion.author.email}</span>
                                  <span>{discussion._count.replies} replies</span>
                                  <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Members Sidebar - Fixed Width, Sticky */}
                {showMembersSidebar && (
                  <div className="hidden lg:block w-72 flex-shrink-0">
                    <div className="sticky top-8 bg-[#0a0a0a] border border-teal-400/20 rounded-xl overflow-hidden flex flex-col shadow-lg max-h-[calc(100vh-8rem)]">
                      {/* Sidebar Header */}
                      <div className="p-4 border-b border-teal-400/20 flex items-center justify-between bg-[#0d0d0d] flex-shrink-0">
                        <h3 className="text-lg font-semibold text-cyan-300">
                          Members ({group._count.members})
                        </h3>
                      </div>

                      {/* Members List - Scrollable */}
                      <div className="overflow-y-auto p-4 flex-1 min-h-0">
                        {group.members.length === 0 ? (
                          <div className="text-center py-8 text-teal-100/80 text-sm">
                            No members yet
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {group.members.map((member) => (
                              <div
                                key={member.id}
                                className="glass-card glass-border p-3 rounded-lg flex items-center gap-3 hover:bg-teal-400/5 transition"
                              >
                                {member.user.avatarUrl ? (
                                  <img
                                    src={member.user.avatarUrl}
                                    alt={member.user.name || member.user.email}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-sm font-bold text-gray-900 flex-shrink-0">
                                    {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-cyan-300 truncate">
                                    {member.user.name || member.user.email}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-teal-100/60">
                                      {member.role === 'admin' && '👑 Admin'}
                                      {member.role === 'moderator' && '🛡️ Moderator'}
                                      {member.role === 'member' && 'Member'}
                                    </span>
                                    {member.user.id === group.creator.id && (
                                      <span className="text-xs text-yellow-400">Creator</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Members Sidebar */}
                {showMembersSidebar && (
                  <>
                    <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setShowMembersSidebar(false)} />
                    <div className="lg:hidden fixed top-0 right-0 h-full w-80 bg-[#0a0a0a] border-l border-teal-400/20 z-40 flex flex-col">
                      <div className="p-4 border-b border-teal-400/20 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-cyan-300">
                          Members ({group._count.members})
                        </h3>
                        <button
                          onClick={() => setShowMembersSidebar(false)}
                          className="text-teal-100/60 hover:text-white text-xl"
                          aria-label="Close sidebar"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        {group.members.length === 0 ? (
                          <div className="text-center py-8 text-teal-100/80 text-sm">
                            No members yet
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {group.members.map((member) => (
                              <div
                                key={member.id}
                                className="glass-card glass-border p-3 rounded-lg flex items-center gap-3"
                              >
                                {member.user.avatarUrl ? (
                                  <img
                                    src={member.user.avatarUrl}
                                    alt={member.user.name || member.user.email}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-sm font-bold text-gray-900 flex-shrink-0">
                                    {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-cyan-300 truncate">
                                    {member.user.name || member.user.email}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-teal-100/60">
                                      {member.role === 'admin' && '👑 Admin'}
                                      {member.role === 'moderator' && '🛡️ Moderator'}
                                      {member.role === 'member' && 'Member'}
                                    </span>
                                    {member.user.id === group.creator.id && (
                                      <span className="text-xs text-yellow-400">Creator</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
