'use client';

import Image from 'next/image';
import ActivityFeed from './ActivityFeed';
import FollowButton from './FollowButton';

export interface CommunityProfile {
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  portfolioImageUrl?: string | null;
  // Extended basics
  location?: string | null;
  affiliation?: string | null;
  website?: string | null;
  // Roles & expertise
  primaryRole?: string | null;
  roles?: string[] | null;
  expertiseTags?: string[] | null;
  // Deeper about
  headline?: string | null;
  currentFocus?: string | null;
  lookingFor?: string | null;
  canHelpWith?: string | null;
  // Founder
  startupName?: string | null;
  startupStage?: string | null;
  startupSector?: string | null;
  startupDescription?: string | null;
  // Researcher
  researchField?: string | null;
  researchInstitution?: string | null;
  researchSummary?: string | null;
  selectedPublications?: string | null;
  // Social / external
  orcidId?: string | null;
  githubUsername?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
}

export interface CommunityUserResponse {
  id: string;
  name?: string | null;
  email: string;
  avatarUrl?: string | null;
  createdAt: string | Date;
  profile?: CommunityProfile | null;
  _count?: {
    following: number;
    followers: number;
    discussions: number;
    groupMembers: number;
    createdEvents: number;
    challengeSubmissions: number;
  };
}

interface UserProfileViewProps {
  user: CommunityUserResponse;
  showFollowButton?: boolean;
  showActivity?: boolean;
}

export function UserProfileView({
  user,
  showFollowButton = true,
  showActivity = true,
}: UserProfileViewProps) {
  const displayName =
    user.profile?.displayName ||
    user.name ||
    user.email?.split('@')[0] ||
    'Community member';

  const avatarSrc = user.profile?.avatarUrl ?? user.avatarUrl ?? null;

  const memberSince =
    user.createdAt != null
      ? new Date(user.createdAt).toLocaleDateString()
      : undefined;

  const primaryRole = user.profile?.primaryRole;
  const headline = user.profile?.headline;
  const location = user.profile?.location;
  const portfolioImageUrl = user.profile?.portfolioImageUrl;
  const affiliation = user.profile?.affiliation;
  const website = user.profile?.website;
  const expertiseTags = user.profile?.expertiseTags ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-10 text-white">
      {/* Portfolio cover image (optional) */}
      {portfolioImageUrl && (
        <div className="relative w-full aspect-[21/9] max-h-48 rounded-xl overflow-hidden -mx-4 sm:mx-0">
          <Image
            src={portfolioImageUrl}
            alt={`${displayName} portfolio cover`}
            fill
            className="object-cover"
            unoptimized={portfolioImageUrl.includes('/storage/') || portfolioImageUrl.includes('licdn.com') || portfolioImageUrl.includes('dicebear.com')}
          />
        </div>
      )}

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
            {headline && (
              <p className="mt-1 text-sm text-teal-100/80">{headline}</p>
            )}
            <p className="mt-1 text-sm text-teal-100/70">
              {user.email}
              {primaryRole && (
                <span className="ml-2 text-emerald-300/80 font-medium">
                  · {primaryRole}
                </span>
              )}
              {memberSince && (
                <span className="ml-2 text-teal-100/50">
                  · Member since {memberSince}
                </span>
              )}
            </p>
          </div>
        </div>
        {showFollowButton && (
          <div className="md:ml-auto flex items-center gap-4">
            <FollowButton userId={user.id} />
          </div>
        )}
      </div>

      {/* Stats & Bio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* About & extended sections */}
        <div className="md:col-span-2 space-y-4">
          <div className="glass-card glass-border p-6 rounded-xl space-y-3">
            <h2 className="text-lg font-semibold text-emerald-300">About</h2>
            <p className="text-sm text-teal-100/80 whitespace-pre-wrap">
              {user.profile?.bio ||
                'This member has not added a bio yet.'}
            </p>
          </div>

          {(user.profile?.currentFocus ||
            user.profile?.lookingFor ||
            user.profile?.canHelpWith) && (
            <div className="glass-card glass-border p-6 rounded-xl space-y-4">
              {user.profile?.currentFocus && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-300">
                    Currently working on
                  </h3>
                  <p className="mt-1 text-sm text-teal-100/80 whitespace-pre-wrap">
                    {user.profile.currentFocus}
                  </p>
                </div>
              )}
              {user.profile?.lookingFor && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-300">
                    Looking for
                  </h3>
                  <p className="mt-1 text-sm text-teal-100/80 whitespace-pre-wrap">
                    {user.profile.lookingFor}
                  </p>
                </div>
              )}
              {user.profile?.canHelpWith && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-300">
                    Can help with
                  </h3>
                  <p className="mt-1 text-sm text-teal-100/80 whitespace-pre-wrap">
                    {user.profile.canHelpWith}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: quick facts & stats */}
        <div className="space-y-4">
          <div className="glass-card glass-border p-6 rounded-xl space-y-3">
            <h2 className="text-lg font-semibold text-emerald-300">
              Profile
            </h2>
            <div className="space-y-2 text-sm text-teal-100/80">
              {location && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-teal-100/70">Location</span>
                  <span className="font-semibold text-right">
                    {location}
                  </span>
                </div>
              )}
              {affiliation && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-teal-100/70">Affiliation</span>
                  <span className="font-semibold text-right">
                    {affiliation}
                  </span>
                </div>
              )}
              {website && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-teal-100/70">Website</span>
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-300 hover:text-emerald-200 truncate text-right"
                  >
                    {website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {expertiseTags.length > 0 && (
                <div>
                  <span className="text-teal-100/70 block mb-1">
                    Expertise
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {expertiseTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-xs text-emerald-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
      </div>

      {/* Activity */}
      {showActivity && (
        <div className="glass-card glass-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-emerald-300">
              Recent activity
            </h2>
          </div>
          <ActivityFeed userId={user.id} />
        </div>
      )}
    </div>
  );
}

