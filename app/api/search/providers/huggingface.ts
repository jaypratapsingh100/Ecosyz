/* SPDX-License-Identifier: MIT
 * Hugging Face model provider client for Open Idea federated search.
 */
import type { Resource } from '../../../../src/types/resource';

const HF_MODELS_ENDPOINT = 'https://huggingface.co/api/models';

/**
 * Parse Hugging Face model API response to Resource[]
 */
interface HuggingFaceModel {
  id: string;
  modelId?: string;
  author?: string;
  createdAt?: string;
  license?: string;
  cardData?: { summary?: string };
  description?: string;
  tags?: string[];
  pipeline_tag?: string;
  pipeline_tags?: string[];
  downloads?: number;
  likes?: number;
}

function parseHuggingFaceModels(json: HuggingFaceModel[]): Resource[] {
  if (!Array.isArray(json)) return [];
  return json.map((model) => ({
    id: model.id,
    type: 'model',
    title: model.modelId || model.id,
    authors: model.author ? [model.author] : [],
    year: model.createdAt ? parseInt(model.createdAt.slice(0, 4)) : undefined,
    source: 'huggingface',
    url: `https://huggingface.co/${model.id}`,
    license: model.license || 'NOASSERTION',
    description: model.cardData?.summary || model.description || '',
    tags: model.tags || [],
    meta: {
      pipeline: model.pipeline_tag || model.pipeline_tags?.[0],
      downloads: model.downloads,
      likes: model.likes,
    },
  }));
}

/**
 * Search Hugging Face for models matching the query.
 * @param q Query string
 * @returns Promise of Resource[]
 */
export async function searchHuggingFaceModels(q: string, count: number = 30): Promise<Resource[]> {
  const url = `${HF_MODELS_ENDPOINT}?search=${encodeURIComponent(q)}&limit=${count}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HuggingFace error: ${res.status}`);
    const json = await res.json();
    return parseHuggingFaceModels(json);
  } catch (error) {
    // Fail gracefully - no need to handle the error
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
