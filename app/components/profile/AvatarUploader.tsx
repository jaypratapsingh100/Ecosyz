'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

interface AvatarUploaderProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (avatarUrl: string) => void;
}

export default function AvatarUploader({ currentAvatarUrl, onAvatarUpdate }: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error('Please select a JPG, PNG or WebP image');
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error('File size must be less than 2MB');
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
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      const avatarUrl = data.avatarUrl as string;
      onAvatarUpdate(avatarUrl);
      setPreviewUrl(avatarUrl);
      toast.success('Avatar updated successfully!');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
          {previewUrl ? (
            previewUrl.startsWith('data:') ? (
              <img
                src={previewUrl}
                alt="Profile avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={previewUrl}
                alt="Profile avatar"
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized={previewUrl.startsWith('blob:') || previewUrl.includes('/storage/')}
              />
            )
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400 text-center px-2">
              Profile avatar
            </span>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileSelect}
          className="hidden"
          data-testid="avatar-input"
        />
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          data-testid="avatar-upload"
          className="px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-600 dark:border-emerald-400 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Change Avatar'}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Max 2MB, JPG/PNG/WebP
        </p>
      </div>
    </div>
  );
}
