/* SPDX-License-Identifier: MIT
 * Code provider client for Open Idea federated search.
 */
import type { Resource } from '../../../../src/types/resource';

// Example: GitHub code search API (public endpoints are rate-limited)
const GITHUB_SEARCH_ENDPOINT = 'https://api.github.com/search/repositories';

/**
 * Parse GitHub API response to Resource[]
 */
interface GithubRepo {
  id: number;
  html_url: string;
  full_name: string;
  name: string;
  owner?: { login: string };
  created_at?: string;
  license?: { spdx_id?: string; name?: string };
  description?: string;
  topics?: string[];
  stargazers_count?: number;
  forks_count?: number;
  language?: string;
}

interface GithubResponse {
  items?: GithubRepo[];
}

function parseGithubRepos(json: GithubResponse): Resource[] {
  if (!json.items) return [];
  return json.items.map((repo) => ({
    id: repo.id ? String(repo.id) : repo.html_url,
    type: 'code',
    title: repo.full_name || repo.name,
    authors: repo.owner ? [repo.owner.login] : [],
    year: repo.created_at ? parseInt(repo.created_at.slice(0, 4)) : undefined,
    source: 'github',
    url: repo.html_url,
    license: repo.license?.spdx_id || repo.license?.name || 'NOASSERTION',
    description: repo.description || '',
    tags: repo.topics || [],
    meta: {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
    },
  }));
}

/**
 * Search GitHub for code repositories matching the query.
 * @param q Query string
 * @returns Promise of Resource[]
 */
export async function searchGithubCode(q: string, count: number = 30): Promise<Resource[]> {
  const url = `${GITHUB_SEARCH_ENDPOINT}?q=${encodeURIComponent(q)}&per_page=${count}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`GitHub error: ${res.status}`);
    const json = await res.json();
    return parseGithubRepos(json);
  } catch (error) {
    // Fail gracefully - no need to handle the error
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
