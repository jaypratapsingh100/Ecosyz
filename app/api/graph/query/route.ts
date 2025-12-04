/* SPDX-License-Identifier: MIT */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../app/lib/graph/neo4j-client';
import { rateLimit, getClientKey } from '../../../../app/lib/utils/rate-limit';

export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!rateLimit(getClientKey(req), 30)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  try {
    const body = await req.json();
    const cypher: string = body?.cypher || '';
    const params: Record<string, unknown> = body?.params || {};

    if (typeof cypher !== 'string' || cypher.trim().length === 0) {
      return NextResponse.json({ error: 'Missing cypher' }, { status: 400 });
    }

    const session = getSession();
    try {
      const res = await session.run(cypher, params);
      const records = res.records.map(r => r.toObject());
      return NextResponse.json({ records });
    } finally {
      await session.close();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Query failed' }, { status: 400 });
  }
}
