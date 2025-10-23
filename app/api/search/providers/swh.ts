/* SPDX-License-Identifier: MIT
 * Software Heritage provider client for Open Idea federated search.
 */
import type { Resource } from '../../../../src/types/resource';

const SWH_ENDPOINT = 'https://archive.softwareheritage.org/api/1/search/';

/**
 * Search Software Heritage for code artifacts matching the query.
 * @param q Query string
 * @returns Promise of Resource[]
 */
export async function searchSoftwareHeritage(q: string, count: number = 30): Promise<Resource[]> {
  const url = `${SWH_ENDPOINT}origin/?q=${encodeURIComponent(q)}&limit=${count}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`SWH error: ${res.status}`);
    const data = await res.json();
    interface SWHItem {
      swhid?: string;
      url?: string;
      title?: string;
      authors?: string[];
      date?: string;
      license?: string;
      summary?: string;
    }

    interface SWHResponse {
      results?: SWHItem[];
    }

    return ((data as SWHResponse).results || []).map((item) => ({
      id: item.swhid || item.url || 'no-id',
      type: 'code',
      title: item.title || item.url || 'Untitled',
      authors: item.authors || [],
      year: item.date ? parseInt(item.date.slice(0,4)) : undefined,
      source: 'swh',
      url: String(item.url || ''),
      license: item.license || 'NOASSERTION',
      description: item.summary,
    }));
  } catch (error) {
    // Fail gracefully - no need to handle the error
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
