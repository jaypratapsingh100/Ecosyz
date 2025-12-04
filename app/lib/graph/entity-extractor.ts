/* SPDX-License-Identifier: MIT */

export type EntityType = 'TECH' | 'ORG' | 'PERSON' | 'TOPIC';
export interface ExtractedEntity {
  type: EntityType;
  value: string;
  score: number;
}

const TECH_KEYWORDS = [
  'ai', 'ml', 'deep learning', 'transformer', 'bert', 'gpt',
  'climate', 'solar', 'wind', 'battery', 'hardware', 'open source',
  'microcontroller', 'arduino', 'raspberry pi', 'sensor', 'robotics',
  'dataset', 'benchmark', 'model', 'inference', 'finetune', 'rag'
];

const ORG_SUFFIXES = ['lab', 'labs', 'university', 'institute', 'inc', 'corp', 'foundation', 'org'];

export function extractEntities(text: string, max = 20): ExtractedEntity[] {
  if (!text || typeof text !== 'string') return [];
  const input = text.toLowerCase();
  const out: ExtractedEntity[] = [];

  // Technologies / topics by keyword hits
  for (const kw of TECH_KEYWORDS) {
    if (input.includes(kw)) {
      out.push({ type: kw === 'ai' || kw === 'ml' ? 'TOPIC' : 'TECH', value: kw, score: 0.7 });
    }
  }

  // Organizations by suffix heuristics (capitalized tokens + suffix)
  const orgMatches = text.match(/[A-Z][A-Za-z0-9&\-\. ]+(?:\s(?:lab|labs|university|institute|Inc|Corp|Foundation|Org))\b/g);
  if (orgMatches) {
    for (const m of orgMatches) {
      out.push({ type: 'ORG', value: m.trim(), score: 0.6 });
    }
  }

  // Persons: simple First Last with capitals (very heuristic)
  const personMatches = text.match(/\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/g);
  if (personMatches) {
    for (const m of personMatches.slice(0, 5)) {
      out.push({ type: 'PERSON', value: m.trim(), score: 0.5 });
    }
  }

  // Deduplicate by value
  const seen = new Set<string>();
  const deduped: ExtractedEntity[] = [];
  for (const e of out) {
    const key = `${e.type}:${e.value.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(e);
    }
  }

  return deduped.slice(0, max);
}


