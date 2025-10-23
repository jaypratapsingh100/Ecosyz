/* SPDX-License-Identifier: MIT
 * OSHWA (Open Source Hardware Association) provider client for Open Idea federated search.
 * This is a stub using demo data. Replace with real API integration as needed.
 */
import type { Resource } from '../../../../src/types/resource';

const DEMO_OSHWA: Resource[] = [
  {
    id: 'oshwa-2021-001',
    type: 'hardware',
    title: 'OSHWA Certified Open Source 3D Printer',
    authors: ['OSHWA'],
    year: 2021,
    source: 'custom',
    url: 'https://certification.oshwa.org/us000001.html',
    license: 'CERN-OHL-S-2.0',
    description: 'Certified open source 3D printer hardware.',
    tags: ['3d printer', 'oshwa', 'open hardware'],
    meta: { cert_id: 'US000001' },
  },
];

export async function searchOshwaHardware(q: string, count: number = 30): Promise<Resource[]> {
  return DEMO_OSHWA.filter(hw =>
    hw.title.toLowerCase().includes(q.toLowerCase()) ||
    (hw.description || '').toLowerCase().includes(q.toLowerCase())
  );
}
