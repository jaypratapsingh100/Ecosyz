/* SPDX-License-Identifier: MIT
 * Vitest tests for conservative deduplication pipeline.
 */
import { describe, it, expect } from 'vitest';
import { dedupeConservative } from '../app/api/search/lib/dedupe';
import fs from 'fs';

function loadFixture(name: string) {
  return JSON.parse(fs.readFileSync(__dirname + '/fixtures/' + name, 'utf8'));
}

describe('dedupeConservative', () => {
  it('DOI merge: OpenAlex + arXiv same DOI → 1 item, reason "doi"', () => {
    const input = loadFixture('doi-merge.json');
    const { items, merged, decisions } = dedupeConservative(input);
    expect(items.length).toBe(1);
    expect(merged).toBe(1);
    expect(decisions[0].reason).toBe('doi');
  });

  it('SWHID/URL merge: SWH + GitLab same URL → 1 item', () => {
    const input = loadFixture('swh-url-merge.json');
    const { items, merged, decisions } = dedupeConservative(input);
    expect(items.length).toBe(1);
    expect(merged).toBe(1);
    expect(decisions.length).toBeGreaterThan(0);
    // May merge by url, swh, or heuristic (tya) depending on key order
    expect(['url', 'swh', 'tya'].includes(decisions[0].reason)).toBe(true);
  });

  it('Zenodo + CKAN same DOI → 1 item, license preserved if present in either', () => {
    const input = loadFixture('zenodo-ckan-license.json');
    const { items } = dedupeConservative(input);
    expect(items.length).toBe(1);
    expect(items[0].license).toBe('CC-BY-4.0');
  });

  it('Heuristic T+Y+A all pass → merged with reason "tya"', () => {
    const input = loadFixture('title-year-authors.json');
    const { items, merged, decisions } = dedupeConservative(input);
    expect(items.length).toBe(1);
    expect(merged).toBe(1);
    expect(decisions[0].reason).toBe('tya');
  });
});
