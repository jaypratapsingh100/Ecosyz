/* SPDX-License-Identifier: MIT */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../app/lib/graph/neo4j-client';

export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '100', 10)));
  const typeFilter = searchParams.get('type'); // e.g., TECH, ORG, PERSON

  const session = getSession();
  try {
    const where = typeFilter ? `WHERE type(e) = $etype` : '';
    const res = await session.run(
      `MATCH (n:Resource)-[r:MENTIONS]->(e)
       ${where}
       RETURN DISTINCT n, r, e
       LIMIT $limit`,
      { limit, etype: typeFilter }
    );

    const nodesMap = new Map<string, any>();
    const edges: any[] = [];

    for (const record of res.records) {
      const n: any = record.get('n');
      const e: any = record.get('e');
      const r: any = record.get('r');
      const rid = String(n.properties.id);
      const eid = `${String(e.labels[0])}:${String(e.properties.value)}`;

      if (!nodesMap.has(rid)) {
        nodesMap.set(rid, { id: rid, label: n.properties.title || 'Resource', group: 'Resource', data: { source: n.properties.source || 'unknown' } });
      }
      if (!nodesMap.has(eid)) {
        nodesMap.set(eid, { id: eid, label: e.properties.value, group: String(e.labels[0] || 'Entity') });
      }
      edges.push({ id: `${rid}->${eid}`, source: rid, target: eid, label: r.properties?.type || 'MENTIONS', score: r.properties?.score ?? 0 });
    }

    return NextResponse.json({ nodes: Array.from(nodesMap.values()), edges });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Query failed' }, { status: 500 });
  } finally {
    await session.close();
  }
}


