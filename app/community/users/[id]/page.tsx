'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { Container } from '../../../components/ui/Container';
import { UserProfileView, type CommunityUserResponse } from '../../../components/community/UserProfileView';

export default function CommunityUserProfilePage() {
  const params = useParams();
  const userId = params?.id as string | undefined;

  const [user, setUser] = useState<CommunityUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

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

        const data = (await res.json()) as CommunityUserResponse;
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

  // Determine if the currently viewed profile belongs to the logged-in user
  useEffect(() => {
    if (!userId) return;

    const checkOwnProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.userId && data.userId === userId) {
          setIsOwnProfile(true);
        }
      } catch (err) {
        // Best-effort only; if this fails we simply treat it as another user's profile
        console.error('Failed to check if viewing own profile:', err);
      }
    };

    checkOwnProfile();
  }, [userId]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
          {/* Globe background image */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt="Digital globe background"
              fill
              className="object-cover object-right opacity-30"
              quality={100}
              priority
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl" />
          </div>
          <Container>
            <div className="relative z-10 py-12">
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
                <div className="space-y-6">
                  <UserProfileView user={user} showFollowButton={!isOwnProfile} />
                  {isOwnProfile && (
                    <div className="flex justify-end">
                      <Link
                        href="/profile"
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        Edit profile
                      </Link>
                    </div>
                  )}
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

