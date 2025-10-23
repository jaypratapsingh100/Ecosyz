/* SPDX-License-Identifier: MIT
 * arXiv provider client for Open Idea federated search.
 */
import type { Resource } from '../../../../src/types/resource';

const ARXIV_ENDPOINT = 'https://export.arxiv.org/api/query';

/**
 * Parse arXiv Atom XML to Resource[]
 */
function parseArxivAtom(xml: string): Resource[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const entries = Array.from(doc.getElementsByTagName('entry'));
  return entries.map((entry) => {
    const id = entry.getElementsByTagName('id')[0]?.textContent || '';
    const title = entry.getElementsByTagName('title')[0]?.textContent?.trim() || '';
    const authors = Array.from(entry.getElementsByTagName('author')).map(a => a.getElementsByTagName('name')[0]?.textContent || '');
    const year = entry.getElementsByTagName('published')[0]?.textContent?.slice(0,4);
    const summary = entry.getElementsByTagName('summary')[0]?.textContent?.trim() || '';
    const license = entry.getElementsByTagName('arxiv:license')[0]?.textContent || 'NOASSERTION';
    return {
      id,
      type: 'paper',
      title,
      authors,
      year: year ? parseInt(year) : undefined,
      source: 'arxiv',
      url: id,
      license,
      description: summary,
    };
  });
}

/**
 * Search arXiv for papers matching the query.
 * @param q Query string
 * @returns Promise of Resource[]
 */
export async function searchArxiv(q: string, count: number = 30): Promise<Resource[]> {
  const url = `${ARXIV_ENDPOINT}?search_query=all:${encodeURIComponent(q)}&max_results=30`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`arXiv error: ${res.status}`);
    const xml = await res.text();
    return parseArxivAtom(xml);
  } catch (error) {
    // Fail gracefully - no need to handle the error
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
