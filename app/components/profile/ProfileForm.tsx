'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UpdateProfile } from '../../../src/lib/validation';
import AvatarUploader from './AvatarUploader';

interface ProfileFormData {
  displayName: string;
  bio?: string;
  // Extended basics
  location?: string;
  affiliation?: string;
  website?: string;
  // Roles & expertise
  primaryRole?: string;
  headline?: string;
  currentFocus?: string;
  lookingFor?: string;
  canHelpWith?: string;
  expertiseTags?: string[];
  // Founder‑specific
  startupName?: string;
  startupStage?: string;
  startupSector?: string;
  startupDescription?: string;
  // Researcher‑specific
  researchField?: string;
  researchInstitution?: string;
  researchSummary?: string;
  selectedPublications?: string;
  // Social / external
  orcidId?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  // Preferences
  preferences?: {
    theme: 'system' | 'light' | 'dark';
    language?: string;
    emailNotifications?: boolean;
    marketingEmails?: boolean;
  };
}

interface ProfileFormProps {
  initialData: {
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    // Extended basics
    location?: string;
    affiliation?: string;
    website?: string;
    // Roles & expertise
    primaryRole?: string;
    headline?: string;
    currentFocus?: string;
    lookingFor?: string;
    canHelpWith?: string;
    expertiseTags?: string[];
    // Founder‑specific
    startupName?: string;
    startupStage?: string;
    startupSector?: string;
    startupDescription?: string;
    // Researcher‑specific
    researchField?: string;
    researchInstitution?: string;
    researchSummary?: string;
    selectedPublications?: string;
    // Social / external
    orcidId?: string;
    githubUsername?: string;
    linkedinUrl?: string;
    twitterHandle?: string;
    // Preferences
    preferences: {
      theme: 'system' | 'light' | 'dark';
      language: string;
      emailNotifications: boolean;
      marketingEmails: boolean;
    };
  };
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [expertiseText, setExpertiseText] = useState(
    (initialData.expertiseTags || []).join(', ')
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(UpdateProfile),
    defaultValues: {
      displayName: initialData.displayName,
      bio: initialData.bio || '',
      location: initialData.location || '',
      affiliation: initialData.affiliation || '',
      website: initialData.website || '',
      primaryRole: initialData.primaryRole || '',
      headline: initialData.headline || '',
      currentFocus: initialData.currentFocus || '',
      lookingFor: initialData.lookingFor || '',
      canHelpWith: initialData.canHelpWith || '',
      startupName: initialData.startupName || '',
      startupStage: initialData.startupStage || '',
      startupSector: initialData.startupSector || '',
      startupDescription: initialData.startupDescription || '',
      researchField: initialData.researchField || '',
      researchInstitution: initialData.researchInstitution || '',
      researchSummary: initialData.researchSummary || '',
      selectedPublications: initialData.selectedPublications || '',
      orcidId: initialData.orcidId || '',
      githubUsername: initialData.githubUsername || '',
      linkedinUrl: initialData.linkedinUrl || '',
      twitterHandle: initialData.twitterHandle || '',
      preferences: initialData.preferences || {
        theme: 'system',
        language: 'en-IN',
        emailNotifications: true,
        marketingEmails: false,
      },
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const expertiseTags =
        expertiseText
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean) || [];

      const payload: ProfileFormData = {
        ...data,
        expertiseTags,
      };

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update profile';

        try {
          const errorData = await response.json();

          if (errorData) {
            if (typeof errorData.error === 'string' && errorData.error.length > 0) {
              errorMessage = errorData.error;
            } else if (typeof errorData.message === 'string' && errorData.message.length > 0) {
              errorMessage = errorData.message;
            }

            if (typeof errorData.details === 'string' && errorData.details.length > 0) {
              errorMessage += `: ${errorData.details}`;
            }
          }
        } catch {
          // Ignore JSON parse errors and use default message
        }

        throw new Error(errorMessage);
      }

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
  };

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Profile Picture
        </h2>
        <AvatarUploader
          currentAvatarUrl={avatarUrl}
          onAvatarUpdate={handleAvatarUpdate}
        />
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Personal Information
          </h2>

          <div className="space-y-4">
            {/* Display Name */}
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Display Name *
              </label>
              <input
                {...register('displayName')}
                type="text"
                id="displayName"
                data-testid="profile-displayName"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your display name"
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Bio
              </label>
              <textarea
                {...register('bio')}
                id="bio"
                data-testid="profile-bio"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="Tell us about yourself..."
              />
              {errors.bio && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.bio.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Public profile */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Public profile
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary role */}
            <div>
              <label
                htmlFor="primaryRole"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Primary role
              </label>
              <select
                {...register('primaryRole')}
                id="primaryRole"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select your primary role</option>
                <option value="founder">Founder</option>
                <option value="researcher">Researcher</option>
                <option value="student">Student</option>
                <option value="engineer">Engineer / Builder</option>
                <option value="operator">Operator</option>
                <option value="investor">Investor</option>
                <option value="community-organizer">Community organizer</option>
                <option value="policy">Policy / Gov</option>
                <option value="other">Other</option>
              </select>
              {errors.primaryRole && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.primaryRole.message}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Location
              </label>
              <input
                {...register('location')}
                id="location"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="City, Country"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.location.message}
                </p>
              )}
            </div>

            {/* Affiliation */}
            <div>
              <label
                htmlFor="affiliation"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Affiliation
              </label>
              <input
                {...register('affiliation')}
                id="affiliation"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="University, company, lab, or organization"
              />
              {errors.affiliation && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.affiliation.message}
                </p>
              )}
            </div>

            {/* Website */}
            <div>
              <label
                htmlFor="website"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Website
              </label>
              <input
                {...register('website')}
                id="website"
                type="url"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com"
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.website.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {/* Headline */}
            <div>
              <label
                htmlFor="headline"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Headline
              </label>
              <input
                {...register('headline')}
                id="headline"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="One-line summary visible on your profile"
              />
              {errors.headline && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.headline.message}
                </p>
              )}
            </div>

            {/* Current focus / Looking for / Can help with */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="currentFocus"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  What you&apos;re working on
                </label>
                <textarea
                  {...register('currentFocus')}
                  id="currentFocus"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe your main project or research focus."
                />
                {errors.currentFocus && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.currentFocus.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lookingFor"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  What you&apos;re looking for
                </label>
                <textarea
                  {...register('lookingFor')}
                  id="lookingFor"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Co-founders, collaborators, early users, funding, mentors..."
                />
                {errors.lookingFor && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.lookingFor.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="canHelpWith"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Where you can help others
                </label>
                <textarea
                  {...register('canHelpWith')}
                  id="canHelpWith"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Areas where you&apos;re happy to support others."
                />
                {errors.canHelpWith && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.canHelpWith.message}
                  </p>
                )}
              </div>
            </div>

            {/* Expertise tags (comma separated) */}
            <div>
              <label
                htmlFor="expertise"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Expertise tags
              </label>
              <input
                id="expertise"
                type="text"
                value={expertiseText}
                onChange={(e) => setExpertiseText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g. machine learning, climate, robotics"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Separate multiple tags with commas. These will appear as chips on your public profile.
              </p>
            </div>
          </div>
        </div>

        {/* Work, research & links */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Work, research & links
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Founder section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                If you&apos;re a founder
              </h3>
              <input
                {...register('startupName')}
                type="text"
                placeholder="Startup name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                {...register('startupStage')}
                type="text"
                placeholder="Stage (idea, prototype, MVP, revenue, scaling)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                {...register('startupSector')}
                type="text"
                placeholder="Sector (AI, climate, fintech, health, etc.)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              <textarea
                {...register('startupDescription')}
                rows={3}
                placeholder="One-paragraph description of what you are building."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Researcher section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                If you&apos;re a researcher
              </h3>
              <input
                {...register('researchField')}
                type="text"
                placeholder="Research field"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                {...register('researchInstitution')}
                type="text"
                placeholder="Institution or lab"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              <textarea
                {...register('researchSummary')}
                rows={3}
                placeholder="Short overview of your research focus."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              <textarea
                {...register('selectedPublications')}
                rows={3}
                placeholder="Selected publications, preprints, or links (one per line)."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Social links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="githubUsername"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                GitHub username
              </label>
              <input
                {...register('githubUsername')}
                id="githubUsername"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="linkedinUrl"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                LinkedIn URL
              </label>
              <input
                {...register('linkedinUrl')}
                id="linkedinUrl"
                type="url"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              {errors.linkedinUrl && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.linkedinUrl.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="twitterHandle"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                X / Twitter handle
              </label>
              <input
                {...register('twitterHandle')}
                id="twitterHandle"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="orcidId"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                ORCID iD
              </label>
              <input
                {...register('orcidId')}
                id="orcidId"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Preferences
          </h2>

          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <select
                {...register('preferences.theme')}
                data-testid="profile-theme"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label
                htmlFor="language"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Language
              </label>
              <select
                {...register('preferences.language')}
                id="language"
                data-testid="profile-language"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="en-IN">English (India)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
              </select>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center">
              <input
                {...register('preferences.emailNotifications')}
                type="checkbox"
                id="emailNotifications"
                data-testid="profile-emailNotifications"
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label
                htmlFor="emailNotifications"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Email notifications for important updates
              </label>
            </div>

            {/* Marketing Emails */}
            <div className="flex items-center">
              <input
                {...register('preferences.marketingEmails')}
                type="checkbox"
                id="marketingEmails"
                data-testid="profile-marketingEmails"
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label
                htmlFor="marketingEmails"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Marketing emails and newsletters
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !isDirty}
            data-testid="profile-save"
            className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}