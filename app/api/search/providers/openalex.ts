/* SPDX-License-Identifier: MIT
 * OpenAlex provider client for Open Idea federated search.
 */
import type { Resource } from '../../../../src/types/resource';

const OPENALEX_ENDPOINT = 'https://api.openalex.org/works';

/**
 * Search OpenAlex for works matching the query.
 * @param q Query string
 * @returns Promise of Resource[]
 */
export async function searchOpenAlex(q: string, count: number = 30): Promise<Resource[]> {
  const url = `${OPENALEX_ENDPOINT}?search=${encodeURIComponent(q)}&per-page=${count}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`OpenAlex error: ${res.status}`);
    const data = await res.json();
    interface OpenAlexAuthor {
      author: {
        display_name: string;
      };
    }

    interface OpenAlexItem {
      doi?: string;
      id: string;
      title: string;
      authors?: OpenAlexAuthor[];
      publication_year?: number;
      license?: string;
      abstract_inverted_index?: Record<string, unknown>;
    }

    interface OpenAlexResponse {
      results?: OpenAlexItem[];
    }

    return ((data as OpenAlexResponse).results || []).map((item) => ({
      id: item.doi || item.id,
      type: 'paper',
      title: item.title,
      authors: item.authors?.map((a: any) => a.author.display_name) || [],
      year: item.publication_year,
      source: 'openalex',
      url: item.id,
      license: item.license || 'NOASSERTION',
      description: item.abstract_inverted_index ? Object.keys(item.abstract_inverted_index).join(' ') : undefined,
    }));
  } catch (error) {
    // Fail gracefully - no need to handle the error
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
