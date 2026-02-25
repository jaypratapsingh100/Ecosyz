'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { Container } from '../../../components/ui/Container';
import ActivityFeed from '../../../components/community/ActivityFeed';
import FollowButton from '../../../components/community/FollowButton';

interface Profile {
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

interface UserResponse {
  id: string;
  name?: string | null;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
  profile?: Profile | null;
  _count?: {
    following: number;
    followers: number;
    discussions: number;
    groupMembers: number;
    createdEvents: number;
    challengeSubmissions: number;
  };
}

export default function CommunityUserProfilePage() {
  const params = useParams();
  const userId = params?.id as string | undefined;

  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/community/users/${userId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('User not found');
            return;
          }
          throw new Error('Failed to load user profile');
        }

        const data = (await res.json()) as UserResponse;
        setUser(data);
      } catch (err) {
        console.error('Failed to fetch community user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const displayName =
    user?.profile?.displayName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Community member';

  const avatarSrc = user?.profile?.avatarUrl ?? user?.avatarUrl ?? null;

  const memberSince =
    user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt="Digital Globe Background"
              fill
              className="object-cover object-right opacity-30"
              quality={100}
              priority
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl" />
          </div>

          <Container>
            <div className="relative z-10 py-12 text-white">
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-teal-100/80">Loading profile...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-24">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-rose-300 mb-2">
                      {error}
                    </h1>
                    <p className="text-teal-100/70 text-sm">
                      Try going back to the community page and selecting another member.
                    </p>
                  </div>
                </div>
              ) : !user ? (
                <div className="flex items-center justify-center py-24">
                  <p className="text-teal-100/80">User profile is unavailable.</p>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-10">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      {avatarSrc ? (
                        <Image
                          src={avatarSrc}
                          alt={displayName}
                          width={80}
                          height={80}
                          className="rounded-2xl border border-teal-400/30 object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-3xl font-bold text-gray-900">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-cyan-300">
                          {displayName}
                        </h1>
                        <p className="text-sm text-teal-100/70">
                          {user.email}
                          {memberSince && (
                            <span className="ml-2 text-teal-100/50">
                              · Member since {memberSince}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="md:ml-auto flex items-center gap-4">
                      <FollowButton userId={user.id} />
                    </div>
                  </div>

                  {/* Stats & Bio */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 glass-card glass-border p-6 rounded-xl space-y-3">
                      <h2 className="text-lg font-semibold text-emerald-300">
                        About
                      </h2>
                      <p className="text-sm text-teal-100/80 whitespace-pre-wrap">
                        {user.profile?.bio ||
                          'This member has not added a bio yet.'}
                      </p>
                    </div>
                    <div className="glass-card glass-border p-6 rounded-xl space-y-3">
                      <h2 className="text-lg font-semibold text-emerald-300">
                        Community stats
                      </h2>
                      <div className="space-y-2 text-sm text-teal-100/80">
                        <div className="flex items-center justify-between">
                          <span>Followers</span>
                          <span className="font-semibold">
                            {user._count?.followers ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Following</span>
                          <span className="font-semibold">
                            {user._count?.following ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Group memberships</span>
                          <span className="font-semibold">
                            {user._count?.groupMembers ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Discussions started</span>
                          <span className="font-semibold">
                            {user._count?.discussions ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Events created</span>
                          <span className="font-semibold">
                            {user._count?.createdEvents ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Challenge submissions</span>
                          <span className="font-semibold">
                            {user._count?.challengeSubmissions ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activity */}
                  <div className="glass-card glass-border p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-emerald-300">
                        Recent activity
                      </h2>
                    </div>
                    <ActivityFeed userId={user.id} />
                  </div>
                </div>
              )}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

