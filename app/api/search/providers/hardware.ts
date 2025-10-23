/* SPDX-License-Identifier: MIT
 * Example hardware provider client for Open Idea federated search.
 * This is a stub. Replace with a real hardware registry API as needed.
 */
import type { Resource } from '../../../../src/types/resource';

// Example: Static demo data for hardware
const DEMO_HARDWARE: Resource[] = [
  {
    id: 'hw-001',
    type: 'hardware',
    title: 'Open Compute Project Server',
    authors: ['OCP Foundation'],
    year: 2021,
    source: 'custom',
    url: 'https://www.opencompute.org/wiki/Server/Specs',
    license: 'CC-BY-4.0',
    description: 'Open-source server hardware spec from OCP.',
    tags: ['server', 'open hardware'],
    meta: { cert_id: 'OCP-2021-001' },
  },
];

export async function searchHardware(q: string, count: number = 30): Promise<Resource[]> {
  // Simple keyword match for demo
  return DEMO_HARDWARE.filter(hw =>
    hw.title.toLowerCase().includes(q.toLowerCase()) ||
    (hw.description || '').toLowerCase().includes(q.toLowerCase())
  );
}
