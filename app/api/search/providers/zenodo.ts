/* SPDX-License-Identifier: MIT
 * Zenodo provider client for Open Idea federated search.
 */
import type { Resource } from '../../../../src/types/resource';

const ZENODO_ENDPOINT = 'https://zenodo.org/api/records';

/**
 * Search Zenodo for records matching the query.
 * @param q Query string
 * @returns Promise of Resource[]
 */
export async function searchZenodo(q: string, count: number = 30): Promise<Resource[]> {
  const url = `${ZENODO_ENDPOINT}?q=${encodeURIComponent(q)}&size=30`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Zenodo error: ${res.status}`);
    const data = await res.json();
    interface ZenodoMetadata {
      resource_type?: {
        type?: string;
      };
      title?: string;
      creators?: { name: string }[];
      publication_date?: string;
      description?: string;
      keywords?: string[];
      communities?: { id: string }[];
      relations?: {
        version?: { is_last?: boolean };
      };
      license?: {
        id?: string;
      };
    }

    interface ZenodoItem {
      links?: {
        html?: string;
      };
      id?: string;
      doi?: string;
      metadata?: ZenodoMetadata;
    }

    interface ZenodoResponse {
      hits?: {
        hits?: ZenodoItem[];
      };
    }

    return ((data as ZenodoResponse).hits?.hits || []).map((item) => {
      // Build a robust URL that always opens in a new tab
      const htmlUrl: string = (
        item?.links?.html
        || (item?.id ? `https://zenodo.org/records/${item.id}` : '')
        || (item?.doi ? `https://doi.org/${item.doi}` : '')
      ) as string;
      return {
        id: String(item.doi || item.id || ''),
        type: item.metadata?.resource_type?.type === 'dataset' ? 'dataset' : 'paper',
        title: item.metadata?.title,
        authors: item.metadata?.creators?.map((a: any) => a?.name).filter(Boolean) || [],
        year: item.metadata?.publication_date ? parseInt(item.metadata.publication_date.slice(0, 4)) : undefined,
        source: 'zenodo',
        url: htmlUrl,
        license: item.metadata?.license?.id || 'NOASSERTION',
        description: item.metadata?.description,
      } as Resource;
    });
  } catch (error) {
    // Fail gracefully - no need to handle the error
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
