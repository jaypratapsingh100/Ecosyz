/* SPDX-License-Identifier: MIT
 * YouTube video provider client for Open Idea federated search.
 */
import type { Resource } from '../../../../src/types/resource';

// NOTE: This uses the public YouTube Data API v3. You need an API key for production use.
const YT_SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const YT_API_KEY = process.env.YOUTUBE_API_KEY || '';

interface YouTubeSnippet {
  title?: string;
  channelTitle?: string;
  publishedAt?: string;
  description?: string;
  tags?: string[];
}

interface YouTubeItem {
  id: {
    videoId?: string;
  } | string;
  snippet?: YouTubeSnippet;
  contentDetails?: {
    duration?: string;
  };
}

interface YouTubeResponse {
  items?: YouTubeItem[];
}

function parseYouTubeVideos(json: YouTubeResponse): Resource[] {
  if (!json.items) return [];
  return json.items.map((item) => {
    const vid = typeof item.id === 'string' ? item.id : (item.id.videoId || '');
    return {
      id: vid,
      type: 'video',
      title: item.snippet?.title || '',
      authors: [item.snippet?.channelTitle || 'YouTube'],
      year: item.snippet?.publishedAt ? parseInt(item.snippet.publishedAt.slice(0, 4)) : undefined,
      source: 'youtube',
      url: `https://www.youtube.com/watch?v=${vid}`,
      license: 'NOASSERTION',
      description: item.snippet?.description || '',
      tags: item.snippet?.tags || [],
      meta: {
        channel: item.snippet?.channelTitle,
        duration: item.contentDetails?.duration,
      },
    };
  });
}

export async function searchYouTubeVideos(q: string, count: number = 30): Promise<Resource[]> {
  if (!YT_API_KEY) return [];
  const url = `${YT_SEARCH_ENDPOINT}?part=snippet&type=video&maxResults=${count}&q=${encodeURIComponent(q)}&key=${YT_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  // For demo, skip fetching durations (requires extra API call)
  return parseYouTubeVideos(json);
}
