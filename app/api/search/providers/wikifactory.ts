/* SPDX-License-Identifier: MIT
 * Wikifactory open design provider client for Open Idea federated search.
 * This is a stub using demo data. Replace with real API integration as needed.
 */
import type { Resource } from '../../../../src/types/resource';

const DEMO_WIKIFACTORY: Resource[] = [
  {
    id: 'wikifactory-001',
    type: 'hardware',
    title: 'Open Source Drone Frame',
    authors: ['Wikifactory Community'],
    year: 2022,
    source: 'custom',
    url: 'https://wikifactory.com/@community/open-drone-frame',
    license: 'CERN-OHL-P-2.0',
    description: 'A fully open-source drone frame design.',
    tags: ['drone', 'wikifactory', 'open design'],
    meta: { cert_id: 'WF-2022-001' },
  },
];

export async function searchWikifactoryDesigns(q: string, count: number = 30): Promise<Resource[]> {
  return DEMO_WIKIFACTORY.filter(hw =>
    hw.title.toLowerCase().includes(q.toLowerCase()) ||
    (hw.description || '').toLowerCase().includes(q.toLowerCase())
  );
}
