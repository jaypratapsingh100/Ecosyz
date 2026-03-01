'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_SIZE = 4 * 1024 * 1024; // 4MB

// Round cartoon avatar (DiceBear avataaars) - no real person's image
const CARTOON_AVATAR_URL =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=profile&backgroundColor=b6e3f4';

interface PortfolioImageUploaderProps {
  currentImageUrl?: string | null;
  onImageUpdate: (imageUrl: string | null) => void;
}

export default function PortfolioImageUploader({
  currentImageUrl,
  onImageUpdate,
}: PortfolioImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchingLinkedIn, setFetchingLinkedIn] = useState(false);
  const [settingUrl, setSettingUrl] = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error('Please select a JPG, PNG or WebP image');
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error('File size must be less than 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    await handleUpload(file);
    event.target.value = '';
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('portfolioImage', file);

      const response = await fetch('/api/profile/portfolio-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      const portfolioImageUrl = data.portfolioImageUrl as string;
      onImageUpdate(portfolioImageUrl);
      setPreviewUrl(portfolioImageUrl);

      toast.success('Portfolio image updated!');
    } catch (error) {
      console.error('Portfolio image upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/profile/portfolio-image', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove image');
      }

      onImageUpdate(null);
      setPreviewUrl(null);

      toast.success('Portfolio image removed');
    } catch (error) {
      console.error('Portfolio image remove error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove image');
    } finally {
      setDeleting(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFetchFromLinkedIn = async () => {
    const url = linkedInUrl.trim();
    if (!url) {
      toast.error('Please enter your LinkedIn profile URL');
      return;
    }
    if (!url.includes('linkedin.com')) {
      toast.error('Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/username)');
      return;
    }

    setFetchingLinkedIn(true);
    try {
      const response = await fetch('/api/profile/portfolio-image/from-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch from LinkedIn');
      }

      const portfolioImageUrl = data.portfolioImageUrl as string;
      onImageUpdate(portfolioImageUrl);
      setPreviewUrl(portfolioImageUrl);
      setLinkedInUrl('');

      toast.success('Portfolio image set from LinkedIn!');
    } catch (error) {
      console.error('LinkedIn fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch from LinkedIn');
    } finally {
      setFetchingLinkedIn(false);
    }
  };

  const handleSetUrl = async (url: string) => {
    if (!url.trim()) return;
    setSettingUrl(true);
    try {
      const response = await fetch('/api/profile/portfolio-image', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioImageUrl: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to set image');
      onImageUpdate(data.portfolioImageUrl);
      setPreviewUrl(data.portfolioImageUrl);
      setPasteUrl('');
      toast.success('Portfolio image updated!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set image');
    } finally {
      setSettingUrl(false);
    }
  };

  const isBusy = uploading || deleting || fetchingLinkedIn || settingUrl;

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[21/9] max-h-48 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
        {previewUrl ? (
          previewUrl.startsWith('data:') ? (
            <img
              src={previewUrl}
              alt="Portfolio cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={previewUrl}
              alt="Portfolio cover"
              fill
              className="object-cover"
              unoptimized={previewUrl.startsWith('blob:') || previewUrl.includes('/storage/') || previewUrl.includes('licdn.com') || previewUrl.includes('dicebear.com')}
            />
          )
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
            Optional portfolio cover image
          </span>
        )}
        {(uploading || deleting || settingUrl || fetchingLinkedIn) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileSelect}
          className="hidden"
          data-testid="portfolio-image-input"
        />
        <button
          type="button"
          onClick={handleClick}
          disabled={isBusy}
          data-testid="portfolio-image-upload"
          className="px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-600 dark:border-emerald-400 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : previewUrl ? 'Change image' : 'Upload image'}
        </button>
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isBusy}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? 'Removing...' : 'Remove'}
          </button>
        )}
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Paste your image URL
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Paste a direct image link (e.g. from LinkedIn: right‑click your profile photo → Copy image address)
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="https://media.licdn.com/... or any image URL"
              className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={isBusy}
            />
            <button
              type="button"
              onClick={() => handleSetUrl(pasteUrl)}
              disabled={isBusy || !pasteUrl.trim()}
              className="px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-600 dark:border-emerald-400 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Use URL
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Or paste LinkedIn profile URL (we&apos;ll try to fetch your photo)
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://linkedin.com/in/your-username"
              className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={isBusy}
            />
            <button
              type="button"
              onClick={handleFetchFromLinkedIn}
              disabled={isBusy || !linkedInUrl.trim()}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {fetchingLinkedIn ? 'Fetching...' : 'Fetch from LinkedIn'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Or use a round cartoon avatar
          </p>
          <button
            type="button"
            onClick={() => handleSetUrl(CARTOON_AVATAR_URL)}
            disabled={isBusy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            <img
              src={CARTOON_AVATAR_URL}
              alt="Cartoon avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
            Use cartoon avatar
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            A round, cartoon-style placeholder (no real person&apos;s image).
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Max 4MB upload, JPG/PNG/WebP. Shown as a cover on your public profile.
      </p>
    </div>
  );
}
