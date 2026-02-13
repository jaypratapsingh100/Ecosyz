'use client';

import { useEffect, useState } from 'react';
import SocialShareButtons from '../../components/ui/SocialShareButtons';

interface SharePageSocialShareProps {
  token: string;
  workspaceTitle: string;
}

export default function SharePageSocialShare({ token, workspaceTitle }: SharePageSocialShareProps) {
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(`${window.location.origin}/share/${token}`);
  }, [token]);

  return (
    <div className="flex items-center gap-3 mt-3">
      <span className="text-sm text-teal-100/70">Share:</span>
      {shareUrl ? (
        <SocialShareButtons
          url={shareUrl}
          title={workspaceTitle}
          text={`Check out "${workspaceTitle}" on Open Idea`}
          size="md"
        />
      ) : (
        <span className="text-xs text-zinc-500">Loading...</span>
      )}
    </div>
  );
}
